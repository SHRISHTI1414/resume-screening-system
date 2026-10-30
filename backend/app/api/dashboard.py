from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import get_current_profile
from app.db.database import get_db
from app.db.models import (
    Application,
    ApplicationStatus,
    Candidate,
    Job,
    JobStatus,
    Profile,
    ScreeningResult,
)
from app.schemas.common import ApiResponse, ok
from app.schemas.dashboard import ChartPoint, DashboardStats
from app.services import query_service, scoring_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

STATUS_ORDER = ("New", "Under Review", "Shortlisted", "Interview", "Rejected", "Hired")


@router.get("/stats", response_model=ApiResponse[DashboardStats])
def dashboard_stats(
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    job_statuses = list(db.scalars(select(Job.status).where(Job.user_id == user.id)))
    application_statuses = list(
        db.scalars(
            select(Application.status)
            .join(Job, Application.job_id == Job.id)
            .where(Job.user_id == user.id)
        )
    )
    scores = list(
        db.scalars(
            select(ScreeningResult.overall_score)
            .join(Application, ScreeningResult.application_id == Application.id)
            .join(Job, Application.job_id == Job.id)
            .where(Job.user_id == user.id)
        )
    )
    total_candidates = db.scalar(
        select(func.count()).select_from(Candidate).where(Candidate.user_id == user.id)
    )
    recent_jobs = db.scalars(
        select(Job).where(Job.user_id == user.id).order_by(Job.created_at.desc()).limit(5)
    ).all()

    categories = Counter(scoring_service.get_score_category(score) for score in scores)
    statuses = Counter(application_statuses)

    return ok(
        DashboardStats(
            total_jobs=len(job_statuses),
            active_jobs=job_statuses.count(JobStatus.ACTIVE),
            total_candidates=total_candidates or 0,
            shortlisted=statuses[ApplicationStatus.SHORTLISTED],
            average_score=round(sum(scores) / len(scores), 2) if scores else None,
            score_distribution=[
                ChartPoint(label=category, value=categories[category])
                for category in scoring_service.SCORE_CATEGORIES
            ],
            status_distribution=[
                ChartPoint(label=status, value=statuses[status]) for status in STATUS_ORDER
            ],
            recent_jobs=query_service.with_stats(db, list(recent_jobs)),
            top_candidates=query_service.top_candidates(db, user),
        )
    )
