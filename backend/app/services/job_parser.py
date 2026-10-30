"""Works out what a job actually requires from the recruiter's form and the AI's analysis."""

import logging
import re

from app.db.models import Job
from app.schemas.job import JobRequirements
from app.services import ai_service
from app.services.ai_service import AIServiceError

logger = logging.getLogger(__name__)


def parse_experience_years(text: str | None) -> float | None:
    """Read the minimum from text like "2 years", "3+ yrs" or "3-5 years"."""
    match = re.search(r"\d+(?:\.\d+)?", text or "")
    return float(match.group()) if match else None


def analyze_job(job: Job) -> None:
    """Store AI-extracted requirements on the job.

    A failure here is not fatal: the recruiter's own form fields are enough to score against,
    and analysis is retried the next time the job is screened.
    """
    try:
        requirements = ai_service.extract_job_requirements(job.description)
    except AIServiceError as exc:
        logger.warning("Job analysis failed for %s: %s", job.id, exc)
        return
    job.structured_requirements = requirements.model_dump()


def effective_requirements(job: Job) -> JobRequirements:
    """Combine sources: what the recruiter typed always wins over what the AI inferred."""
    extracted = JobRequirements.model_validate(job.structured_requirements or {})
    stated_years = parse_experience_years(job.experience_required)
    return JobRequirements(
        required_skills=job.required_skills or extracted.required_skills,
        preferred_skills=job.preferred_skills or extracted.preferred_skills,
        minimum_experience_years=(
            stated_years if stated_years is not None else extracted.minimum_experience_years
        ),
        education_requirements=(
            [job.education_requirement]
            if job.education_requirement
            else extracted.education_requirements
        ),
        responsibilities=extracted.responsibilities,
        important_keywords=extracted.important_keywords,
    )


def build_job_text(job: Job, requirements: JobRequirements) -> str:
    return "\n".join(
        [
            job.title,
            job.description,
            *requirements.required_skills,
            *requirements.preferred_skills,
            *requirements.responsibilities,
            *requirements.important_keywords,
        ]
    )
