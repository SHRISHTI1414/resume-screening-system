"""Read queries shared by the API routes. Every query here is scoped to one recruiter."""

import uuid
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Select, case, cast, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.types import Float, Text

from app.db.models import (
    Application,
    ApplicationStatus,
    Candidate,
    Job,
    ProcessingStatus,
    Profile,
    Resume,
    ScreeningResult,
)
from app.schemas.job import FailedResume, JobDetail, JobOut, JobStats
from app.schemas.screening import ScreeningItem, ScreeningOut
from app.services import scoring_service

AnySelect = Select[*tuple[Any, ...]]


@dataclass
class ScreeningFilters:
    job_id: uuid.UUID | None = None
    status: str | None = None
    min_score: float | None = None
    max_score: float | None = None
    min_experience: float | None = None
    skill: str | None = None
    search: str | None = None


def get_owned_job(db: Session, job_id: uuid.UUID, user: Profile) -> Job:
    """404 rather than 403, so that other recruiters' IDs cannot even be probed."""
    job = db.scalar(select(Job).where(Job.id == job_id, Job.user_id == user.id))
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found.")
    return job


def get_owned_candidate(db: Session, candidate_id: uuid.UUID, user: Profile) -> Candidate:
    candidate = db.scalar(
        select(Candidate).where(Candidate.id == candidate_id, Candidate.user_id == user.id)
    )
    if candidate is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found.")
    return candidate


def get_owned_application(db: Session, application_id: uuid.UUID, user: Profile) -> Application:
    application = db.scalar(
        select(Application)
        .join(Job, Application.job_id == Job.id)
        .where(Application.id == application_id, Job.user_id == user.id)
    )
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found.")
    return application


def get_owned_resume(db: Session, resume_id: uuid.UUID, user: Profile) -> Resume:
    resume = db.scalar(
        select(Resume)
        .join(Job, Resume.job_id == Job.id)
        .where(Resume.id == resume_id, Job.user_id == user.id)
    )
    if resume is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found.")
    return resume


def _job_stats(db: Session, job_ids: list[uuid.UUID]) -> dict[uuid.UUID, JobStats]:
    rows = db.execute(
        select(
            Application.job_id,
            func.count(Application.id),
            func.sum(case((Application.status == ApplicationStatus.SHORTLISTED, 1), else_=0)),
            func.avg(ScreeningResult.overall_score),
            func.max(ScreeningResult.overall_score),
        )
        .outerjoin(ScreeningResult, ScreeningResult.application_id == Application.id)
        .where(Application.job_id.in_(job_ids))
        .group_by(Application.job_id)
    ).all()
    return {
        job_id: JobStats(
            candidate_count=count,
            shortlisted_count=shortlisted or 0,
            average_score=round(average, 2) if average is not None else None,
            highest_score=highest,
        )
        for job_id, count, shortlisted, average, highest in rows
    }


def with_stats(db: Session, jobs: list[Job]) -> list[JobOut]:
    stats = _job_stats(db, [job.id for job in jobs])
    return [
        JobOut.model_validate(job).model_copy(update=stats.get(job.id, JobStats()).model_dump())
        for job in jobs
    ]


def job_detail(db: Session, job: Job) -> JobDetail:
    job_out = with_stats(db, [job])[0]
    rows = db.scalars(
        select(Resume).where(
            Resume.job_id == job.id,
            Resume.processing_status != ProcessingStatus.COMPLETED,
        )
    ).all()
    return JobDetail(
        **job_out.model_dump(),
        processing_count=sum(r.processing_status == ProcessingStatus.PROCESSING for r in rows),
        failed_resumes=[
            FailedResume(id=r.id, file_name=r.file_name, error_message=r.error_message)
            for r in rows
            if r.processing_status == ProcessingStatus.FAILED
        ],
    )


def _skills_text() -> Any:
    return cast(Resume.parsed_data["skills"], Text)


def _experience_years() -> Any:
    return cast(cast(Resume.parsed_data["total_experience_years"], Text), Float)


def _screening_select(user: Profile) -> AnySelect:
    return (
        select(Application, Candidate, Job, Resume, ScreeningResult)
        .join(Job, Application.job_id == Job.id)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .join(Resume, Application.resume_id == Resume.id)
        .outerjoin(ScreeningResult, ScreeningResult.application_id == Application.id)
        .where(Job.user_id == user.id)
    )


