"""Amazon Transcribe Streaming integration.

Streams a 16 kHz mono PCM WAV file directly to Amazon Transcribe using the
``amazon-transcribe`` SDK.  No S3 bucket is needed — audio bytes are sent
over a WebSocket-based stream and transcript segments (with timestamps) are
returned in near-real-time.

Returns a ``TranscribeResult`` dataclass with the same interface expected
by ``_build_response()`` in ``app/routes/analyze.py``.

Clock-skew workaround
---------------------
AWS SigV4 validation rejects requests if the client clock is more than 5
minutes off.  This module patches ``datetime.datetime.utcnow`` **only for the
duration of a transcription call** so that signatures are computed with the
true UTC time obtained from the HTTP ``Date`` response header of a cheap
HEAD request to ``transcribestreaming.<region>.amazonaws.com``.
"""

from __future__ import annotations

import asyncio
import datetime
import logging
import os
import socket
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from amazon_transcribe.model import TranscriptEvent

from app.config import Settings

logger = logging.getLogger(__name__)

_CHUNK_SIZE = 16 * 1024  # 16 KB per audio event


# ─────────────────────────────────────────────────────────────────────────────
#  Data models
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Segment:
    """A single timed transcript segment."""
    start: float
    end: float
    text: str


@dataclass
class TranscribeResult:
    """Full transcription result returned by :class:`TranscribeService`."""
    language: str
    duration: float
    full_text: str
    segments: List[Segment] = field(default_factory=list)
    srt_content: str = ""


# ─────────────────────────────────────────────────────────────────────────────
#  SRT helpers
# ─────────────────────────────────────────────────────────────────────────────

def _seconds_to_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _segments_to_srt(segments: List[Segment]) -> str:
    lines: list[str] = []
    for i, seg in enumerate(segments, start=1):
        lines.append(str(i))
        lines.append(f"{_seconds_to_srt_time(seg.start)} --> {_seconds_to_srt_time(seg.end)}")
        lines.append(seg.text)
        lines.append("")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
#  Clock-skew detection and correction
# ─────────────────────────────────────────────────────────────────────────────

def _get_aws_utc_time(region: str = "us-east-1") -> datetime.datetime | None:
    """Return AWS server UTC time via HTTP Date header (no auth required).

    Uses raw http.client so we capture the Date header even on 404/403 responses.
    Falls back to aws.amazon.com if the regional endpoint does not respond.
    """
    import http.client

    def _parse_date(date_str: str) -> datetime.datetime | None:
        try:
            return datetime.datetime.strptime(
                date_str, "%a, %d %b %Y %H:%M:%S %Z"
            ).replace(tzinfo=datetime.timezone.utc)
        except ValueError:
            return None

    hosts = [
        f"transcribestreaming.{region}.amazonaws.com",
        "aws.amazon.com",
        "s3.amazonaws.com",
    ]
    for host in hosts:
        try:
            conn = http.client.HTTPSConnection(host, timeout=5)
            conn.request("HEAD", "/")
            resp = conn.getresponse()
            date_str = resp.getheader("Date") or ""
            conn.close()
            if date_str:
                parsed = _parse_date(date_str)
                if parsed:
                    return parsed
        except Exception as exc:
            logger.debug("Could not fetch server time from %s: %s", host, exc)

    logger.warning("Could not determine AWS server time from any host")
    return None


def _measure_clock_offset(region: str = "us-east-1") -> float:
    """Return seconds by which local UTC clock lags behind AWS (positive = behind)."""
    aws_time = _get_aws_utc_time(region)
    if aws_time is None:
        return 0.0
    local_utc = datetime.datetime.now(datetime.timezone.utc)
    offset = (aws_time - local_utc).total_seconds()
    if abs(offset) > 1:
        logger.warning(
            "Clock offset detected: local is %.1fs %s AWS",
            abs(offset), "behind" if offset > 0 else "ahead of",
        )
    return offset


# ─────────────────────────────────────────────────────────────────────────────
#  Stream handler
# ─────────────────────────────────────────────────────────────────────────────

class _SegmentCollector(TranscriptResultStreamHandler):
    """Collects final (non-partial) transcript results with timestamps."""

    def __init__(self, output_stream) -> None:
        super().__init__(output_stream)
        self.segments: List[Segment] = []

    async def handle_transcript_event(self, transcript_event: TranscriptEvent) -> None:
        results = transcript_event.transcript.results
        for result in results:
            if result.is_partial:
                continue
            for alt in result.alternatives:
                if not alt.transcript.strip():
                    continue
                start = result.start_time if result.start_time is not None else 0.0
                end = result.end_time if result.end_time is not None else 0.0
                self.segments.append(Segment(
                    start=round(start, 3),
                    end=round(end, 3),
                    text=alt.transcript.strip(),
                ))


