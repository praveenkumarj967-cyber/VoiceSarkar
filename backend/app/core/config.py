"""
app/core/config.py
Application settings loaded from environment / .env file.
Uses pydantic-settings v2 with model_config = ConfigDict(...).
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    app_name: str = "VoiceSarkar"
    debug: bool = False
    secret_key: str = "changeme-super-secret-key-in-production-32chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = "sqlite:///./voicesarkar.db"

    # ── Redis ────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Twilio ───────────────────────────────────────────────────────────────
    twilio_account_sid: str = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    twilio_auth_token: str = "your_twilio_auth_token"
    twilio_from_number: str = "+1800XXXXXXX"

    # ── Exotel ───────────────────────────────────────────────────────────────
    exotel_sid: str = "your_exotel_sid"
    exotel_token: str = "your_exotel_token"
    exotel_from: str = "0008000XXXXX"

    # ── Public base URL (used in webhook callbacks) ───────────────────────────
    public_base_url: str = "http://localhost:8000"

    # ── Bhashini ULCA ────────────────────────────────────────────────────────
    bhashini_user_id: str = ""
    bhashini_ulca_api_key: str = ""
    bhashini_pipeline_id: str = ""
    bhashini_config_url: str = (
        "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    )

    # ── Google Gemini ────────────────────────────────────────────────────────
    gemini_api_key: Optional[str] = None

    # ── Admin ────────────────────────────────────────────────────────────────
    admin_api_key: str = "changeme-admin-api-key"

    # ── Feature flags ────────────────────────────────────────────────────────
    portal_mode: str = "mock"          # mock | live
    telephony_provider: str = "twilio" # twilio | exotel
    sms_provider: str = "twilio"       # twilio | mock

    # ── CORS ─────────────────────────────────────────────────────────────────
    cors_origins: List[str] = ["http://localhost:3000"]

    # ── Rate limiting ────────────────────────────────────────────────────────
    rate_limit_per_minute: int = 60

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v  # type: ignore[return-value]


settings = Settings()
