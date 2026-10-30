import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.screening import ScreeningOut


class CandidateApplication(BaseModel):
    application_id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    resume_id: uuid.UUID
    resume_file_name: str
    status: str
    screening: ScreeningOut | None


class CandidateDetail(BaseModel):
    id: uuid.UUID
    name: str
    email: str | None
    phone: str | None
    location: str | None
    linkedin_url: str | None
    github_url: str | None
    summary: str | None
    created_at: datetime

    skills: list[str]
    programming_languages: list[str]
    education: list[dict[str, Any]]
    experience: list[dict[str, Any]]
    projects: list[dict[str, Any]]
    certifications: list[str]
    total_experience_years: float

    applications: list[CandidateApplication]
