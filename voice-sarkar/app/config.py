from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    public_base_url: str = "http://localhost:8000"

    bhashini_user_id: str = ""
    bhashini_ulca_api_key: str = ""
    bhashini_pipeline_id: str = ""
    bhashini_config_url: str = (
        "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    )

    database_url: str = "postgresql+psycopg2://voicesarkar:voicesarkar@localhost:5432/voicesarkar"
    redis_url: str = "redis://localhost:6379/0"

    admin_api_key: str = "change-me"
    portal_mode: str = "mock"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
