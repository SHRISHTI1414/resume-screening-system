"""The resume pipeline: store, extract, analyze, match, score, explain, save."""

import hashlib
import logging
import uuid

from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import database
from app.db.models import (
    Application,
    Candidate,
    Job,
    ProcessingStatus,
    Resume,
    ScreeningResult,
)
from app.schemas.job import JobRequirements
from app.schemas.resume import ResumeData
from app.schemas.screening import AIEvaluation, ScoreBreakdown
from app.services import ai_service, job_parser, resume_parser, scoring_service, storage_service
from app.services.ai_service import AIServiceError
from app.services.resume_parser import ResumeParseError, ResumeValidationError
from app.services.storage_service import StorageError

logger = logging.getLogger(__name__)

# Resumes this process is working on. Anything marked "processing" that is not in here was
# interrupted, typically by a restart on the free hosting tier, and is safe to run again.
_in_progress: set[uuid.UUID] = set()


def create_resume(db: Session, job: Job, file_name: str, content: bytes) -> Resume:
    """Validate an upload and put it in storage. Text extraction happens in the background."""
    file_type = resume_parser.validate_upload(file_name, content)
    content_hash = hashlib.sha256(content).hexdigest()

    duplicate = db.scalar(
        select(Resume).where(Resume.job_id == job.id, Resume.content_hash == content_hash)
    )
    if duplicate is not None:
        if duplicate.processing_status == ProcessingStatus.FAILED:
            raise ResumeValidationError(
                "This file already failed for this job. Use Re-run Screening to retry it."
            )
        raise ResumeValidationError("This resume has already been uploaded for this job.")

    resume_id = uuid.uuid4()
    path = storage_service.build_path(job.user_id, job.id, resume_id, file_name)
    storage_service.upload(path, content, resume_parser.CONTENT_TYPES[file_type])

    resume = Resume(
        id=resume_id,
        job_id=job.id,
        file_name=file_name[-255:],
        file_url=path,
        file_type=file_type,
        content_hash=content_hash,
    )
    db.add(resume)
    db.commit()
    _in_progress.add(resume.id)
    return resume


def _load_or_extract(db: Session, resume: Resume) -> ResumeData:
    """Get structured data while calling Groq only for a file it has never seen."""
    if resume.parsed_data is not None:
        return ResumeData.model_validate(resume.parsed_data)

    previous = db.scalar(
        select(Resume)
        .join(Job, Resume.job_id == Job.id)
        .where(
            Resume.content_hash == resume.content_hash,
            Resume.parsed_data.is_not(None),
            Job.user_id == resume.job.user_id,
        )
        .limit(1)
    )
    if previous is not None:
        resume.raw_text = previous.raw_text
        data = ResumeData.model_validate(previous.parsed_data)
    else:
        content = storage_service.download(resume.file_url)
        resume.raw_text = resume_parser.extract_text(content, resume.file_type)
        data = ai_service.extract_resume(resume.raw_text)

    resume.parsed_data = data.model_dump()
    # Saved now so that a later failure, such as in evaluation, never repeats this extraction.
    db.commit()
    return data


def _upsert_candidate(db: Session, resume: Resume, data: ResumeData) -> Candidate:
    """The same email under the same recruiter is the same person."""
    candidate = db.get(Candidate, resume.candidate_id) if resume.candidate_id else None
    if candidate is None and data.email:
        candidate = db.scalar(
            select(Candidate).where(
                Candidate.user_id == resume.job.user_id, Candidate.email == data.email
            )
        )
    if candidate is None:
        candidate = Candidate(user_id=resume.job.user_id, name="", email=data.email)
        db.add(candidate)

    candidate.name = (data.name or resume.file_name.rsplit(".", 1)[0])[:255]
    candidate.phone = data.phone or candidate.phone
    candidate.location = data.location or candidate.location
    candidate.linkedin_url = data.linkedin_url or candidate.linkedin_url
    candidate.github_url = data.github_url or candidate.github_url
    candidate.summary = data.summary or candidate.summary
    return candidate


