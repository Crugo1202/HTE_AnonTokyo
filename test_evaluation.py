"""Quick test: transcribe a 60-second clip then run the rubric evaluation."""

import asyncio
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))

from app.config import get_settings, Settings
from app.services.audio_utils import extract_audio, FFMPEG_BIN
from app.services.transcribe_service import TranscribeService
from app.services.evaluation_service import EvaluationService

import ffmpeg

VIDEO_PATH = os.path.join(os.path.dirname(__file__), "class observation.mp4")
CLIP_SECONDS = 60


def extract_short_clip(input_path: str, output_path: str, duration: int) -> str:
    (
        ffmpeg
        .input(input_path, t=duration, err_detect="ignore_err")
        .output(output_path, ac=1, ar=16000, acodec="pcm_s16le")
        .overwrite_output()
        .run(cmd=FFMPEG_BIN, capture_stdout=True, capture_stderr=True)
    )
    return output_path


async def main() -> None:
    get_settings.cache_clear()
    settings = get_settings()

    with tempfile.TemporaryDirectory(prefix="hte_eval_") as tmp:
        wav_path = os.path.join(tmp, "clip.wav")

        print(f"[1/3] Extracting {CLIP_SECONDS}s clip ...")
        extract_short_clip(VIDEO_PATH, wav_path, CLIP_SECONDS)

        print("[2/3] Transcribing ...")
        svc = TranscribeService(settings)
        transcript = await svc.transcribe(wav_path)
        print(f"  Transcript ({len(transcript)} chars):\n  {transcript[:200]}...\n")

        print("[3/3] Running rubric evaluation via Bedrock Claude ...")
        eval_svc = EvaluationService(settings)
        evaluation = eval_svc.evaluate(transcript)

        print("--- Evaluation Report ---\n")
        print(evaluation)


if __name__ == "__main__":
    asyncio.run(main())
