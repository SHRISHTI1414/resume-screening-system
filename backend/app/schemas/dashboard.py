from pydantic import BaseModel

from app.schemas.job import JobOut
from app.schemas.screening import ScreeningItem


class ChartPoint(BaseModel):
    label: str
    value: int


class DashboardStats(BaseModel):
    total_jobs: int
    active_jobs: int
    total_candidates: int
    shortlisted: int
    average_score: float | None
    score_distribution: list[ChartPoint]
    status_distribution: list[ChartPoint]
    recent_jobs: list[JobOut]
    top_candidates: list[ScreeningItem]