# ─────────────────────────────────────────────────────────────────────────────
#  Language mapping
# ─────────────────────────────────────────────────────────────────────────────

_LANG_MAP: dict[str, str] = {
    "en": "en-US",
    "zh": "zh-CN",
    "ja": "ja-JP",
    "ko": "ko-KR",
    "es": "es-ES",
    "fr": "fr-FR",
    "de": "de-DE",
    "pt": "pt-BR",
    "ar": "ar-SA",
    "hi": "hi-IN",
    "it": "it-IT",
    "nl": "nl-NL",
    "ru": "ru-RU",
    "tr": "tr-TR",
    "pl": "pl-PL",
    "sv": "sv-SE",
    "da": "da-DK",
    "fi": "fi-FI",
    "nb": "nb-NO",
}


def _resolve_language(language: str, fallback: str) -> str:
    if not language or language.lower() in ("auto", ""):
        return fallback
    if "-" in language:
        return language
    return _LANG_MAP.get(language.lower(), fallback)


def _wav_duration(path: str) -> float:
    try:
        with wave.open(path, "rb") as wf:
            return wf.getnframes() / float(wf.getframerate())
    except Exception:
        return 0.0


# ─────────────────────────────────────────────────────────────────────────────
#  Public service class
# ─────────────────────────────────────────────────────────────────────────────

class TranscribeService:
    """Thin wrapper around the Amazon Transcribe Streaming SDK."""

    def __init__(self, settings: Settings) -> None:
        self._region = settings.aws_region or "us-east-1"
        self._default_language = getattr(settings, "transcribe_language_code", "en-US")

        if settings.aws_access_key_id and settings.aws_secret_access_key:
            os.environ["AWS_ACCESS_KEY_ID"] = settings.aws_access_key_id
            os.environ["AWS_SECRET_ACCESS_KEY"] = settings.aws_secret_access_key
        if self._region:
            os.environ["AWS_DEFAULT_REGION"] = self._region

    async def transcribe(self, audio_path: str, language: str = "auto") -> TranscribeResult:
        """Stream *audio_path* (16 kHz mono WAV) to Amazon Transcribe.

        Automatically detects and compensates for local clock skew so that
        AWS SigV4 signatures remain valid even if the Mac's system clock is
        drifted.
        """
        lang_code = _resolve_language(language, self._default_language)
        duration = _wav_duration(audio_path)

        logger.info(
            "Starting Transcribe stream: path=%s, lang=%s, duration=%.1fs",
            audio_path, lang_code, duration,
        )

        # ── Measure and compensate for clock skew ─────────────────────────
        offset = _measure_clock_offset(self._region)
        original_utcnow = datetime.datetime.utcnow

        if abs(offset) >= 10:
            # Patch datetime.utcnow so botocore/botocore-based SDK uses correct time
            logger.info("Applying clock offset correction: +%.1fs", offset)

            def _patched_utcnow():  # type: ignore[return]
                return original_utcnow() + datetime.timedelta(seconds=offset)

            datetime.datetime.utcnow = _patched_utcnow  # type: ignore[method-assign]
        # ──────────────────────────────────────────────────────────────────

        try:
            client = TranscribeStreamingClient(region=self._region)

            stream = await client.start_stream_transcription(
                language_code=lang_code,
                media_sample_rate_hz=16000,
                media_encoding="pcm",
            )

            async def _send_audio() -> None:
                audio_bytes = Path(audio_path).read_bytes()
                raw_pcm = audio_bytes[44:]  # skip standard 44-byte WAV header

                for offset_bytes in range(0, len(raw_pcm), _CHUNK_SIZE):
                    chunk = raw_pcm[offset_bytes: offset_bytes + _CHUNK_SIZE]
                    await stream.input_stream.send_audio_event(audio_chunk=chunk)

                await stream.input_stream.end_stream()

            collector = _SegmentCollector(stream.output_stream)
            await asyncio.gather(_send_audio(), collector.handle_events())

        finally:
            # Always restore original utcnow
            if abs(offset) >= 10:
                datetime.datetime.utcnow = original_utcnow  # type: ignore[method-assign]

        segments = collector.segments
        full_text = " ".join(s.text for s in segments).strip()
        srt_content = _segments_to_srt(segments)

        logger.info(
            "Transcription complete: lang=%s, %d segments, %d chars",
            lang_code, len(segments), len(full_text),
        )

        return TranscribeResult(
            language=lang_code,
            duration=round(duration, 2),
            full_text=full_text,
            segments=segments,
            srt_content=srt_content,
        )

