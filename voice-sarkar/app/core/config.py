from __future__ import annotations
from functools import lru_cache
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # App
    app_name: str = "Voice Sarkar"
    debug: bool = False
    version: str = "1.0.0"
    secret_key: str = "change-me-to-a-very-long-random-secret-key-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Database
    database_url: str = "sqlite:///./voicesarkar.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Telephony
    telephony_provider: str = "twilio"  # twilio | exotel
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    exotel_sid: str = ""
    exotel_token: str = ""
    exotel_from: str = ""
    public_base_url: str = "http://localhost:8000"

    # Bhashini
    bhashini_user_id: str = ""
    bhashini_ulca_api_key: str = ""
    bhashini_pipeline_id: str = "64392f96daac500b55c543cd"
    bhashini_config_url: str = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"

    # AI
    gemini_api_key: str = ""

    # Admin
    admin_api_key: str = "localdev-admin-key"

    # Gov Portals
    portal_mode: str = "mock"  # mock | api

    # SMS
    sms_provider: str = "twilio"

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Rate limiting
    rate_limit_per_minute: int = 60


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
