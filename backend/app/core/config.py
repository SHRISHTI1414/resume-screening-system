from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
STORAGE_BUCKET = "resumes"
DEFAULT_PAGE_SIZE = 20


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://localhost:5432/resume_screening"

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"

    frontend_url: str = "http://localhost:3000"

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        """Supabase hands out postgresql:// URLs; SQLAlchemy needs the driver named."""
        for prefix in ("postgresql://", "postgres://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix) :]
        return value

    @field_validator("supabase_url", "frontend_url")
    @classmethod
    def strip_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()
