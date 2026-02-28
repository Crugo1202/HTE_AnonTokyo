"""
Gemini-powered body language analysis service.

Uploads a video via the Gemini File API, splits it into segments,
and produces a detailed body language / nonverbal-communication report
for each segment.  Supports both local file uploads and YouTube URLs.
"""
from __future__ import annotations

import json
import logging
import subprocess
import time
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.config import Settings

logger = logging.getLogger(__name__)

SEGMENT_DURATION = 180  # 3 minutes per segment

BODY_LANGUAGE_PROMPT = """You are an expert in nonverbal communication and teaching pedagogy. \
Analyze ONLY the segment from {start_ts} to {end_ts} of this teaching video.

Focus EXCLUSIVELY on the teacher's body language, physical movements, and nonverbal communication \
during this segment. Be extremely detailed and precise.

For each notable moment, provide:

### Timestamp [MM:SS] — Brief Label

**Posture:** Describe the teacher's overall body posture (standing, leaning, sitting, shifting weight, etc.)

**Hand/Arm Gestures:** Detail specific hand and arm movements (pointing, open palms, counting on fingers, \
illustrative gestures, holding objects, writing, etc.)

**Facial Expressions:** Describe facial expressions (smiling, raised eyebrows, nodding, looking puzzled, \
making eye contact, looking at slides, etc.)

**Movement/Positioning:** Where is the teacher in the room? Moving toward students, standing at the front, \
circulating, approaching a desk, etc.

**Interaction Style:** How does the body language relate to what's being said? Is it reinforcing the verbal \
message, contradicting it, or adding emphasis?

**Pedagogical Significance:** What does this body language communicate to students? (confidence, \
approachability, authority, encouragement, urgency, etc.)

Cover EVERY notable body language moment in this segment. Aim for at least one observation every \
15-30 seconds of video. Do not skip any part of this segment.
"""


def _fmt_ts(seconds: int) -> str:
    m, s = divmod(seconds, 60)
    return f"{m:02d}:{s:02d}"


def _stream_gemini(
    api_key: str,
    model: str,
    file_uri: str,
    prompt: str,
    start_sec: int | None = None,
    end_sec: int | None = None,
    max_time: int = 600,
) -> str:
    """Call Gemini via curl with streaming SSE and return assembled text."""
    file_part: dict = {"file_data": {"mime_type": "video/mp4", "file_uri": file_uri}}
    if start_sec is not None and end_sec is not None:
        file_part["video_metadata"] = {
            "start_offset": f"{start_sec}s",
            "end_offset": f"{end_sec}s",
        }

    payload = {"contents": [{"parts": [file_part, {"text": prompt}]}]}

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"models/{model}:streamGenerateContent?alt=sse"
    )

    payload_file = "/tmp/gemini_bl_payload.json"
    with open(payload_file, "w") as f:
        json.dump(payload, f)

    result = subprocess.run(
        [
            "curl", "-s", "--max-time", str(max_time), url,
            "-H", f"x-goog-api-key: {api_key}",
            "-H", "Content-Type: application/json",
            "-X", "POST", "-d", f"@{payload_file}",
        ],
        capture_output=True,
        text=True,
    )

    if not result.stdout.strip():
        raise RuntimeError(
            f"Empty Gemini response (curl exit: {result.returncode})"
        )

    text_parts: list[str] = []
    for line in result.stdout.split("\n"):
        line = line.strip()
        if not line.startswith("data: "):
            continue
        try:
            chunk = json.loads(line[6:])
        except json.JSONDecodeError:
            continue
        if "error" in chunk:
            raise RuntimeError(f"Gemini API error: {chunk['error']['message']}")
        for cand in chunk.get("candidates", []):
            for part in cand.get("content", {}).get("parts", []):
                if "text" in part:
                    text_parts.append(part["text"])

    if not text_parts:
        raise RuntimeError(f"No text in Gemini response: {result.stdout[:300]}")

    return "".join(text_parts)


