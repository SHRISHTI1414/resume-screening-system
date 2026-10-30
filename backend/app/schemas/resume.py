import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.job import DictList, StringList, Years


class ResumeData(BaseModel):
    """Structured candidate information the AI extracts from a resume."""

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None

    summary: str | None = None

    skills: StringList = Field(default_factory=list)
    programming_languages: StringList = Field(default_factory=list)

    education: DictList = Field(default_factory=list)
    experience: DictList = Field(default_factory=list)
    projects: DictList = Field(default_factory=list)
    certifications: StringList = Field(default_factory=list)

    total_experience_years: Years = 0.0

    @field_validator("linkedin_url", "github_url")
    @classmethod
    def only_web_links(cls, value: str | None) -> str | None:
        """These come from an untrusted file and end up in href attributes."""
        if not value or not value.strip():
            return None
        url = value.strip()
        if "://" not in url:
            if ":" in url.split("/")[0]:
                return None
            url = f"https://{url}"
        return url if url.lower().startswith(("https://", "http://")) else None

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if value and value.strip() else None


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID
    candidate_id: uuid.UUID | None
    file_name: str
    file_type: str
    processing_status: str
    error_message: str | None
    created_at: datetime


class ResumeDetail(ResumeOut):
    parsed_data: dict[str, Any] | None
    download_url: str | None = None
