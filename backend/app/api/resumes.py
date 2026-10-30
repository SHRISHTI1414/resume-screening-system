import uuid
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.config import MAX_UPLOAD_BYTES
from app.core.security import get_current_profile
from app.db.database import get_db
from app.db.models import JobStatus, Profile
from app.schemas.common import ApiResponse, ok
from app.schemas.resume import ResumeDetail, ResumeOut
from app.services import query_service, screening_service, storage_service
from app.services.resume_parser import ResumeValidationError
from app.services.storage_service import StorageError

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/upload", response_model=ApiResponse[ResumeOut], status_code=status.HTTP_202_ACCEPTED)
def upload_resume(
    background_tasks: BackgroundTasks,
    job_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    """Store the file and return at once. The client polls GET /{id} until processing ends."""
    job = query_service.get_owned_job(db, job_id, user)
    if job.status == JobStatus.CLOSED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This job is closed.")

    # Reading one byte past the limit is enough to reject without buffering a huge upload.
    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    try:
        resume = screening_service.create_resume(db, job, file.filename or "resume", content)
    except ResumeValidationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except StorageError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc

    background_tasks.add_task(screening_service.process_resume, resume.id)
    return ok(ResumeOut.model_validate(resume))


@router.get("/{resume_id}", response_model=ApiResponse[ResumeDetail])
def get_resume(
    resume_id: uuid.UUID,
    download: bool = False,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    resume = query_service.get_owned_resume(db, resume_id, user)
    detail = ResumeDetail.model_validate(resume, from_attributes=True)
    # Signing is a network call, so skip it for the status polls that make up most requests.
    if download:
        detail.download_url = storage_service.signed_url(resume.file_url)
    return ok(detail)