def _apply_filters(statement: AnySelect, filters: ScreeningFilters) -> AnySelect:
    if filters.job_id is not None:
        statement = statement.where(Application.job_id == filters.job_id)
    if filters.status:
        statement = statement.where(Application.status == filters.status)
    if filters.min_score is not None:
        statement = statement.where(ScreeningResult.overall_score >= filters.min_score)
    if filters.max_score is not None:
        statement = statement.where(ScreeningResult.overall_score <= filters.max_score)
    if filters.min_experience is not None:
        statement = statement.where(_experience_years() >= filters.min_experience)
    if filters.skill:
        statement = statement.where(_skills_text().ilike(f"%{filters.skill}%"))
    if filters.search:
        pattern = f"%{filters.search}%"
        statement = statement.where(
            or_(
                Candidate.name.ilike(pattern),
                Candidate.email.ilike(pattern),
                _skills_text().ilike(pattern),
            )
        )
    return statement


def screening_out(result: ScreeningResult | None) -> ScreeningOut | None:
    if result is None:
        return None
    return ScreeningOut(
        overall_score=result.overall_score,
        category=scoring_service.get_score_category(result.overall_score),
        skills_score=result.skills_score,
        experience_score=result.experience_score,
        semantic_score=result.semantic_score,
        projects_score=result.projects_score,
        education_score=result.education_score,
        certifications_score=result.certifications_score,
        ai_score=result.ai_score,
        matched_skills=result.matched_skills,
        missing_skills=result.missing_skills,
        ai_summary=result.ai_summary,
        strengths=result.strengths,
        weaknesses=result.weaknesses,
        recommendation=result.recommendation,
    )


def _to_item(row: Any, rank: int | None = None) -> ScreeningItem:
    application, candidate, job, resume, result = row
    parsed = resume.parsed_data or {}
    return ScreeningItem(
        rank=rank,
        application_id=application.id,
        candidate_id=candidate.id,
        candidate_name=candidate.name,
        candidate_email=candidate.email,
        job_id=job.id,
        job_title=job.title,
        status=application.status,
        experience_years=parsed.get("total_experience_years") or 0,
        skills=parsed.get("skills") or [],
        created_at=application.created_at,
        screening=screening_out(result),
    )


def list_screening(
    db: Session,
    user: Profile,
    filters: ScreeningFilters,
    sort: str = "highest",
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[ScreeningItem], int]:
    statement = _apply_filters(_screening_select(user), filters)
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0

    order_by: Any = {
        "lowest": ScreeningResult.overall_score.asc().nulls_last(),
        "newest": Application.created_at.desc(),
    }.get(sort, ScreeningResult.overall_score.desc().nulls_last())

    offset = (page - 1) * page_size
    rows = db.execute(
        statement.order_by(order_by, Application.id).offset(offset).limit(page_size)
    ).all()
    return [_to_item(row, offset + index + 1) for index, row in enumerate(rows)], total


def list_candidates(
    db: Session,
    user: Profile,
    filters: ScreeningFilters,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[ScreeningItem], int]:
    """One row per person: their best-scoring application among those matching the filters."""
    ranked = (
        _apply_filters(_screening_select(user), filters)
        .with_only_columns(
            Application.id.label("application_id"),
            func.row_number()
            .over(
                partition_by=Application.candidate_id,
                order_by=(
                    ScreeningResult.overall_score.desc().nulls_last(),
                    Application.created_at.desc(),
                ),
            )
            .label("position"),
        )
        .subquery()
    )
    best = select(ranked.c.application_id).where(ranked.c.position == 1)
    total = db.scalar(select(func.count()).select_from(best.subquery())) or 0

    statement = (
        _screening_select(user)
        .where(Application.id.in_(best))
        .order_by(Application.created_at.desc(), Application.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return [_to_item(row) for row in db.execute(statement).all()], total


def job_export_rows(db: Session, job: Job, user: Profile) -> list[ScreeningItem]:
    rows = db.execute(
        _screening_select(user)
        .where(Application.job_id == job.id)
        .order_by(ScreeningResult.overall_score.desc().nulls_last())
    ).all()
    return [_to_item(row) for row in rows]


def top_candidates(db: Session, user: Profile, limit: int = 5) -> list[ScreeningItem]:
    rows = db.execute(
        _screening_select(user)
        .where(ScreeningResult.id.is_not(None))
        .order_by(ScreeningResult.overall_score.desc())
        .limit(limit)
    ).all()
    return [_to_item(row, index + 1) for index, row in enumerate(rows)]


def candidate_screening(db: Session, user: Profile, candidate_id: uuid.UUID) -> list[ScreeningItem]:
    rows = db.execute(
        _screening_select(user)
        .where(Application.candidate_id == candidate_id)
        .order_by(ScreeningResult.overall_score.desc().nulls_last())
    ).all()
    return [_to_item(row) for row in rows]
