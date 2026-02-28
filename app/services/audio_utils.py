import logging
import shutil
from pathlib import Path
from typing import Optional

import ffmpeg

logger = logging.getLogger(__name__)


def _find_ffmpeg() -> str:
    """Return the path to an ffmpeg binary.

    Checks PATH first, then falls back to the binary bundled with
    imageio-ffmpeg (useful on Windows where ffmpeg is often not installed
    system-wide).
    """
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass

    raise FileNotFoundError(
        "ffmpeg not found. Install it system-wide or run: pip install imageio-ffmpeg"
    )


_ffmpeg_bin: Optional[str] = None


def _get_ffmpeg_bin() -> str:
    """Return the ffmpeg binary path, resolving lazily so the app can start without ffmpeg."""
    global _ffmpeg_bin
    if _ffmpeg_bin is None:
        _ffmpeg_bin = _find_ffmpeg()
    return _ffmpeg_bin


def extract_audio(input_path: str, output_path: str) -> str:
    """Extract audio from an MP4 file and save as mono 16 kHz WAV.

    Uses ffmpeg under the hood:
      -ac 1        -> single (mono) channel
      -ar 16000    -> 16 kHz sample rate, standard for speech models
      -acodec pcm_s16le -> 16-bit signed little-endian PCM

    Returns the output_path on success.
    Raises RuntimeError if ffmpeg exits with a non-zero code.
    """
    if not Path(input_path).is_file():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    try:
        (
            ffmpeg
            .input(input_path, err_detect="ignore_err")
            .output(output_path, ac=1, ar=16000, acodec="pcm_s16le")
            .overwrite_output()
            .run(cmd=_get_ffmpeg_bin(), capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as exc:
        stderr_text = exc.stderr.decode("utf-8", errors="replace") if exc.stderr else "unknown"

        # ffmpeg may exit non-zero yet still produce a usable output when
        # the source has a few corrupt frames.  Only raise if no file was
        # actually written.
        if Path(output_path).is_file() and Path(output_path).stat().st_size > 0:
            logger.warning("ffmpeg reported errors but produced output — continuing")
        else:
            logger.error("ffmpeg failed: %s", stderr_text)
            raise RuntimeError(f"Audio extraction failed: {stderr_text}") from exc

    if not Path(output_path).is_file():
        raise RuntimeError(f"ffmpeg did not produce output file: {output_path}")

    return output_path
