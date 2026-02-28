"""
Unified analysis endpoints — combines transcription, body language analysis,
and rubric evaluation into a single pipeline.

  POST /api/full-analysis          — file upload
  POST /api/full-analysis/youtube  — YouTube URL

Both endpoints accept a `use_placeholder` flag (default True).  When True,
the pre-analyzed "Mark John" data is returned immediately.  When False, the
full Gemini pipeline runs: transcription → body language → rubric evaluation.
"""
import asyncio
import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.config import get_settings
from app.schemas.response import (
    BodyLanguageSegmentReport,
    BodyLanguageSummary,
    FullAnalysisRequest,
    FullAnalysisResponse,
    SegmentResult,
    TranscriptResult,
    TranscriptSegment,
)
from app.services.audio_utils import extract_audio
from app.services.gemini_body_language import (
    analyze_body_language,
    download_youtube_video,
    get_video_duration,
    upload_video_to_gemini,
)
from app.services.gemini_evaluation import evaluate_with_gemini
from app.services.placeholder_data import (
    PLACEHOLDER_RUBRIC_EVALUATION,
    PLACEHOLDER_VIDEO_SOURCE,
    load_placeholder_body_language,
)
from app.services.session_stats import stats as session_stats
from app.services.elevenlabs_transcribe import ElevenLabsTranscribeService
from app.services.youtube_service import YouTubeDownloader, is_valid_youtube_url

logger = logging.getLogger(__name__)

router = APIRouter(tags=["full-analysis"])

ALLOWED_EXTENSIONS = {
    ".mp4", ".mov", ".mkv", ".avi",
    ".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac",
}

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}


def _build_transcript_result(ws_result, job_id: str) -> TranscriptResult:
    segments = [
        TranscriptSegment(start=s.start, end=s.end, text=s.text)
        for s in ws_result.segments
    ]
    return TranscriptResult(
        job_id=job_id,
        language=ws_result.language,
        duration=round(ws_result.duration, 2),
        full_text=ws_result.full_text,
        segments=segments,
        srt_content=ws_result.srt_content,
    )