def upload_video_to_gemini(api_key: str, video_path: str) -> str:
    """Upload a local video file via the Gemini File API and return the file URI.

    Blocks until the file reaches ACTIVE state.
    """
    from google import genai
    from google.genai.types import HttpOptions

    client = genai.Client(
        api_key=api_key,
        http_options=HttpOptions(timeout=600_000),
    )

    logger.info("Uploading %s to Gemini File API...", video_path)
    video_file = client.files.upload(file=video_path)
    logger.info("Upload complete: %s  state=%s", video_file.uri, video_file.state)

    while video_file.state.name == "PROCESSING":
        logger.info("  Waiting for processing...")
        time.sleep(10)
        video_file = client.files.get(name=video_file.name)

    if video_file.state.name == "FAILED":
        raise RuntimeError("Gemini video processing failed")

    logger.info("Video ready: %s", video_file.uri)
    return video_file.uri


def download_youtube_video(url: str, output_dir: str) -> str:
    """Download a YouTube video at 480p via yt-dlp and return the local path."""
    import yt_dlp

    out_path = str(Path(output_dir) / "video.mp4")

    ydl_opts = {
        "format": "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]",
        "merge_output_format": "mp4",
        "outtmpl": out_path,
        "quiet": True,
        "no_warnings": True,
    }

    logger.info("Downloading YouTube video: %s", url)
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    if not Path(out_path).is_file():
        raise RuntimeError(f"YouTube download completed but file not found: {out_path}")

    logger.info("Downloaded → %s (%.1f MB)", out_path, Path(out_path).stat().st_size / 1e6)
    return out_path


def get_video_duration(video_path: str) -> int:
    """Return video duration in seconds using ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path,
        ],
        capture_output=True,
        text=True,
    )
    try:
        return int(float(result.stdout.strip()))
    except (ValueError, AttributeError):
        return 36 * 60  # fallback


def analyze_body_language(
    api_key: str,
    model: str,
    file_uri: str,
    total_duration: int,
    output_dir: str,
    segment_duration: int = SEGMENT_DURATION,
    max_retries: int = 2,
) -> list[dict]:
    """Run segmented body-language analysis and save results.

    Returns a list of dicts: {segment, start, end, file, chars, error}.
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    segments: list[tuple[int, int, int]] = []
    start = 0
    seg_num = 1
    while start < total_duration:
        end = min(start + segment_duration, total_duration)
        segments.append((seg_num, start, end))
        start = end
        seg_num += 1

    results: list[dict] = []

    for seg_num, start_sec, end_sec in segments:
        start_ts = _fmt_ts(start_sec)
        end_ts = _fmt_ts(end_sec)
        filename = f"segment_{seg_num:02d}_{start_ts.replace(':', '')}_{end_ts.replace(':', '')}.md"
        filepath = out / filename

        logger.info("[%d/%d] Analyzing %s - %s", seg_num, len(segments), start_ts, end_ts)

        prompt = BODY_LANGUAGE_PROMPT.format(start_ts=start_ts, end_ts=end_ts)

        text = None
        error = None
        for attempt in range(1, max_retries + 1):
            try:
                text = _stream_gemini(
                    api_key, model, file_uri, prompt, start_sec, end_sec
                )
                break
            except RuntimeError as exc:
                error = str(exc)
                logger.warning(
                    "  Attempt %d/%d failed: %s", attempt, max_retries, error
                )
                if attempt < max_retries:
                    time.sleep(15)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# Segment {seg_num}: {start_ts} - {end_ts}\n\n")
            if text:
                f.write(text)
            else:
                f.write(f"*Analysis failed: {error}*\n")

        info = {
            "segment": seg_num,
            "start": start_ts,
            "end": end_ts,
            "file": filename,
            "chars": len(text) if text else 0,
            "error": error if not text else None,
        }
        results.append(info)
        logger.info("  → %s (%d chars)", filename, info["chars"])

        time.sleep(3)

    # Combined report
    combined_path = out / "00_full_body_language_report.md"
    with open(combined_path, "w", encoding="utf-8") as f:
        f.write("# Full Body Language Analysis Report\n\n")
        f.write(f"**Model:** {model}\n\n")
        f.write(f"**Segments:** {len(segments)}\n\n---\n\n")
        for seg_num, start_sec, end_sec in segments:
            start_ts = _fmt_ts(start_sec)
            end_ts = _fmt_ts(end_sec)
            filename = f"segment_{seg_num:02d}_{start_ts.replace(':', '')}_{end_ts.replace(':', '')}.md"
            seg_path = out / filename
            if seg_path.exists():
                f.write(seg_path.read_text(encoding="utf-8"))
                f.write("\n\n---\n\n")

    logger.info("Combined report → %s", combined_path)
    return results
