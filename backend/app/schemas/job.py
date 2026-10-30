import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator

JobStatusLiteral = Literal["Active", "Closed", "Draft"]


def _as_list(value: Any) -> Any:
    return [] if value is None else value


def _as_strings(value: Any) -> Any:
    """LLMs sometimes return null, or objects where we asked for strings."""
    if value is None:
        return []
    if not isinstance(value, list):
        return value
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _as_years(value: Any) -> Any:
    return 0.0 if value is None else value


StringList = Annotated[list[str], BeforeValidator(_as_strings)]
DictList = Annotated[list[dict[str, Any]], BeforeValidator(_as_list)]
Years = Annotated[float, BeforeValidator(_as_years), Field(ge=0)]


class JobRequirements(BaseModel):
    """Structured requirements the AI extracts from a job description."""

    required_skills: StringList = Field(default_factory=list)
    preferred_skills: StringList = Field(default_factory=list)
    minimum_experience_years: Years = 0.0
    education_requirements: StringList = Field(default_factory=list)
    responsibilities: StringList = Field(default_factory=list)
    important_keywords: StringList = Field(default_factory=list)


def _clean_skills(skills: list[str]) -> list[str]:
    seen: dict[str, str] = {}
    for skill in skills:
        name = skill.strip()
        if name:
            seen.setdefault(name.lower(), name)
    return list(seen.values())


class JobBase(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    employment_type: str | None = Field(default=None, max_length=100)
    experience_required: str | None = Field(default=None, max_length=100)
    description: str = Field(min_length=20)
    required_skills: list[str] = Field(min_length=1)
    preferred_skills: list[str] = Field(default_factory=list)
    education_requirement: str | None = Field(default=None, max_length=255)

    @field_validator("required_skills", "preferred_skills")
    @classmethod
    def clean_skills(cls, value: list[str]) -> list[str]:
        return _clean_skills(value)


class JobCreate(JobBase):
    status: Literal["Active", "Draft"] = "Active"


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    employment_type: str | None = Field(default=None, max_length=100)
    experience_required: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, min_length=20)
    required_skills: list[str] | None = Field(default=None, min_length=1)
    preferred_skills: list[str] | None = None
    education_requirement: str | None = Field(default=None, max_length=255)
    status: JobStatusLiteral | None = None

    @field_validator("required_skills", "preferred_skills")
    @classmethod
    def clean_skills(cls, value: list[str] | None) -> list[str] | None:
        return None if value is None else _clean_skills(value)


class JobStats(BaseModel):
    candidate_count: int = 0
    shortlisted_count: int = 0
    average_score: float | None = None
    highest_score: float | None = None


class JobOut(JobBase, JobStats):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: JobStatusLiteral
    structured_requirements: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class FailedResume(BaseModel):
    id: uuid.UUID
    file_name: str
    error_message: str | None


class JobDetail(JobOut):
    processing_count: int = 0
    failed_resumes: list[FailedResume] = Field(default_factory=list)