def _build_body_language_summary(
    results: list[dict], model: str, output_dir: str,
) -> BodyLanguageSummary:
    combined_path = Path(output_dir) / "00_full_body_language_report.md"
    combined_report = (
        combined_path.read_text(encoding="utf-8")
        if combined_path.exists()
        else ""
    )
    segments = []
    for r in results:
        seg_path = Path(output_dir) / r["file"]
        markdown = seg_path.read_text(encoding="utf-8") if seg_path.exists() else ""
        segments.append(BodyLanguageSegmentReport(
            segment=r["segment"],
            start=r["start"],
            end=r["end"],
            markdown=markdown,
        ))
    return BodyLanguageSummary(
        model=model,
        total_segments=len(segments),
        segments=segments,
        combined_report=combined_report,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/full-analysis  — file upload
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/api/full-analysis", response_model=FullAnalysisResponse)
async def full_analysis_file(
    file: UploadFile,
    use_placeholder: bool = True,
    language: str = "auto",
    model: str = "gemini-3.1-pro-preview",
    segment_duration: int = 180,
) -> FullAnalysisResponse:
    """Upload a video/audio file and get the full analysis pipeline.

    When use_placeholder=True (default), returns pre-analyzed Mark John data.
    When use_placeholder=False, runs the live pipeline: transcription →
    body language (Gemini) → rubric evaluation (Gemini).
    """
    settings = get_settings()
    job_id = uuid.uuid4().hex

    if use_placeholder:
        body_language = load_placeholder_body_language()
        session_stats.full_analyses += 1
        return FullAnalysisResponse(
            job_id=job_id,
            video_source=file.filename or "upload",
            is_placeholder=True,
            transcript=None,
            body_language=body_language,
            rubric_evaluation=PLACEHOLDER_RUBRIC_EVALUATION,
        )

    # ── Live analysis pipeline ────────────────────────────────────────────
    api_key = settings.gemini_api_key
    use_gemini = bool(api_key)

    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. "
                   f"Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    tmp_dir = Path(settings.temp_dir) / f"fa_{job_id}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    output_dir = str(tmp_dir / "results")

    raw_path = str(tmp_dir / f"input{ext}")
    wav_path = str(tmp_dir / "audio.wav")

    try:
        contents = await file.read()
        if len(contents) > settings.max_upload_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit.",
            )
        Path(raw_path).write_bytes(contents)
        logger.info("[%s] Saved upload: %s (%.1f MB)", job_id, filename, len(contents) / 1e6)

        loop = asyncio.get_running_loop()

        # Step 1: Extract audio + transcribe
        await loop.run_in_executor(None, extract_audio, raw_path, wav_path)
        logger.info("[%s] Audio extracted", job_id)

        if not settings.elevenlabs_api_key:
            raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured.")
        svc = ElevenLabsTranscribeService(settings.elevenlabs_api_key, settings.elevenlabs_stt_model)
        ws_result = await loop.run_in_executor(None, svc.transcribe, wav_path, language)
        transcript_result = _build_transcript_result(ws_result, job_id)
        logger.info("[%s] Transcription done: %d segments", job_id, len(ws_result.segments))

        # Step 2: Body language analysis (only for video files)
        body_language: BodyLanguageSummary | None = None
        if ext in VIDEO_EXTENSIONS:
            if use_gemini:
                file_uri = await loop.run_in_executor(
                    None, upload_video_to_gemini, api_key, raw_path,
                )
                duration = await loop.run_in_executor(None, get_video_duration, raw_path)
                bl_results = await loop.run_in_executor(
                    None,
                    analyze_body_language,
                    api_key, model, file_uri, duration, output_dir, segment_duration,
                )
                body_language = _build_body_language_summary(bl_results, model, output_dir)
                logger.info("[%s] Body language analysis done: %d segments", job_id, len(bl_results))
            else:
                body_language = load_placeholder_body_language()
                logger.info("[%s] Body language: using fallback from body_language_analysis/", job_id)

        # Step 3: Rubric evaluation (Gemini or fallback)
        bl_report = body_language.combined_report if body_language else None
        if use_gemini:
            rubric_evaluation = await loop.run_in_executor(
                None,
                evaluate_with_gemini,
                api_key, model, ws_result.full_text, bl_report,
            )
            logger.info("[%s] Rubric evaluation done", job_id)
        else:
            rubric_evaluation = PLACEHOLDER_RUBRIC_EVALUATION
            logger.info("[%s] Rubric: using fallback from body_language_analysis/", job_id)
        session_stats.full_analyses += 1
        return FullAnalysisResponse(
            job_id=job_id,
            video_source=filename,
            is_placeholder=False,
            transcript=transcript_result,
            body_language=body_language,
            rubric_evaluation=rubric_evaluation,
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        logger.error("[%s] Runtime error: %s", job_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/full-analysis/youtube  — YouTube URL
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/api/full-analysis/youtube", response_model=FullAnalysisResponse)
async def full_analysis_youtube(body: FullAnalysisRequest) -> FullAnalysisResponse:
    """Analyze a YouTube video through the full pipeline.

    When use_placeholder=True (default), returns pre-analyzed Mark John data.
    When use_placeholder=False, runs the live pipeline.
    """
    settings = get_settings()
    job_id = uuid.uuid4().hex

    if body.use_placeholder:
        body_language = load_placeholder_body_language()
        session_stats.full_analyses += 1
        return FullAnalysisResponse(
            job_id=job_id,
            video_source=body.url,
            is_placeholder=True,
            transcript=None,
            body_language=body_language,
            rubric_evaluation=PLACEHOLDER_RUBRIC_EVALUATION,
        )

    # ── Live analysis pipeline ────────────────────────────────────────────
    api_key = body.gemini_api_key or settings.gemini_api_key
    use_gemini = bool(api_key)

    if not is_valid_youtube_url(body.url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")

    model = body.model or settings.gemini_model
    tmp_dir = Path(settings.temp_dir) / f"fayt_{job_id}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    output_dir = str(tmp_dir / "results")

    try:
        loop = asyncio.get_running_loop()

        # Download video for body language analysis
        video_path = await loop.run_in_executor(
            None, download_youtube_video, body.url, str(tmp_dir),
        )
        logger.info("[%s] YouTube video downloaded: %s", job_id, video_path)

        # Download audio for transcription
        downloader = YouTubeDownloader(settings)
        wav_path = await loop.run_in_executor(
            None, downloader.download_audio, body.url, job_id,
        )
        logger.info("[%s] YouTube audio ready: %s", job_id, wav_path)

        # Step 1: Transcribe
        if not settings.elevenlabs_api_key:
            raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured.")
        svc = ElevenLabsTranscribeService(settings.elevenlabs_api_key, settings.elevenlabs_stt_model)
        ws_result = await loop.run_in_executor(
            None, svc.transcribe, wav_path, body.language,
        )
        transcript_result = _build_transcript_result(ws_result, job_id)
        logger.info("[%s] Transcription done: %d segments", job_id, len(ws_result.segments))

        # Step 2: Body language analysis
        if use_gemini:
            file_uri = await loop.run_in_executor(
                None, upload_video_to_gemini, api_key, video_path,
            )
            duration = await loop.run_in_executor(None, get_video_duration, video_path)
            bl_results = await loop.run_in_executor(
                None,
                analyze_body_language,
                api_key, model, file_uri, duration, output_dir, body.segment_duration,
            )
            body_language = _build_body_language_summary(bl_results, model, output_dir)
            logger.info("[%s] Body language analysis done: %d segments", job_id, len(bl_results))
        else:
            body_language = load_placeholder_body_language()
            logger.info("[%s] Body language: using fallback from body_language_analysis/", job_id)

        # Step 3: Rubric evaluation (Gemini or fallback)
        if use_gemini:
            rubric_evaluation = await loop.run_in_executor(
                None,
                evaluate_with_gemini,
                api_key, model, ws_result.full_text, body_language.combined_report,
            )
            logger.info("[%s] Rubric evaluation done", job_id)
        else:
            rubric_evaluation = PLACEHOLDER_RUBRIC_EVALUATION
            logger.info("[%s] Rubric: using fallback from body_language_analysis/", job_id)
        session_stats.full_analyses += 1
        return FullAnalysisResponse(
            job_id=job_id,
            video_source=body.url,
            is_placeholder=False,
            transcript=transcript_result,
            body_language=body_language,
            rubric_evaluation=rubric_evaluation,
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        logger.error("[%s] Runtime error: %s", job_id, exc)
        raise HTTPException(status_code=502, detail=str(exc))
    finally:
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass
        audio_dir = Path(settings.temp_dir) / f"yt_{job_id}"
        if audio_dir.exists():
            try:
                shutil.rmtree(audio_dir, ignore_errors=True)
            except Exception:
                pass
