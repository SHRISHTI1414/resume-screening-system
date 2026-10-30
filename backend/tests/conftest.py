import os
import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("SUPABASE_URL", "http://supabase.test")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
os.environ.setdefault("GROQ_API_KEY", "test-key")

from app.core.security import get_current_profile  # noqa: E402
from app.db import database  # noqa: E402
from app.db.database import Base, get_db  # noqa: E402
from app.db.models import Profile  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def session_factory(monkeypatch: pytest.MonkeyPatch) -> Iterator[sessionmaker[Session]]:
    """API tests need no database server: they use in-memory SQLite."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    # SQLite ignores foreign keys, and so cascades, unless asked per connection.
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr(database, "SessionLocal", factory)
    yield factory
    engine.dispose()


@pytest.fixture
def recruiter(session_factory: sessionmaker[Session]) -> Profile:
    return make_profile(session_factory, "recruiter@example.com")


@pytest.fixture
def other_recruiter(session_factory: sessionmaker[Session]) -> Profile:
    return make_profile(session_factory, "other@example.com")


def make_profile(factory: sessionmaker[Session], email: str) -> Profile:
    with factory() as db:
        profile = Profile(auth_user_id=uuid.uuid4(), full_name="Test Recruiter", email=email)
        db.add(profile)
        db.commit()
        return profile


@pytest.fixture
def client(session_factory: sessionmaker[Session], recruiter: Profile) -> Iterator[TestClient]:
    def override_db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_profile] = lambda: recruiter
    yield TestClient(app)
    app.dependency_overrides.clear()
