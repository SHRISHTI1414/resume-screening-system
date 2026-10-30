import pytest

from app.schemas.job import JobRequirements
from app.services import matching_service
from app.utils.skill_normalizer import normalize_skill, term_in_text


@pytest.mark.parametrize(
    ("variant", "canonical"),
    [
        ("JS", "javascript"),
        ("JavaScript", "javascript"),
        ("  javascript ", "javascript"),
        ("Postgres", "postgresql"),
        ("RESTful APIs", "rest api"),
        ("NodeJS", "node.js"),
        ("Rust", "rust"),
    ],
)
def test_normalize_skill_handles_common_variations(variant: str, canonical: str) -> None:
    assert normalize_skill(variant) == canonical


def test_match_skills_reports_matched_and_missing_in_job_spelling() -> None:
    score, matched, missing = matching_service.match_skills(
        ["python", "Postgres", "Git"], ["Python", "FastAPI", "PostgreSQL", "REST API", "Git"]
    )
    assert score == 60
    assert matched == ["Python", "PostgreSQL", "Git"]
    assert missing == ["FastAPI", "REST API"]


def test_match_skills_with_no_required_skills_cannot_penalize() -> None:
    assert matching_service.match_skills(["Python"], []) == (100.0, [], [])


def test_term_in_text_does_not_match_inside_other_words_or_prose() -> None:
    assert term_in_text("SQL", "Tuned PostgreSQL and SQL queries")
    assert not term_in_text("SQL", "Tuned MySQL queries")
    assert term_in_text("C++", "Wrote C++ services")
    assert not term_in_text("C", "Wrote C++ services")
    # "go" is an alias for golang, but in prose it is just a word.
    assert not term_in_text("Golang", "Ready to go the extra mile")


@pytest.mark.parametrize(
    ("candidate", "required", "expected"),
    [(4, 3, 100), (3, 3, 100), (1.5, 3, 50), (0, 3, 0), (0, 0, 100), (-2, 3, 0)],
)
def test_score_experience(candidate: float, required: float, expected: float) -> None:
    assert matching_service.score_experience(candidate, required) == expected


def test_semantic_score_ranks_related_text_above_unrelated() -> None:
    job = "Build REST APIs in Python with FastAPI and PostgreSQL databases"
    related = "Built REST APIs in Python using FastAPI on PostgreSQL"
    unrelated = "Managed retail stores and trained customer service staff"
    assert matching_service.score_semantic(related, job) > matching_service.score_semantic(
        unrelated, job
    )
    assert matching_service.score_semantic(unrelated, job) == 0


def test_semantic_score_handles_empty_text() -> None:
    assert matching_service.score_semantic("", "") == 0


def test_score_projects_rewards_relevance() -> None:
    requirements = JobRequirements(required_skills=["Python", "FastAPI", "Docker", "AWS"])
    relevant = [{"name": "API", "description": "Python FastAPI service", "technologies": []}]
    unrelated = [{"name": "Blog", "description": "A static site", "technologies": ["HTML"]}]
    assert matching_service.score_projects(relevant, requirements) == 100
    assert matching_service.score_projects(unrelated, requirements) == 0
    assert matching_service.score_projects([], requirements) == 0


@pytest.mark.parametrize(
    ("education", "requirement", "expected"),
    [
        (
            [{"degree": "B.Tech", "field": "Computer Science"}],
            "Bachelor's in Computer Science",
            100,
        ),
        (
            [{"degree": "B.Tech", "field": "Software Engineering"}],
            "Bachelor's in Computer Science",
            100,
        ),
        ([{"degree": "M.Sc", "field": "Computer Science"}], "Bachelor's in Computer Science", 100),
        ([{"degree": "B.Sc", "field": "Physics"}], "Bachelor's in Computer Science", 70),
        (
            [{"degree": "Diploma", "field": "Computer Science"}],
            "Bachelor's in Computer Science",
            70,
        ),
        ([{"degree": "Diploma", "field": "Cooking"}], "Bachelor's in Computer Science", 40),
        ([], "Bachelor's in Computer Science", 40),
        ([], "", 100),
    ],
)
def test_score_education(education: list[dict[str, str]], requirement: str, expected: int) -> None:
    requirements = [requirement] if requirement else []
    assert matching_service.score_education(education, requirements) == expected


def test_score_certifications() -> None:
    requirements = JobRequirements(required_skills=["AWS"], preferred_skills=["Docker"])
    assert matching_service.score_certifications(["AWS Solutions Architect"], requirements) == 100
    assert matching_service.score_certifications(["First Aid"], requirements) == 50
    assert matching_service.score_certifications([], requirements) == 50
