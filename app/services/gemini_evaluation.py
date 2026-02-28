"""Teacher rubric evaluation via Google Gemini.

Alternative to the Bedrock-based EvaluationService — sends the classroom
transcript (and optionally the body language report) to Gemini along with
the standardised teaching-performance rubric.
"""
from __future__ import annotations

import json
import logging
import subprocess
from pathlib import Path

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


def evaluate_with_gemini(
    api_key: str,
    model: str,
    transcript: str,
    body_language_report: str | None = None,
    max_time: int = 300,
) -> str:
    """Evaluate a teaching transcript against the rubric using Gemini.

    Optionally incorporates body language analysis for a more comprehensive
    evaluation that covers both verbal and nonverbal pedagogy.
    """
    rubric = _load_rubric()

    user_parts: list[str] = [
        "Here is the full classroom transcript to evaluate:\n\n",
        transcript,
    ]

    if body_language_report:
        user_parts.extend([
            "\n\n---\n\n"
            "Additionally, here is a body language analysis of the same lesson. "
            "Use this to strengthen your evaluation of communication skills, "
            "classroom interaction, and learning atmosphere:\n\n",
            body_language_report,
        ])

    payload = {
        "system_instruction": {"parts": [{"text": rubric}]},
        "contents": [{"parts": [{"text": "".join(user_parts)}]}],
        "generationConfig": {
            "maxOutputTokens": 8192,
            "temperature": 0.3,
        },
    }

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"models/{model}:streamGenerateContent?alt=sse"
    )

    payload_file = "/tmp/gemini_eval_payload.json"
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

    evaluation = "".join(text_parts)
    logger.info("Gemini evaluation complete: %d chars", len(evaluation))
    return evaluation
