"""
YouTube audio downloader using yt-dlp.

Downloads only the audio stream (no video) and converts to mono 16kHz WAV
via ffmpeg — the same format expected by WhisperService.
"""
from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import TYPE_CHECKING

import yt_dlp

if TYPE_CHECKING:
    from app.config import Settings

logger = logging.getLogger(__name__)

# Basic YouTube URL patterns we accept
_YT_PATTERNS = [
    re.compile(r"^https?://(www\.)?youtube\.com/watch\?.*v=[\w-]+"),
    re.compile(r"^https?://youtu\.be/[\w-]+"),
    re.compile(r"^https?://(www\.)?youtube\.com/shorts/[\w-]+"),
]


def is_valid_youtube_url(url: str) -> bool:
    return any(p.match(url.strip()) for p in _YT_PATTERNS)


class YouTubeDownloader:
    """Downloads audio from a YouTube URL and saves it as a WAV file."""

    def __init__(self, settings: "Settings") -> None:
        self._tmp_dir = settings.temp_dir

    def download_audio(self, url: str, job_id: str) -> str:
        """Download audio from *url* and return the path to a WAV file.

        The file is placed in a subdirectory of temp_dir named
        ``yt_{job_id}/``.  Callers are responsible for cleanup.
        """
        if not is_valid_youtube_url(url):
            raise ValueError(f"Not a valid YouTube URL: {url}")

        out_dir = Path(self._tmp_dir) / f"yt_{job_id}"
        out_dir.mkdir(parents=True, exist_ok=True)

        # yt-dlp saves to this template; %(ext)s will be replaced by the
        # converted extension (wav after postprocessing).
        outtmpl = str(out_dir / "audio.%(ext)s")
        wav_path = str(out_dir / "audio.wav")

        ydl_opts: dict = {
            # Download the single best audio-only stream
            "format": "bestaudio/best",
            "outtmpl": outtmpl,
            # Convert to mono 16kHz WAV using ffmpeg
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "wav",
                    "preferredquality": "0",  # lossless for WAV
                }
            ],
            "postprocessor_args": [
                # Force 16kHz mono — required by Whisper + voice analysis
                "-ar", "16000",
                "-ac", "1",
            ],
            # Don't print to stdout; capture via logger
            "quiet": True,
            "no_warnings": False,
            "logger": _YtdlpLogger(),
            # Abort if video is longer than 3 hours (safety valve)
            # Remove or increase this if you need longer videos
            "match_filter": yt_dlp.utils.match_filter_func("duration < 10800"),
        }

        logger.info("Downloading audio from YouTube: %s", url)
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except yt_dlp.utils.DownloadError as exc:
            raise RuntimeError(f"YouTube download failed: {exc}") from exc

        if not Path(wav_path).is_file():
            raise RuntimeError(
                "yt-dlp ran successfully but WAV output was not found. "
                f"Expected: {wav_path}"
            )

        logger.info("YouTube audio downloaded → %s (%.1f MB)",
                    wav_path, Path(wav_path).stat().st_size / 1e6)
        return wav_path


class _YtdlpLogger:
    """Redirect yt-dlp messages to Python's logging."""

    def debug(self, msg: str) -> None:
        if msg.startswith("[debug]"):
            logger.debug("yt-dlp: %s", msg)
        else:
            logger.info("yt-dlp: %s", msg)

    def info(self, msg: str) -> None:
        logger.info("yt-dlp: %s", msg)

    def warning(self, msg: str) -> None:
        logger.warning("yt-dlp: %s", msg)

    def error(self, msg: str) -> None:
        logger.error("yt-dlp: %s", msg)
