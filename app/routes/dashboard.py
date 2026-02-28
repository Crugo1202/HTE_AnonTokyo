"""
Dashboard endpoint — returns service health, configuration status,
session-level activity counters, and capability flags.

  GET /api/dashboard
"""
from fastapi import APIRouter

from app.config import get_settings
from app.schemas.response import (
    DashboardResponse,
    DashboardStats,
    ServiceStatus,
)
from app.services.session_stats import stats as session_stats

APP_VERSION = "0.2.0"

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard() -> DashboardResponse:
    """Return system health, service availability, and session statistics."""
    settings = get_settings()

    services = [
        ServiceStatus(
            name="elevenlabs",
            configured=bool(settings.elevenlabs_api_key),
            label="ElevenLabs Speech-to-Text",
        ),
        ServiceStatus(
            name="gemini",
            configured=bool(settings.gemini_api_key),
            label="Google Gemini (Body Language)",
        ),
        ServiceStatus(
            name="minimax",
            configured=bool(settings.minimax_api_key),
            label="Minimax LLM (AI Feedback)",
        ),
    ]

    capabilities: list[str] = []
    if settings.elevenlabs_api_key:
        capabilities.append("transcription")
    if settings.gemini_api_key:
        capabilities.append("body-language-analysis")
    if settings.elevenlabs_api_key and settings.gemini_api_key:
        capabilities.append("full-analysis")
    if settings.minimax_api_key:
        capabilities.append("ai-feedback")

    return DashboardResponse(
        version=APP_VERSION,
        services=services,
        stats=DashboardStats(
            transcriptions=session_stats.transcriptions,
            full_analyses=session_stats.full_analyses,
            feedback_generated=session_stats.feedback_generated,
            uptime_seconds=session_stats.uptime_seconds,
        ),
        capabilities=capabilities,
    )
