import tempfile
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── ElevenLabs Speech-to-Text (Scribe API) ───────────────────────────
    elevenlabs_api_key: str = ""
    elevenlabs_stt_model: str = "scribe_v2"

    # ── Google Gemini (body language analysis) ──────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-pro-preview"

    # ── Minimax LLM (teacher feedback via Anthropic SDK) ─────────────
    minimax_api_key: str = ""
    minimax_model: str = "MiniMax-M2.5"
    minimax_base_url: str = "https://api.minimax.io/anthropic"

    # ── Misc ────────────────────────────────────────────────────────────
    fluctuation_window_seconds: int = 180
    temp_dir: str = tempfile.gettempdir()
    # Max video file size accepted (bytes).  Default = 500 MB.
    max_upload_bytes: int = 500 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
