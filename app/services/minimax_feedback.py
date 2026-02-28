"""Teacher feedback generation via Minimax LLM (Anthropic-compatible API).

Takes the full analysis context — transcript, body language report, and rubric
evaluation — and generates actionable, personalized feedback for the teacher.
"""
from __future__ import annotations

import logging

import anthropic

from app.config import Settings

logger = logging.getLogger(__name__)

FEEDBACK_SYSTEM_PROMPT = """\
You are an expert teaching coach and mentor with decades of experience in \
classroom observation and teacher professional development. You have been \
provided with a comprehensive analysis of a classroom lesson, including:

1. A full transcript of the lesson
2. A detailed body language / nonverbal communication analysis
3. A rubric-based evaluation with scores across multiple categories

Your task is to synthesize ALL of this information and produce a warm, \
constructive, and highly actionable feedback report for the teacher. \
The feedback should feel like it comes from a supportive colleague, not a \
critical evaluator.

## Output Structure

### Overall Impression
A brief (3-4 sentence) summary of the lesson's strengths and overall quality.

### What Went Well
Identify 3-5 specific strengths with concrete examples from the transcript \
and body language analysis. Reference specific moments, quotes, or gestures.

### Areas for Growth
Identify 2-3 areas where the teacher could improve. For EACH area:
- Describe the specific observation
- Explain WHY it matters for student learning
- Provide a concrete, actionable suggestion the teacher can try next time

### Nonverbal Communication Highlights
Summarize 2-3 key findings from the body language analysis that the teacher \
should be aware of — both positive patterns and areas to refine.

### Quick Wins
List 3 small, immediately actionable changes the teacher can make in their \
very next lesson.

### Encouragement
End with a genuine, specific note of encouragement based on what was observed.

## Guidelines
- Be specific. Reference actual moments from the transcript and body language data.
- Be balanced. Lead with strengths before discussing growth areas.
- Be actionable. Every suggestion should be something concrete the teacher can do.
- Be respectful. This teacher is a professional who is investing in their growth.
- Use Markdown formatting for readability.
"""


class MinimaxFeedbackService:
    """Generates teacher feedback using Minimax via the Anthropic SDK."""

    def __init__(self, settings: Settings) -> None:
        api_key = settings.minimax_api_key
        if not api_key:
            raise ValueError("MINIMAX_API_KEY is not configured.")

        self._client = anthropic.Anthropic(
            api_key=api_key,
            base_url=settings.minimax_base_url,
        )
        self._model = settings.minimax_model

    def generate_feedback(
        self,
        transcript: str | None = None,
        body_language_report: str | None = None,
        rubric_evaluation: str | None = None,
        additional_context: str | None = None,
    ) -> str:
        """Generate teacher feedback from all available analysis data."""
        content_parts: list[str] = []

        if transcript:
            content_parts.append(
                "## Lesson Transcript\n\n" + transcript
            )

        if body_language_report:
            content_parts.append(
                "## Body Language Analysis\n\n" + body_language_report
            )

        if rubric_evaluation:
            content_parts.append(
                "## Rubric Evaluation\n\n" + rubric_evaluation
            )

        if additional_context:
            content_parts.append(
                "## Additional Context\n\n" + additional_context
            )

        if not content_parts:
            raise ValueError("At least one analysis input is required.")

        user_message = (
            "Please analyze the following classroom observation data and "
            "generate a comprehensive feedback report for the teacher.\n\n"
            + "\n\n---\n\n".join(content_parts)
        )

        logger.info(
            "Generating Minimax feedback: model=%s, input=%d chars",
            self._model, len(user_message),
        )

        message = self._client.messages.create(
            model=self._model,
            max_tokens=8192,
            system=FEEDBACK_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        feedback = "".join(
            block.text for block in message.content if block.type == "text"
        )

        logger.info(
            "Minimax feedback generated: %d chars, stop=%s",
            len(feedback), message.stop_reason,
        )
        return feedback
