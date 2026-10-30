import pandas as pd

from app.schemas.screening import ScreeningItem

COLUMNS = [
    "Candidate Name",
    "Email",
    "Job",
    "Overall Score",
    "Skills Score",
    "Experience Score",
    "Semantic Score",
    "Projects Score",
    "Education Score",
    "Certification Score",
    "AI Score",
    "Category",
    "Status",
]


def _safe_cell(value: str | None) -> str:
    """Names come from uploaded files. A leading = or + would run as a spreadsheet formula."""
    text = value or ""
    return f"'{text}" if text.startswith(("=", "+", "-", "@", "\t", "\r")) else text


def _row(item: ScreeningItem) -> list[object]:
    identity = [_safe_cell(item.candidate_name), _safe_cell(item.candidate_email), item.job_title]
    screening = item.screening
    if screening is None:
        return [*identity, *[None] * 8, "", item.status]
    return [
        *identity,
        screening.overall_score,
        screening.skills_score,
        screening.experience_score,
        screening.semantic_score,
        screening.projects_score,
        screening.education_score,
        screening.certifications_score,
        screening.ai_score,
        screening.category,
        item.status,
    ]


def build_csv(items: list[ScreeningItem]) -> str:
    return pd.DataFrame([_row(item) for item in items], columns=COLUMNS).to_csv(index=False)
