import math

import pytest

from app.schemas.job import JobRequirements
from app.schemas.resume import ResumeData
from app.schemas.screening import AIEvaluation, ScoreBreakdown
from app.services import scoring_service


def breakdown(**scores: float) -> ScoreBreakdown:
    defaults = {
        "skills_score": 0.0,
        "experience_score": 0.0,
        "semantic_score": 0.0,
        "projects_score": 0.0,
        "education_score": 0.0,
        "certifications_score": 0.0,
    }
    return ScoreBreakdown(**{**defaults, **scores}, matched_skills=[], missing_skills=[])


def test_weights_sum_to_one() -> None:
    assert math.isclose(sum(scoring_service.WEIGHTS.values()), 1.0)


def test_overall_score_matches_the_documented_formula() -> None:
    scores = breakdown(
        skills_score=92,
        experience_score=90,
        semantic_score=84,
        projects_score=80,
        education_score=100,
        certifications_score=70,
    )
    expected = 92 * 0.35 + 90 * 0.2 + 84 * 0.2 + 80 * 0.1 + 100 * 0.05 + 70 * 0.05 + 88 * 0.05
    assert scoring_service.calculate_overall_score(scores, 88) == round(expected, 2)


def test_ai_alone_can_move_the_score_by_at_most_five_points() -> None:
    assert scoring_service.calculate_overall_score(breakdown(), 100) == 5
    assert scoring_service.calculate_overall_score(breakdown(skills_score=100), 0) == 35


@pytest.mark.parametrize(
    ("score", "category"),
    [
        (100, "Excellent Match"),
        (90, "Excellent Match"),
        (89.99, "Strong Match"),
        (80, "Strong Match"),
        (79, "Good Match"),
        (70, "Good Match"),
        (69, "Review"),
        (60, "Review"),
        (59.99, "Weak Match"),
        (0, "Weak Match"),
    ],
)
def test_score_categories(score: float, category: str) -> None:
    assert scoring_service.get_score_category(score) == category


def test_score_candidate_end_to_end_without_ai() -> None:
    resume = ResumeData(
        summary="Backend developer building REST APIs with Python and FastAPI",
        skills=["Python", "FastAPI", "Postgres", "Git"],
        programming_languages=["JavaScript"],
        education=[{"degree": "B.Tech", "field": "Computer Science"}],
        projects=[{"name": "API", "description": "FastAPI service on PostgreSQL"}],
        total_experience_years=3,
    )
    requirements = JobRequirements(
        required_skills=["Python", "FastAPI", "PostgreSQL", "REST API", "Git"],
        minimum_experience_years=2,
        education_requirements=["Bachelor's in Computer Science"],
    )
    result = scoring_service.score_candidate(resume, requirements, "REST APIs in Python FastAPI")
    assert result.skills_score == 80
    assert result.experience_score == 100
    assert result.education_score == 100
    assert result.missing_skills == ["REST API"]
    assert 0 < result.semantic_score <= 100


def test_ai_evaluation_clamps_scores_and_rejects_unknown_recommendations() -> None:
    evaluation = AIEvaluation(ai_score=250, summary="ok", recommendation="Consider")
    assert evaluation.ai_score == 100
    with pytest.raises(ValueError):
        AIEvaluation(ai_score=50, summary="ok", recommendation="Hire immediately")


def test_resume_data_tolerates_llm_nulls_and_drops_unsafe_links() -> None:
    data = ResumeData.model_validate(
        {
            "skills": None,
            "certifications": ["AWS", None, ""],
            "total_experience_years": None,
            "linkedin_url": "javascript:alert(1)",
            "github_url": "github.com/someone",
            "email": " Person@Example.COM ",
        }
    )
    assert data.skills == []
    assert data.certifications == ["AWS"]
    assert data.total_experience_years == 0
    assert data.linkedin_url is None
    assert data.github_url == "https://github.com/someone"
    assert data.email == "person@example.com"
