import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_profile
from app.db.database import get_db
from app.db.models import Profile
from app.schemas.common import ApiResponse, ok
from app.schemas.screening import ApplicationOut, StatusUpdate
from app.services import query_service

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.patch("/{application_id}/status", response_model=ApiResponse[ApplicationOut])
def update_status(
    application_id: uuid.UUID,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    user: Profile = Depends(get_current_profile),
) -> dict[str, Any]:
    application = query_service.get_owned_application(db, application_id, user)
    application.status = payload.status
    db.commit()
    return ok(ApplicationOut.model_validate(application))
