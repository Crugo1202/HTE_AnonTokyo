"""
ElevenLabs Speech-to-Text transcription service.

Uses the ElevenLabs Scribe API (POST /v1/speech-to-text) to transcribe
audio/video files. Supports 90+ languages with automatic detection,
word-level timestamps, and segment output compatible with our API schema.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import requests

if False:
    from app.config import Settings

logger = logging.getLogger(__name__)

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
DEFAULT_MODEL = "scribe_v2"


@dataclass
class Segment:
    start: float
    end: float
    text: str


@dataclass
class TranscribeResult:
    language: str
    duration: float
    full_text: str
    segments: list[Segment] = field(default_factory=list)
    srt_content: str = ""


def _seconds_to_srt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _build_srt(segments: list[Segment]) -> str:
    lines: list[str] = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{_seconds_to_srt(seg.start)} --> {_seconds_to_srt(seg.end)}")
        lines.append(seg.text.strip())
        lines.append("")
    return "\n".join(lines)


def _words_to_segments(words: list[dict]) -> list[Segment]:
    """Group word-level timestamps into segments (merge consecutive words)."""
    if not words:
        return []

    segments: list[Segment] = []
    current_text: list[str] = []
    start_sec = 0.0
    end_sec = 0.0
    gap_threshold = 0.5

    for w in words:
        t = w.get("text", "").strip()
        s = float(w.get("start", 0))
        e = float(w.get("end", 0))

        if not current_text:
            start_sec = s
            end_sec = e
            current_text.append(t)
            continue

        gap = s - end_sec
        if gap > gap_threshold and current_text:
            segments.append(Segment(
                start=round(start_sec, 3),
                end=round(end_sec, 3),
                text=" ".join(current_text),
            ))
            current_text = []
            start_sec = s

        end_sec = e
        current_text.append(t)

    if current_text:
        segments.append(Segment(
            start=round(start_sec, 3),
            end=round(end_sec, 3),
            text=" ".join(current_text),
        ))

    return segments


class ElevenLabsTranscribeService:
    """Transcribes audio using ElevenLabs Scribe API."""

    def __init__(self, api_key: str, model_id: str = DEFAULT_MODEL) -> None:
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY is required for transcription.")
        self._api_key = api_key
        self._model_id = model_id

    def transcribe(self, audio_path: str, language: str = "auto") -> TranscribeResult:
        """Transcribe an audio file and return structured results."""
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        with open(audio_path, "rb") as f:
            files = {"file": (path.name, f, "audio/wav")}
            data: dict = {"model_id": self._model_id}
            if language and language != "auto":
                data["language_code"] = language

            headers = {"xi-api-key": self._api_key}

            resp = requests.post(
                ELEVENLABS_STT_URL,
                headers=headers,
                files=files,
                data=data,
                timeout=600,
            )

        resp.raise_for_status()
        body = resp.json()

        # Handle multichannel response
        if "transcripts" in body:
            chunk = body["transcripts"][0]
        else:
            chunk = body

        text = chunk.get("text", "")
        words = chunk.get("words", [])
        lang = chunk.get("language_code", "unknown") or "unknown"
        if isinstance(lang, str) and len(lang) >= 3:
            lang = lang[:3].lower()

        segments = _words_to_segments(words)
        if not segments and text.strip():
            segments = [Segment(0.0, 0.0, text)]

        duration = 0.0
        if words:
            duration = max(float(w.get("end", 0)) for w in words)

        srt = _build_srt(segments)

        logger.info(
            "ElevenLabs transcription: %d segments, lang=%s, duration=%.1fs",
            len(segments), lang, duration,
        )

        return TranscribeResult(
            language=lang,
            duration=duration,
            full_text=text,
            segments=segments,
            srt_content=srt,
        )
