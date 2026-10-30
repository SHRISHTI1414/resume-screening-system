import uuid
from typing import Any, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_PAGE_SIZE
from app.core.security import get_current_profile
from app.db.database import get_db
from app.db.models import Profile
from app.schemas.common import ApiResponse, Page, ok
from app.schemas.screening import ApplicationStatusLiteral, ScreeningItem, ScreeningRun
from app.services import query_service, screening_service
from app.services.query_service import ScreeningFilters

router = APIRouter(prefix="/api/screening", tags=["screening"])


@router.get("", response_model=ApiResponse[Page[ScreeningItem]])
def list_all_screening(
    job_id: uuid.UUID | None = None,
    status_filter: ApplicationStatusLiteral | None = Query(default=None, alias="status"),
    min_score: float | None = Query(default=None, ge=0, le=100),
    max_score: float | None = Query(default=None, ge=0, le=100),
    min_experience: float | None = Query(default=None, ge=0),
    skill: str | None = None,
    sort: Literal["highest", "lowest", "newest"] = "highest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=100),
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    filters = ScreeningFilters(
        job_id=job_id,
        status=status_filter,
        min_score=min_score,
        max_score=max_score,
        min_experience=min_experience,
        skill=skill,
    )
    items, total = query_service.list_screening(db, user, filters, sort, page, page_size)
    return ok(Page(items=items, total=total, page=page, page_size=page_size))


@router.post(
    "/{job_id}", response_model=ApiResponse[ScreeningRun], status_code=status.HTTP_202_ACCEPTED
)
def run_screening(
    job_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    job = query_service.get_owned_job(db, job_id, user)
    resume_ids = screening_service.queue_job_screening(db, job)
    background_tasks.add_task(screening_service.process_resumes, resume_ids)
    return ok(ScreeningRun(queued=len(resume_ids)))


@router.get("/candidate/{candidate_id}", response_model=ApiResponse[list[ScreeningItem]])
def candidate_screening(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    candidate = query_service.get_owned_candidate(db, candidate_id, user)
    return ok(query_service.candidate_screening(db, user, candidate.id))


@router.get("/{job_id}", response_model=ApiResponse[Page[ScreeningItem]])
def job_screening(
    job_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=100),
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    job = query_service.get_owned_job(db, job_id, user)
    filters = ScreeningFilters(job_id=job.id)
    items, total = query_service.list_screening(db, user, filters, "highest", page, page_size)
    return ok(Page(items=items, total=total, page=page, page_size=page_size))
