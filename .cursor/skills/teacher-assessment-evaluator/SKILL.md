---
name: teacher-assessment-evaluator
description: Evaluate classroom lesson transcripts using a standardized teaching-performance rubric. Use when the user asks to assess teacher performance, score pedagogy and communication, rate classroom interaction, or produce a structured evidence-based evaluation report with 1-4 scores and descriptors.
---

# Teacher Assessment Evaluator

## Mission

- Act as an expert pedagogical observer and evaluator.
- Analyze the provided transcript and evaluate teacher performance using the standardized rubric.
- Assign scores, select observed descriptors, and provide actionable feedback based only on transcript evidence.

## Input Requirements

- Require a lesson transcript or classroom interaction transcript.
- Use any user-provided rubric overrides if explicitly supplied.
- If critical context is missing for a category, mark it with: `Insufficient evidence in transcript.`

## Scoring Scale

- `1` = Needs Improvement / None: Little to no evidence of the desired behavior.
- `2` = Adequate / Not Enough: Some evidence, but inconsistent or lacking depth.
- `3` = Good / Average: Consistent and effective demonstration of the behavior.
- `4` = Excellent / Frequent: Highly effective, engaging, and exemplary demonstration.

## Evaluation Workflow

1. Read the full transcript before scoring.
2. Score each sub-category from `1` to `4` unless explicitly overridden by the user.
3. List only descriptors actively observed in transcript evidence.
4. Write `Evidence & Feedback` in 1-3 sentences per sub-category.
5. Cite direct quotes or concrete moments from the transcript when available.
6. Do not infer facts not present in the transcript.
7. Keep feedback specific, professional, and actionable.

## Programmatic Usage

The rubric prompt is also used by `app/services/evaluation_service.py` as the
system prompt for AWS Bedrock Claude.  The canonical rubric text lives in
[rubric_prompt.md](rubric_prompt.md) and is loaded at runtime.

To update the rubric wording, edit `rubric_prompt.md` — both the Cursor skill
context and the backend LLM call will pick up the change automatically.
