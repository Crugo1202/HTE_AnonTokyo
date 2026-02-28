"""
OpenAI Whisper API wrapper with automatic audio chunking.

WHY WE CHUNK
────────────
Whisper API hard-limits each request to 25 MB.
A 60-min mono 16kHz WAV is ~115 MB — way over the limit.
We split the WAV into ≤23 MB chunks, transcribe each independently,
then stitch text + timestamps back together.

SUPPORTED DURATION
──────────────────
Unlimited in theory — each 23 MB chunk covers ≈12 minutes of audio.
A 2-hour video → 10 chunks → 10 sequential Whisper calls.
"""
from __future__ import annotations

import logging
import math
import os
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING

from openai import OpenAI

if TYPE_CHECKING:
    from app.config import Settings

logger = logging.getLogger(__name__)

# Hard limit from Whisper API (bytes).  We stay a bit under it.
_WHISPER_LIMIT = 25 * 1024 * 1024
_SAFE_CHUNK_BYTES = 23 * 1024 * 1024  # 23 MB ≈ 12 min of 16kHz mono WAV


@dataclass
class Segment:
    start: float
    end: float
    text: str


@dataclass
class TranscriptResult:
    language: str
    duration: float
    full_text: str
    segments: list[Segment] = field(default_factory=list)
    srt_content: str = ""


# ─────────────────────────── helpers ────────────────────────────────────────

def _wav_duration(path: str) -> float:
    """Return WAV duration in seconds without loading the whole file."""
    with wave.open(path, "rb") as wf:
        return wf.getnframes() / wf.getframerate()


def _split_wav(wav_path: str, chunk_bytes: int, tmp_dir: str) -> list[tuple[str, float]]:
    """Split a WAV file into chunks of ≤ chunk_bytes.

    Returns list of (chunk_path, chunk_start_offset_seconds).
    If the file fits in one chunk, returns a single-element list.
    """
    size = Path(wav_path).stat().st_size
    if size <= chunk_bytes:
        return [(wav_path, 0.0)]

    with wave.open(wav_path, "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_data = wf.readframes(n_frames)

    bytes_per_frame = n_channels * sampwidth
    frames_per_chunk = chunk_bytes // bytes_per_frame
    n_chunks = math.ceil(n_frames / frames_per_chunk)

    chunks: list[tuple[str, float]] = []
    for i in range(n_chunks):
        start_frame = i * frames_per_chunk
        end_frame = min(start_frame + frames_per_chunk, n_frames)
        chunk_data = raw_data[start_frame * bytes_per_frame: end_frame * bytes_per_frame]
        start_sec = start_frame / framerate

        chunk_path = os.path.join(tmp_dir, f"chunk_{i:04d}.wav")
        with wave.open(chunk_path, "wb") as out:
            out.setnchannels(n_channels)
            out.setsampwidth(sampwidth)
            out.setframerate(framerate)
            out.writeframes(chunk_data)

        chunks.append((chunk_path, start_sec))
        logger.debug("Chunk %d: %.1f s – %.1f s → %s", i,
                     start_sec, end_frame / framerate, chunk_path)

    return chunks


def _to_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _build_srt(segments: list[Segment]) -> str:
    lines: list[str] = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{_to_srt_time(seg.start)} --> {_to_srt_time(seg.end)}")
        lines.append(seg.text.strip())
        lines.append("")
    return "\n".join(lines)


# ─────────────────────────── main service ───────────────────────────────────

class WhisperService:
    """Transcribes audio files using the OpenAI Whisper API.

    Automatically splits files that exceed the 25 MB per-request limit.
    Works with any duration of audio.
    """

    def __init__(self, settings: "Settings") -> None:
        if not settings.openai_api_key:
            raise ValueError(
                "OPENAI_API_KEY is not set in .env — Whisper transcription requires it."
            )
        self._client = OpenAI(api_key=settings.openai_api_key)
        self._model = settings.whisper_model
        self._chunk_bytes = settings.whisper_chunk_bytes

    def transcribe(self, wav_path: str, language: str = "auto") -> TranscriptResult:
        """Transcribe a WAV file (any length) and return structured results."""
        tmp_dir = str(Path(wav_path).parent)
        duration = _wav_duration(wav_path)
        logger.info("Transcribing %.1f-second audio: %s", duration, wav_path)

        chunks = _split_wav(wav_path, self._chunk_bytes, tmp_dir)
        logger.info("Split into %d chunk(s)", len(chunks))

        all_segments: list[Segment] = []
        detected_language = "unknown"

        lang_kwarg: dict = {} if language == "auto" else {"language": language}

        for chunk_path, offset_sec in chunks:
            chunk_segs, lang = self._transcribe_chunk(chunk_path, offset_sec, lang_kwarg)
            all_segments.extend(chunk_segs)
            if lang:
                detected_language = lang
            # Clean up chunk (unless it's the original file)
            if chunk_path != wav_path:
                try:
                    os.remove(chunk_path)
                except OSError:
                    pass

        full_text = " ".join(s.text.strip() for s in all_segments)
        srt = _build_srt(all_segments)

        return TranscriptResult(
            language=detected_language,
            duration=duration,
            full_text=full_text,
            segments=all_segments,
            srt_content=srt,
        )

    def _transcribe_chunk(
        self,
        chunk_path: str,
        offset_sec: float,
        lang_kwarg: dict,
    ) -> tuple[list[Segment], str]:
        with open(chunk_path, "rb") as audio_file:
            response = self._client.audio.transcriptions.create(
                model=self._model,
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
                **lang_kwarg,
            )

        detected_language: str = getattr(response, "language", "unknown") or "unknown"
        raw_segments = getattr(response, "segments", None) or []

        segments: list[Segment] = []
        for seg in raw_segments:
            segments.append(Segment(
                start=round(seg.start + offset_sec, 3),
                end=round(seg.end + offset_sec, 3),
                text=seg.text,
            ))

        # Fallback: if no segments returned, make one segment for the whole chunk
        if not segments:
            text: str = getattr(response, "text", "") or ""
            if text.strip():
                chunk_dur = _wav_duration(chunk_path) if Path(chunk_path).exists() else 0.0
                segments.append(Segment(
                    start=round(offset_sec, 3),
                    end=round(offset_sec + chunk_dur, 3),
                    text=text,
                ))

        return segments, detected_language
