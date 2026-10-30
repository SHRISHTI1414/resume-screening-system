import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_PAGE_SIZE
from app.core.security import get_current_profile
from app.db.database import get_db
from app.db.models import Application, Job, Profile, Resume, ScreeningResult
from app.schemas.candidate import CandidateApplication, CandidateDetail
from app.schemas.common import ApiResponse, Page, ok
from app.schemas.resume import ResumeData
from app.schemas.screening import ApplicationStatusLiteral, ScreeningItem
from app.services import query_service
from app.services.query_service import ScreeningFilters

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


@router.get("", response_model=ApiResponse[Page[ScreeningItem]])
def list_candidates(
    search: str | None = None,
    status: ApplicationStatusLiteral | None = None,
    job_id: uuid.UUID | None = None,
    min_score: float | None = Query(default=None, ge=0, le=100),
    min_experience: float | None = Query(default=None, ge=0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=100),
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    filters = ScreeningFilters(
        job_id=job_id,
        status=status,
        min_score=min_score,
        min_experience=min_experience,
        search=search,
    )
    items, total = query_service.list_candidates(db, user, filters, page, page_size)
    return ok(Page(items=items, total=total, page=page, page_size=page_size))


@router.get("/{candidate_id}", response_model=ApiResponse[CandidateDetail])
def get_candidate(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    candidate = query_service.get_owned_candidate(db, candidate_id, user)
    rows = db.execute(
        select(Application, Job, Resume, ScreeningResult)
        .join(Job, Application.job_id == Job.id)
        .join(Resume, Application.resume_id == Resume.id)
        .outerjoin(ScreeningResult, ScreeningResult.application_id == Application.id)
        .where(Application.candidate_id == candidate.id, Job.user_id == user.id)
        .order_by(ScreeningResult.overall_score.desc().nulls_last())
    ).all()

    applications = [
        CandidateApplication(
            application_id=application.id,
            job_id=job.id,
            job_title=job.title,
            resume_id=resume.id,
            resume_file_name=resume.file_name,
            status=application.status,
            screening=query_service.screening_out(result),
        )
        for application, job, resume, result in rows
    ]
    latest_resume = max((row[2] for row in rows), key=lambda r: r.created_at, default=None)
    parsed = ResumeData.model_validate((latest_resume.parsed_data if latest_resume else None) or {})

    return ok(
        CandidateDetail(
            id=candidate.id,
            name=candidate.name,
            email=candidate.email,
            phone=candidate.phone,
            location=candidate.location,
            linkedin_url=candidate.linkedin_url,
            github_url=candidate.github_url,
            summary=candidate.summary,
            created_at=candidate.created_at,
            skills=parsed.skills,
            programming_languages=parsed.programming_languages,
            education=parsed.education,
            experience=parsed.experience,
            projects=parsed.projects,
            certifications=parsed.certifications,
            total_experience_years=parsed.total_experience_years,
            applications=applications,
        )
    )
