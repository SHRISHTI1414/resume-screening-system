import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

from app.schemas.job import StringList

Recommendation = Literal["Strongly Recommended", "Recommended", "Consider", "Not Recommended"]
ApplicationStatusLiteral = Literal[
    "New", "Under Review", "Shortlisted", "Interview", "Rejected", "Hired"
]


def _clamp_score(value: Any) -> Any:
    return max(0.0, min(100.0, float(value))) if isinstance(value, int | float) else value


class AIEvaluation(BaseModel):
    """Qualitative evaluation returned by the AI. It counts for only 5% of the score."""

    ai_score: Annotated[float, BeforeValidator(_clamp_score)]
    summary: str
    strengths: StringList = Field(default_factory=list)
    weaknesses: StringList = Field(default_factory=list)
    recommendation: Recommendation


class ScoreBreakdown(BaseModel):
    skills_score: float
    experience_score: float
    semantic_score: float
    projects_score: float
    education_score: float
    certifications_score: float
    matched_skills: list[str]
    missing_skills: list[str]


class ScreeningOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    overall_score: float
    category: str
    skills_score: float
    experience_score: float
    semantic_score: float
    projects_score: float
    education_score: float
    certifications_score: float
    ai_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    ai_summary: str | None
    strengths: list[str]
    weaknesses: list[str]
    recommendation: str | None


class ScreeningItem(BaseModel):
    rank: int | None = None
    application_id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str
    candidate_email: str | None
    job_id: uuid.UUID
    job_title: str
    status: ApplicationStatusLiteral
    experience_years: float
    skills: list[str]
    created_at: datetime
    screening: ScreeningOut | None


class StatusUpdate(BaseModel):
    status: ApplicationStatusLiteral


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    job_id: uuid.UUID
    status: ApplicationStatusLiteral
    updated_at: datetime


class ScreeningRun(BaseModel):
    queued: int
