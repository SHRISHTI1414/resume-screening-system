"""Deterministic comparison of a candidate with a job. Every result here is 0-100 and repeatable."""

import math
import re
from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.schemas.job import JobRequirements
from app.schemas.resume import ResumeData
from app.utils.skill_normalizer import normalize_skill, normalize_skills, term_in_text

# Cosine similarity between a resume and a job description rarely exceeds about 0.5 even for a
# very good fit, because they are different kinds of document. Treating 0.5 as a full match spreads
# scores across 0-100; without this no candidate could ever reach the top categories.
SEMANTIC_FULL_MATCH = 0.5

EDUCATION_MATCH = 100.0
EDUCATION_PARTIAL = 70.0
EDUCATION_NO_MATCH = 40.0

CERTIFICATION_RELEVANT = 100.0
CERTIFICATION_NONE = 50.0

DEGREE_PATTERNS: list[tuple[int, str]] = [
    (4, r"ph\.?\s?d|doctorate|doctoral"),
    (3, r"master|m\.?\s?tech|m\.?sc|m\.?c\.?a|m\.?b\.?a|m\.e\b|postgraduate"),
    (2, r"bachelor|b\.?\s?tech|b\.?sc|b\.?c\.?a|b\.e\b|b\.?s\b|b\.?a\b|undergraduate|graduate"),
    (1, r"diploma|associate"),
]

EDUCATION_NOISE_WORDS = {
    "a", "an", "and", "any", "bachelor", "bachelors", "b", "degree", "diploma", "doctorate",
    "engineering", "equivalent", "field", "fields", "in", "master", "masters", "minimum", "of",
    "or", "phd", "preferred", "related", "required", "s", "science", "sciences", "similar",
    "studies", "technology", "the", "tech", "btech", "mtech", "bsc", "msc", "with",
}  # fmt: skip

COMPUTING_FIELDS = {
    "ai",
    "computer",
    "computing",
    "cs",
    "cse",
    "data",
    "information",
    "it",
    "software",
}


def flatten_text(value: Any) -> str:
    """Join every string inside nested resume data, e.g. a list of project dicts."""
    if isinstance(value, dict):
        return " ".join(flatten_text(item) for item in value.values())
    if isinstance(value, list):
        return " ".join(flatten_text(item) for item in value)
    return str(value) if value is not None else ""


def match_skills(
    candidate_skills: list[str], required_skills: list[str]
) -> tuple[float, list[str], list[str]]:
    """Returns (score, matched, missing). Matched and missing keep the job's own spelling."""
    if not required_skills:
        return 100.0, [], []
    candidate = normalize_skills(candidate_skills)
    matched = [skill for skill in required_skills if normalize_skill(skill) in candidate]
    missing = [skill for skill in required_skills if normalize_skill(skill) not in candidate]
    return len(matched) / len(required_skills) * 100, matched, missing


def score_experience(candidate_years: float, required_years: float) -> float:
    if required_years <= 0:
        return 100.0
    return min(max(candidate_years, 0.0) / required_years, 1.0) * 100


def build_candidate_text(resume: ResumeData) -> str:
    return flatten_text(
        [
            resume.summary,
            resume.skills,
            resume.programming_languages,
            resume.experience,
            resume.projects,
            resume.education,
        ]
    )


def score_semantic(candidate_text: str, job_text: str) -> float:
    try:
        vectors = TfidfVectorizer(stop_words="english", ngram_range=(1, 2)).fit_transform(
            [candidate_text, job_text]
        )
    except ValueError:  # Nothing but stop words or empty text.
        return 0.0
    similarity = float(cosine_similarity(vectors[0], vectors[1])[0][0])
    return min(similarity / SEMANTIC_FULL_MATCH, 1.0) * 100


def _job_terms(requirements: JobRequirements) -> list[str]:
    terms = [
        *requirements.required_skills,
        *requirements.preferred_skills,
        *requirements.important_keywords,
    ]
    return list({normalize_skill(term): term for term in terms}.values())


def score_projects(projects: list[dict[str, Any]], requirements: JobRequirements) -> float:
    """Full marks once the candidate's projects cover at least half of the job's key terms."""
    terms = _job_terms(requirements)
    if not projects or not terms:
        return 0.0
    project_text = flatten_text(projects)
    hits = sum(term_in_text(term, project_text) for term in terms)
    return min(hits / math.ceil(len(terms) / 2), 1.0) * 100


def _degree_level(text: str) -> int | None:
    for level, pattern in DEGREE_PATTERNS:
        if re.search(rf"(?<![a-z]){pattern}", text):
            return level
    return None


def _field_words(text: str) -> set[str]:
    return set(re.findall(r"[a-z]+", text)) - EDUCATION_NOISE_WORDS


def score_education(education: list[dict[str, Any]], requirements: list[str]) -> float:
    required_text = " ".join(requirements).lower()
    if not required_text.strip():
        return EDUCATION_MATCH
    candidate_text = flatten_text(education).lower()

    required_level = _degree_level(required_text)
    candidate_level = _degree_level(candidate_text)
    level_ok = required_level is None or (candidate_level or 0) >= required_level

    required_fields = _field_words(required_text)
    candidate_fields = _field_words(candidate_text)
    field_ok = (
        not required_fields
        or bool(required_fields & candidate_fields)
        or bool(required_fields & COMPUTING_FIELDS and candidate_fields & COMPUTING_FIELDS)
    )

    if level_ok and field_ok:
        return EDUCATION_MATCH
    if level_ok or field_ok:
        return EDUCATION_PARTIAL
    return EDUCATION_NO_MATCH


def score_certifications(certifications: list[str], requirements: JobRequirements) -> float:
    text = " ".join(certifications)
    if text and any(term_in_text(term, text) for term in _job_terms(requirements)):
        return CERTIFICATION_RELEVANT
    return CERTIFICATION_NONE
