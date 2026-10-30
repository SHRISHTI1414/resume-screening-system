"""Combines matching results into the final score. The AI contributes at most 5 points."""

from app.schemas.job import JobRequirements
from app.schemas.resume import ResumeData
from app.schemas.screening import ScoreBreakdown
from app.services import matching_service

WEIGHTS = {
    "skills": 0.35,
    "experience": 0.20,
    "semantic": 0.20,
    "projects": 0.10,
    "education": 0.05,
    "certifications": 0.05,
    "ai": 0.05,
}

SCORE_CATEGORIES = ("Excellent Match", "Strong Match", "Good Match", "Review", "Weak Match")


def get_score_category(score: float) -> str:
    if score >= 90:
        return "Excellent Match"
    if score >= 80:
        return "Strong Match"
    if score >= 70:
        return "Good Match"
    if score >= 60:
        return "Review"
    return "Weak Match"


def calculate_overall_score(breakdown: ScoreBreakdown, ai_score: float) -> float:
    overall = (
        breakdown.skills_score * WEIGHTS["skills"]
        + breakdown.experience_score * WEIGHTS["experience"]
        + breakdown.semantic_score * WEIGHTS["semantic"]
        + breakdown.projects_score * WEIGHTS["projects"]
        + breakdown.education_score * WEIGHTS["education"]
        + breakdown.certifications_score * WEIGHTS["certifications"]
        + ai_score * WEIGHTS["ai"]
    )
    return round(overall, 2)


def score_candidate(
    resume: ResumeData, requirements: JobRequirements, job_text: str
) -> ScoreBreakdown:
    """Run every deterministic comparison. No AI is involved in this step."""
    candidate_skills = resume.skills + resume.programming_languages
    skills_score, matched, missing = matching_service.match_skills(
        candidate_skills, requirements.required_skills
    )
    return ScoreBreakdown(
        skills_score=round(skills_score, 2),
        experience_score=round(
            matching_service.score_experience(
                resume.total_experience_years, requirements.minimum_experience_years
            ),
            2,
        ),
        semantic_score=round(
            matching_service.score_semantic(
                matching_service.build_candidate_text(resume), job_text
            ),
            2,
        ),
        projects_score=round(matching_service.score_projects(resume.projects, requirements), 2),
        education_score=matching_service.score_education(
            resume.education, requirements.education_requirements
        ),
        certifications_score=matching_service.score_certifications(
            resume.certifications, requirements
        ),
        matched_skills=matched,
        missing_skills=missing,
    )
