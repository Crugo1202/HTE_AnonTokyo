"""Loads pre-analyzed "Mark John" placeholder data from body_language_analysis/.

The placeholder files were generated from the YouTube video
https://www.youtube.com/watch?v=omzd691qJGI and serve as demo data
while the live Gemini analysis pipeline is not invoked.
"""
from __future__ import annotations

import re
from pathlib import Path

from app.schemas.response import BodyLanguageSegmentReport, BodyLanguageSummary

_DATA_DIR = Path(__file__).resolve().parents[2] / "body_language_analysis"

_SEGMENT_RE = re.compile(
    r"segment_(\d+)_(\d{4})_(\d{4})\.md$"
)


def _hhmmss(raw: str) -> str:
    """Convert '0300' → '03:00'."""
    return f"{raw[:2]}:{raw[2:]}"


def load_placeholder_body_language() -> BodyLanguageSummary:
    """Return the pre-analyzed Mark John body language data."""
    combined_path = _DATA_DIR / "00_full_body_language_report.md"
    combined_report = (
        combined_path.read_text(encoding="utf-8")
        if combined_path.exists()
        else ""
    )

    segments: list[BodyLanguageSegmentReport] = []

    for md_file in sorted(_DATA_DIR.glob("segment_*.md")):
        match = _SEGMENT_RE.search(md_file.name)
        if not match:
            continue
        seg_num = int(match.group(1))
        start = _hhmmss(match.group(2))
        end = _hhmmss(match.group(3))
        markdown = md_file.read_text(encoding="utf-8")

        segments.append(BodyLanguageSegmentReport(
            segment=seg_num,
            start=start,
            end=end,
            markdown=markdown,
        ))

    return BodyLanguageSummary(
        model="gemini-3.1-pro-preview",
        total_segments=len(segments),
        segments=segments,
        combined_report=combined_report,
    )


PLACEHOLDER_VIDEO_SOURCE = "https://www.youtube.com/watch?v=omzd691qJGI"

PLACEHOLDER_RUBRIC_EVALUATION = """\
# Teacher Performance Evaluation — Mark John (Placeholder)

## 1. Teaching Organization

### Learning Objective
Score: 4 | Descriptors: Clear objectives, suited to learners' needs/ability levels

Evidence & Feedback: The teacher clearly stated the learning objective at the \
beginning of the lesson (mitosis and cell division). Activities were well-scaffolded \
to match student levels, moving from prior knowledge checks to hands-on modeling.

### Organization of Learning Activities/Tasks
Score: 4 | Descriptors: Well-connected activities, smooth transitions, appropriate \
pace, encouraging self-learning, developing generic skills

Evidence & Feedback: Transitions between direct instruction, whole-class discussion, \
and group modeling were seamless. The teacher used verbal and physical cues to signal \
each shift. Pacing allowed adequate time for note-taking and reflection.

### Professional Knowledge
Score: 4 | Descriptors: Good content knowledge, clear concept, appropriate teaching strategies

Evidence & Feedback: The teacher demonstrated strong command of biology content \
(mitosis phases, chromosome structure, cytokinesis). Explanations were accurate \
and supplemented with effective analogies ("spaghetti bowl of DNA").

### Attitude
Score: 4 | Descriptors: Friendly, approachable, responsible, supportive, open-minded

Evidence & Feedback: The teacher maintained a warm, approachable demeanor throughout. \
She modeled vulnerability by laughing at her own typo, creating a safe environment \
for student participation.

## 2. Communication Skills in Teaching

### Presentation
Score: 4 | Descriptors: Clear, concise, systematic, clear focus

Evidence & Feedback: Instructions were delivered clearly with visual aids (graphic \
organizer, DNA model, pipe cleaners). The teacher used illustrative hand gestures \
extensively to reinforce verbal content.

### Questioning Techniques
Score: 4 | Descriptors: Checks understanding, sustains motivation, encourages \
higher-order thinking, inquiry learning, enough waiting time

Evidence & Feedback: Frequent checks for understanding ("Raise your hand if..."), \
Socratic questioning with small groups ("Where did you get your traits from?"), \
and adequate wait time after posing questions.

### Feedback
Score: 4 | Descriptors: Approving, rewarding, encouraging, specifying attainment, \
timely, following up on student responses

Evidence & Feedback: Positive reinforcement was immediate and specific — table taps, \
pointing, wide smiles, and verbal praise. The teacher validated multiple correct \
approaches to the modeling activity.

## 3. Class Interaction with Students

### Learning Atmosphere
Score: 4 | Descriptors: Good teacher-student rapport, supportive, lively, challenging

Evidence & Feedback: Strong rapport evident through humor, personalized interactions \
(calling students by name), and relaxed body language. The classroom atmosphere was \
lively yet focused.

### Catering for Learner Difference
Score: 3 | Descriptors: Breaks down content into small parts, monitors progress, \
provides individual support

Evidence & Feedback: The teacher circulated extensively and provided targeted \
support to struggling groups. Content was scaffolded with multiple modalities \
(verbal, visual, kinesthetic). Some differentiation for advanced learners could \
be more explicit.

## 4. Learning Attitude and Performance

### Attitude Towards Learning
Score: 4 | Descriptors: Attentive, eager to learn, showing confidence, showing initiative

Evidence & Feedback: Students were visibly engaged — raising hands, asking questions, \
and actively manipulating models. The safe classroom atmosphere encouraged initiative.

### Students' Works/Contributions
Score: 3 | Descriptors: Appropriate responses, good questions raised, able to reflect understanding

Evidence & Feedback: Students contributed relevant questions and correctly identified \
biological concepts during group work. The modeling activity produced accurate \
representations, though some groups needed significant scaffolding.

## 5. Learning Strategy

### Group / Pair Interaction
State: Highly Motivated

Evidence & Feedback: Students worked collaboratively at tables, discussing terminology \
and sharing materials. The physical modeling activity naturally promoted peer interaction.

### Frequency of Interaction
Teacher-Student Interaction: (4) Frequent
Student-Student Interaction: (4) Frequent

Evidence & Feedback: The teacher engaged with nearly every group during circulation. \
Student-to-student discussion was continuous during the modeling activity.

### Main Teaching Methods/Activities Used
Identified: Lecturing, Questioning, Demonstration, Group activity, Cooperative learning

Evidence & Feedback: The lesson blended short lecture segments with frequent \
questioning, physical demonstrations (DNA model, pipe cleaners), and a structured \
cooperative group activity that required students to model mitosis stages.

## Final Summary
The teacher demonstrated excellent pedagogical skills across all categories. Key \
strengths include masterful use of physical modeling to make abstract biology concepts \
concrete, strong classroom management through proximity and nonverbal cues, and a \
warm, approachable demeanor that fostered high student engagement. The primary area \
for growth is more explicit differentiation for advanced learners who may benefit \
from extension tasks during group work.
"""
