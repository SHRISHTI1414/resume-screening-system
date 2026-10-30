"""Supabase Storage access. The bucket is private; only this service role key can reach it."""

import logging
import re
import uuid
from functools import lru_cache
from typing import Any

import httpx
from storage3.exceptions import StorageApiError
from supabase import create_client

from app.core.config import STORAGE_BUCKET, get_settings

logger = logging.getLogger(__name__)

SIGNED_URL_SECONDS = 300


class StorageError(Exception):
    """Supabase Storage failed; the message is safe to show the user."""


@lru_cache
def _bucket() -> Any:
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return client.storage.from_(STORAGE_BUCKET)


def build_path(user_id: uuid.UUID, job_id: uuid.UUID, resume_id: uuid.UUID, name: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)[-100:]
    return f"{user_id}/{job_id}/{resume_id}_{safe_name}"


def upload(path: str, content: bytes, content_type: str) -> None:
    try:
        _bucket().upload(path, content, {"content-type": content_type})
    except (StorageApiError, httpx.HTTPError) as exc:
        logger.error("Storage upload failed: %s", exc)
        raise StorageError("The resume could not be stored. Please try again.") from exc


def download(path: str) -> bytes:
    try:
        return bytes(_bucket().download(path))
    except (StorageApiError, httpx.HTTPError) as exc:
        logger.error("Storage download failed: %s", exc)
        raise StorageError("The stored resume could not be read.") from exc


def signed_url(path: str) -> str | None:
    try:
        return str(_bucket().create_signed_url(path, SIGNED_URL_SECONDS)["signedURL"])
    except (StorageApiError, httpx.HTTPError, KeyError) as exc:
        logger.error("Could not sign storage URL: %s", exc)
        return None


def remove(paths: list[str]) -> None:
    """Best effort: a leftover file must not block deleting the job it belonged to."""
    if not paths:
        return
    try:
        _bucket().remove(paths)
    except (StorageApiError, httpx.HTTPError) as exc:
        logger.error("Storage cleanup failed: %s", exc)
