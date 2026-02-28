"""Lightweight in-memory session counters.

Incremented by the route handlers; reset when the server restarts.
No persistence is needed — the dashboard just shows live session activity.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field


@dataclass
class SessionStats:
    started_at: float = field(default_factory=time.time)
    transcriptions: int = 0
    full_analyses: int = 0
    feedback_generated: int = 0

    @property
    def uptime_seconds(self) -> int:
        return int(time.time() - self.started_at)


# Module-level singleton — imported directly by route handlers
stats = SessionStats()