def _upsert_application(db: Session, resume: Resume, candidate: Candidate) -> Application:
    """A new resume from the same person for the same job updates their existing application."""
    application = db.scalar(
        select(Application).where(
            Application.candidate_id == candidate.id, Application.job_id == resume.job_id
        )
    )
    if application is None:
        application = Application(candidate_id=candidate.id, job_id=resume.job_id)
        db.add(application)
    application.resume_id = resume.id
    return application


def _save_screening(
    db: Session, application: Application, breakdown: ScoreBreakdown, evaluation: AIEvaluation
) -> None:
    result = db.scalar(
        select(ScreeningResult).where(ScreeningResult.application_id == application.id)
    )
    if result is None:
        result = ScreeningResult(application_id=application.id)
        db.add(result)

    for field, value in breakdown.model_dump().items():
        setattr(result, field, value)
    result.ai_score = evaluation.ai_score
    result.overall_score = scoring_service.calculate_overall_score(breakdown, evaluation.ai_score)
    result.ai_summary = evaluation.summary
    result.strengths = evaluation.strengths
    result.weaknesses = evaluation.weaknesses
    result.recommendation = evaluation.recommendation


def _requirements_for(db: Session, job: Job) -> JobRequirements:
    if job.structured_requirements is None:
        job_parser.analyze_job(job)
        db.commit()
    return job_parser.effective_requirements(job)


def _run_pipeline(db: Session, resume: Resume) -> None:
    data = _load_or_extract(db, resume)

    candidate = _upsert_candidate(db, resume, data)
    db.flush()
    resume.candidate_id = candidate.id
    application = _upsert_application(db, resume, candidate)
    db.flush()
    db.commit()

    job = resume.job
    requirements = _requirements_for(db, job)
    breakdown = scoring_service.score_candidate(
        data, requirements, job_parser.build_job_text(job, requirements)
    )
    evaluation = ai_service.evaluate_candidate(requirements, data, breakdown)

    _save_screening(db, application, breakdown, evaluation)
    resume.processing_status = ProcessingStatus.COMPLETED
    resume.error_message = None
    db.commit()


def _mark_failed(db: Session, resume_id: uuid.UUID, message: str) -> None:
    db.rollback()
    resume = db.get(Resume, resume_id)
    if resume is not None:
        resume.processing_status = ProcessingStatus.FAILED
        resume.error_message = message
        db.commit()


def process_resume(resume_id: uuid.UUID) -> None:
    """Runs in the background, so every failure must end up on the row instead of being raised."""
    with database.SessionLocal() as db:
        try:
            resume = db.get(Resume, resume_id)
            if resume is not None:
                _run_pipeline(db, resume)
        except (ResumeParseError, AIServiceError, StorageError) as exc:
            logger.warning("Resume %s failed: %s", resume_id, exc)
            _mark_failed(db, resume_id, str(exc))
        except SQLAlchemyError:
            logger.exception("Database error while processing resume %s", resume_id)
            _mark_failed(db, resume_id, "The screening result could not be saved. Please retry.")
        except Exception:
            logger.exception("Unexpected error while processing resume %s", resume_id)
            _mark_failed(db, resume_id, "Unable to process this resume. Please retry.")
        finally:
            _in_progress.discard(resume_id)


def queue_job_screening(db: Session, job: Job) -> list[uuid.UUID]:
    """Mark a job's resumes for screening, including failed or interrupted ones.

    Saved extractions are reused, so this re-scores against the job as it is now without
    re-reading any resume through Groq.
    """
    current_resumes = select(Application.resume_id).where(Application.job_id == job.id)
    resumes = db.scalars(
        select(Resume).where(
            Resume.job_id == job.id,
            or_(
                Resume.id.in_(current_resumes),
                Resume.processing_status != ProcessingStatus.COMPLETED,
            ),
        )
    ).all()

    queued = [resume for resume in resumes if resume.id not in _in_progress]
    for resume in queued:
        resume.processing_status = ProcessingStatus.PROCESSING
        resume.error_message = None
    db.commit()

    resume_ids = [resume.id for resume in queued]
    _in_progress.update(resume_ids)
    return resume_ids


def process_resumes(resume_ids: list[uuid.UUID]) -> None:
    for resume_id in resume_ids:
        process_resume(resume_id)
