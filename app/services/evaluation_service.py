"""Teacher performance evaluation via AWS Bedrock (Claude).

Sends the classroom transcript to a Bedrock-hosted LLM along with the
standardised teaching-performance rubric, and returns the structured
evaluation report.

The rubric system prompt is loaded from the Cursor skill file at
``.cursor/skills/teacher-assessment-evaluator/rubric_prompt.md`` so that
edits to the rubric automatically propagate to both the Cursor agent context
and this runtime service.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import Settings

logger = logging.getLogger(__name__)

_RUBRIC_PATH = (
    Path(__file__).resolve().parents[2]
    / ".cursor" / "skills" / "teacher-assessment-evaluator" / "rubric_prompt.md"
)

_rubric_cache: str | None = None


def _load_rubric() -> str:
    global _rubric_cache
    if _rubric_cache is None:
        _rubric_cache = _RUBRIC_PATH.read_text(encoding="utf-8")
    return _rubric_cache


class EvaluationService:
    """Calls AWS Bedrock (Claude) to evaluate a transcript against the rubric."""

    def __init__(self, settings: Settings) -> None:
        self._model_id = settings.bedrock_evaluation_model_id
        self._client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )

    def evaluate(self, transcript: str) -> str:
        """Send the transcript to Claude and return the evaluation report."""
        rubric = _load_rubric()

        try:
            response = self._client.converse(
                modelId=self._model_id,
                system=[{"text": rubric}],
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "text": (
                                    "Here is the full classroom transcript to evaluate:\n\n"
                                    f"{transcript}"
                                ),
                            }
                        ],
                    }
                ],
                inferenceConfig={
                    "maxTokens": 4096,
                    "temperature": 0.3,
                },
            )
        except (ClientError, BotoCoreError) as exc:
            logger.error("Bedrock evaluation failed: %s", exc)
            raise RuntimeError(f"Bedrock evaluation error: {exc}") from exc

        output_message = response["output"]["message"]
        evaluation_text = "".join(
            block["text"] for block in output_message["content"] if "text" in block
        )
        logger.info("Evaluation complete: %d chars", len(evaluation_text))
        return evaluation_text
