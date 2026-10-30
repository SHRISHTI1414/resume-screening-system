import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_PAGE_SIZE
from app.core.security import get_current_profile
from app.db.database import get_db
from app.db.models import Application, Candidate, Job, Profile, Resume
from app.schemas.common import ApiResponse, Page, ok
from app.schemas.job import JobCreate, JobDetail, JobOut, JobUpdate
from app.services import csv_service, job_parser, query_service, storage_service

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

# Changing any of these changes what candidates are judged against.
REQUIREMENT_FIELDS = {"description", "required_skills", "preferred_skills", "education_requirement"}


@router.get("", response_model=ApiResponse[Page[JobOut]])
def list_jobs(
    search: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=100),
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    statement = select(Job).where(Job.user_id == user.id)
    if search:
        pattern = f"%{search}%"
        statement = statement.where(or_(Job.title.ilike(pattern), Job.department.ilike(pattern)))
    if status_filter:
        statement = statement.where(Job.status == status_filter)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    jobs = db.scalars(
        statement.order_by(Job.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    items = query_service.with_stats(db, list(jobs))
    return ok(Page(items=items, total=total, page=page, page_size=page_size))


@router.post("", response_model=ApiResponse[JobDetail], status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    job = Job(user_id=user.id, **payload.model_dump())
    db.add(job)
    db.commit()

    job_parser.analyze_job(job)
    db.commit()
    return ok(query_service.job_detail(db, job))


@router.get("/{job_id}", response_model=ApiResponse[JobDetail])
def get_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    job = query_service.get_owned_job(db, job_id, user)
    return ok(query_service.job_detail(db, job))


@router.put("/{job_id}", response_model=ApiResponse[JobDetail])
def update_job(
    job_id: uuid.UUID,
    payload: JobUpdate,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    job = query_service.get_owned_job(db, job_id, user)
    changes = payload.model_dump(exclude_unset=True)
    needs_analysis = any(
        field in REQUIREMENT_FIELDS and getattr(job, field) != value
        for field, value in changes.items()
    )
    for field, value in changes.items():
        setattr(job, field, value)
    if needs_analysis:
        job.structured_requirements = None
    db.commit()

    if needs_analysis:
        job_parser.analyze_job(job)
        db.commit()
    return ok(query_service.job_detail(db, job))


@router.delete("/{job_id}", response_model=ApiResponse[dict[str, bool]])
def delete_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    job = query_service.get_owned_job(db, job_id, user)
    paths = list(db.scalars(select(Resume.file_url).where(Resume.job_id == job.id)))
    candidate_ids = list(
        db.scalars(select(Application.candidate_id).where(Application.job_id == job.id))
    )

    db.delete(job)
    db.flush()

    # A person's data has no reason to outlive their last application.
    still_applied = select(Application.candidate_id)
    orphans = db.scalars(
        select(Candidate).where(Candidate.id.in_(candidate_ids), Candidate.id.not_in(still_applied))
    ).all()
    for candidate in orphans:
        db.delete(candidate)
    db.commit()

    storage_service.remove(paths)
    return ok({"deleted": True})


@router.get("/{job_id}/export")
def export_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> Response:
    job = query_service.get_owned_job(db, job_id, user)
    content = csv_service.build_csv(query_service.job_export_rows(db, job, user))
    file_name = re.sub(r"[^A-Za-z0-9]+", "-", job.title).strip("-").lower() or "job"
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{file_name}-candidates.csv"'},
    )
