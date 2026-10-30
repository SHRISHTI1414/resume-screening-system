"""Authentication: the backend trusts a request only if Supabase Auth accepts its token."""

import hashlib
import logging
import time
import uuid
from dataclasses import dataclass

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import Profile

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

TOKEN_CACHE_SECONDS = 60
_token_cache: dict[str, tuple[float, "AuthUser"]] = {}


@dataclass(frozen=True)
class AuthUser:
    id: uuid.UUID
    email: str
    full_name: str


def fetch_auth_user(token: str) -> AuthUser:
    """Validate an access token against Supabase Auth, caching briefly to avoid a call per click."""
    cache_key = hashlib.sha256(token.encode()).hexdigest()
    cached = _token_cache.get(cache_key)
    if cached and cached[0] > time.monotonic():
        return cached[1]

    settings = get_settings()
    try:
        response = httpx.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_service_role_key,
            },
            timeout=10,
        )
    except httpx.HTTPError as exc:
        logger.error("Could not reach Supabase Auth: %s", exc)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Authentication service is unavailable."
        ) from exc

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired.")

    payload = response.json()
    email = payload.get("email") or ""
    metadata = payload.get("user_metadata") or {}
    user = AuthUser(
        id=uuid.UUID(payload["id"]),
        email=email,
        full_name=metadata.get("full_name") or email.split("@")[0],
    )
    _token_cache[cache_key] = (time.monotonic() + TOKEN_CACHE_SECONDS, user)
    return user


def get_current_profile(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Profile:
    """Resolve the caller to a profile, creating it on first sight and keeping the name in sync."""
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in to continue.")

    user = fetch_auth_user(credentials.credentials)
    profile = db.scalar(select(Profile).where(Profile.auth_user_id == user.id))
    if profile is None:
        profile = Profile(auth_user_id=user.id, full_name=user.full_name, email=user.email)
        db.add(profile)
        db.commit()
    elif profile.full_name != user.full_name or profile.email != user.email:
        profile.full_name = user.full_name
        profile.email = user.email
        db.commit()
    return profile
