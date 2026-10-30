import io
import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.security import get_current_profile
from app.db.models import Profile, Resume
from app.main import app
from app.schemas.job import JobRequirements
from app.schemas.resume import ResumeData
from app.schemas.screening import AIEvaluation
from app.services import ai_service, screening_service, storage_service
from app.services.ai_service import AIServiceError
from tests.test_resume_parser import make_pdf

PDF = make_pdf()  # A single file: make_pdf() embeds a timestamp, so each call differs.

JOB = {
    "title": "Backend Developer",
    "experience_required": "2 years",
    "description": "Build REST APIs with Python, FastAPI and PostgreSQL for our platform.",
    "required_skills": ["Python", "FastAPI", "PostgreSQL", "REST API", "Git"],
    "preferred_skills": ["Docker"],
    "education_requirement": "Bachelor's in Computer Science",
}

RESUME = ResumeData(
    name="Asha Rao",
    email="asha@example.com",
    summary="Backend developer",
    skills=["Python", "FastAPI", "Postgres", "Git"],
    education=[{"degree": "B.Tech", "field": "Computer Science"}],
    projects=[{"name": "API", "description": "Python FastAPI service"}],
    total_experience_years=3,
)


class FakeStorage:
    def __init__(self) -> None:
        self.files: dict[str, bytes] = {}

    def upload(self, path: str, content: bytes, _: str) -> None:
        self.files[path] = content

    def download(self, path: str) -> bytes:
        return self.files[path]


@pytest.fixture
def ai_calls(monkeypatch: pytest.MonkeyPatch) -> dict[str, int]:
    """Replace the hosted services; everything between them runs for real."""
    calls = {"extract": 0, "evaluate": 0}

    def extract(_: str) -> ResumeData:
        calls["extract"] += 1
        return RESUME

    def evaluate(*_: Any) -> AIEvaluation:
        calls["evaluate"] += 1
        return AIEvaluation(
            ai_score=80, summary="Good fit.", strengths=["APIs"], recommendation="Recommended"
        )

    storage = FakeStorage()
    monkeypatch.setattr(ai_service, "extract_resume", extract)
    monkeypatch.setattr(ai_service, "evaluate_candidate", evaluate)
    monkeypatch.setattr(ai_service, "extract_job_requirements", lambda _: JobRequirements())
    monkeypatch.setattr(storage_service, "upload", storage.upload)
    monkeypatch.setattr(storage_service, "download", storage.download)
    monkeypatch.setattr(storage_service, "remove", lambda _: None)
    monkeypatch.setattr(storage_service, "signed_url", lambda path: f"http://signed/{path}")
    return calls


def create_job(client: TestClient) -> dict[str, Any]:
    response = client.post("/api/jobs", json=JOB)
    assert response.status_code == 201
    return response.json()["data"]


def upload(client: TestClient, job_id: str, content: bytes | None = None, name: str = "cv.pdf"):
    return client.post(
        "/api/resumes/upload",
        data={"job_id": job_id},
        files={"file": (name, io.BytesIO(content or PDF), "application/pdf")},
    )


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_requests_without_token_are_rejected() -> None:
    app.dependency_overrides.clear()
    response = TestClient(app).get("/api/jobs")
    assert response.status_code == 401
    assert response.json() == {"success": False, "message": "Please log in to continue."}


def test_job_validation_errors_use_the_error_format(client: TestClient, ai_calls: Any) -> None:
    response = client.post("/api/jobs", json={**JOB, "required_skills": []})
    assert response.status_code == 422
    assert response.json()["success"] is False
    assert "required_skills" in response.json()["message"]


def test_job_crud_with_search_and_pagination(client: TestClient, ai_calls: Any) -> None:
    job = create_job(client)
    assert client.get(f"/api/jobs/{job['id']}").json()["data"]["title"] == JOB["title"]

    listed = client.get("/api/jobs", params={"search": "backend"}).json()["data"]
    assert listed["total"] == 1
    assert listed["page_size"] == 20
    assert client.get("/api/jobs", params={"search": "nurse"}).json()["data"]["total"] == 0

    closed = client.put(f"/api/jobs/{job['id']}", json={"status": "Closed"})
    assert closed.json()["data"]["status"] == "Closed"

    assert client.delete(f"/api/jobs/{job['id']}").status_code == 200
    assert client.get(f"/api/jobs/{job['id']}").status_code == 404


def test_job_survives_ai_failure_and_scores_against_form_fields(
    client: TestClient, ai_calls: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fail(_: str) -> JobRequirements:
        raise AIServiceError("down")

    monkeypatch.setattr(ai_service, "extract_job_requirements", fail)
    job = create_job(client)
    assert job["structured_requirements"] is None

    upload(client, job["id"])
    item = client.get(f"/api/screening/{job['id']}").json()["data"]["items"][0]
    assert item["screening"]["missing_skills"] == ["REST API"]


def test_full_pipeline_from_upload_to_export(client: TestClient, ai_calls: Any) -> None:
    job = create_job(client)
    uploaded = upload(client, job["id"])
    assert uploaded.status_code == 202

    resume_url = f"/api/resumes/{uploaded.json()['data']['id']}"
    resume = client.get(resume_url).json()["data"]
    assert resume["processing_status"] == "completed"
    assert resume["download_url"] is None
    signed = client.get(resume_url, params={"download": True}).json()["data"]
    assert signed["download_url"].startswith("http://signed/")

    item = client.get(f"/api/screening/{job['id']}").json()["data"]["items"][0]
    screening = item["screening"]
    assert item["rank"] == 1
    assert item["candidate_name"] == "Asha Rao"
    assert screening["skills_score"] == 80
    assert screening["experience_score"] == 100
    assert screening["ai_score"] == 80
    assert screening["matched_skills"] == ["Python", "FastAPI", "PostgreSQL", "Git"]
    assert screening["missing_skills"] == ["REST API"]
    assert screening["recommendation"] == "Recommended"
    assert 0 < screening["overall_score"] <= 100

    candidates = client.get("/api/candidates", params={"search": "fastapi"}).json()["data"]
    assert candidates["total"] == 1
    assert client.get("/api/candidates", params={"search": "cobol"}).json()["data"]["total"] == 0

    detail = client.get(f"/api/candidates/{item['candidate_id']}").json()["data"]
    assert detail["skills"] == RESUME.skills
    assert detail["applications"][0]["screening"]["category"] == screening["category"]

    patched = client.patch(
        f"/api/applications/{item['application_id']}/status", json={"status": "Shortlisted"}
    )
    assert patched.status_code == 200

    stats = client.get("/api/dashboard/stats").json()["data"]
    assert stats["active_jobs"] == 1
    assert stats["total_candidates"] == 1
    assert stats["shortlisted"] == 1
    assert stats["average_score"] == screening["overall_score"]
    assert stats["top_candidates"][0]["candidate_name"] == "Asha Rao"
    assert stats["recent_jobs"][0]["shortlisted_count"] == 1

    exported = client.get(f"/api/jobs/{job['id']}/export")
    assert exported.headers["content-type"].startswith("text/csv")
    assert exported.text.splitlines()[0].startswith("Candidate Name,Email,Job,Overall Score")
    assert "Asha Rao,asha@example.com,Backend Developer" in exported.text
    assert "Shortlisted" in exported.text


def test_status_filter_rejects_unknown_values(client: TestClient, ai_calls: Any) -> None:
    assert client.get("/api/screening", params={"status": "Banana"}).status_code == 422


def test_screening_filters(client: TestClient, ai_calls: Any) -> None:
    job = create_job(client)
    upload(client, job["id"])

    def total(**params: Any) -> int:
        return client.get("/api/screening", params=params).json()["data"]["total"]

    assert total() == 1
    assert total(skill="python") == 1
    assert total(skill="cobol") == 0
    assert total(min_experience=3) == 1
    assert total(min_experience=4) == 0
    assert total(min_score=99) == 0
    assert total(status="Hired") == 0


def test_invalid_uploads_are_rejected(client: TestClient, ai_calls: Any) -> None:
    job = create_job(client)
    assert upload(client, job["id"], b"MZ", name="virus.exe").status_code == 400
    assert upload(client, job["id"], b"plain text", name="cv.pdf").status_code == 400
    oversized = b"%PDF" + b"0" * (6 * 1024 * 1024)
    assert upload(client, job["id"], oversized).status_code == 400
    assert ai_calls["extract"] == 0


def test_corrupted_pdf_is_marked_failed_with_a_reason(client: TestClient, ai_calls: Any) -> None:
    job = create_job(client)
    uploaded = upload(client, job["id"], b"%PDF-1.7 not actually a pdf").json()["data"]

    resume = client.get(f"/api/resumes/{uploaded['id']}").json()["data"]
    assert resume["processing_status"] == "failed"
    assert "corrupted" in resume["error_message"]

    detail = client.get(f"/api/jobs/{job['id']}").json()["data"]
    assert detail["failed_resumes"][0]["file_name"] == "cv.pdf"


def test_same_file_is_not_uploaded_twice_for_a_job(client: TestClient, ai_calls: Any) -> None:
    job = create_job(client)
    upload(client, job["id"])
    duplicate = upload(client, job["id"])
    assert duplicate.status_code == 400
    assert "already been uploaded" in duplicate.json()["message"]


def test_same_file_for_another_job_reuses_extraction(client: TestClient, ai_calls: Any) -> None:
    upload(client, create_job(client)["id"])
    upload(client, create_job(client)["id"])
    assert ai_calls["extract"] == 1
    assert ai_calls["evaluate"] == 2
    # One person, two applications.
    assert client.get("/api/candidates").json()["data"]["total"] == 1
    assert client.get("/api/screening").json()["data"]["total"] == 2


def test_rerun_retries_failures_without_repeating_extraction(
    client: TestClient, ai_calls: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fail(*_: Any) -> AIEvaluation:
        raise AIServiceError("The AI service is unavailable right now.")

    working_evaluate = ai_service.evaluate_candidate
    monkeypatch.setattr(ai_service, "evaluate_candidate", fail)
    job = create_job(client)
    upload(client, job["id"])
    assert len(client.get(f"/api/jobs/{job['id']}").json()["data"]["failed_resumes"]) == 1

    monkeypatch.setattr(ai_service, "evaluate_candidate", working_evaluate)
    run = client.post(f"/api/screening/{job['id']}")
    assert run.status_code == 202
    assert run.json()["data"]["queued"] == 1

    assert client.get(f"/api/jobs/{job['id']}").json()["data"]["failed_resumes"] == []
    assert ai_calls["extract"] == 1


def test_rerun_retries_resumes_interrupted_by_a_restart(
    client: TestClient, ai_calls: Any, session_factory: sessionmaker[Session]
) -> None:
    job = create_job(client)
    uploaded = upload(client, job["id"]).json()["data"]
    with session_factory() as db:
        resume = db.get(Resume, uuid.UUID(uploaded["id"]))
        assert resume is not None
        resume.processing_status = "processing"
        db.commit()

    assert client.post(f"/api/screening/{job['id']}").json()["data"]["queued"] == 1
    assert client.get(f"/api/jobs/{job['id']}").json()["data"]["processing_count"] == 0


def test_recruiters_cannot_reach_each_others_data(
    client: TestClient, ai_calls: Any, other_recruiter: Profile
) -> None:
    job = create_job(client)
    uploaded = upload(client, job["id"]).json()["data"]
    item = client.get(f"/api/screening/{job['id']}").json()["data"]["items"][0]

    app.dependency_overrides[get_current_profile] = lambda: other_recruiter

    assert client.get("/api/jobs").json()["data"]["total"] == 0
    assert client.get("/api/candidates").json()["data"]["total"] == 0
    assert client.get("/api/screening").json()["data"]["total"] == 0
    assert client.get("/api/dashboard/stats").json()["data"]["total_candidates"] == 0
    assert client.get(f"/api/jobs/{job['id']}").status_code == 404
    assert client.get(f"/api/jobs/{job['id']}/export").status_code == 404
    assert client.delete(f"/api/jobs/{job['id']}").status_code == 404
    assert client.get(f"/api/resumes/{uploaded['id']}").status_code == 404
    assert client.get(f"/api/candidates/{item['candidate_id']}").status_code == 404
    assert client.get(f"/api/screening/candidate/{item['candidate_id']}").status_code == 404
    assert upload(client, job["id"]).status_code == 404
    assert (
        client.patch(
            f"/api/applications/{item['application_id']}/status", json={"status": "Hired"}
        ).status_code
        == 404
    )


def test_deleting_a_job_removes_candidates_left_without_applications(
    client: TestClient, ai_calls: Any
) -> None:
    job = create_job(client)
    upload(client, job["id"])
    client.delete(f"/api/jobs/{job['id']}")
    stats = client.get("/api/dashboard/stats").json()["data"]
    assert stats["total_candidates"] == 0


def test_csv_export_neutralizes_spreadsheet_formulas(
    client: TestClient, ai_calls: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    hostile = RESUME.model_copy(update={"name": '=HYPERLINK("http://evil.test")'})
    monkeypatch.setattr(ai_service, "extract_resume", lambda _: hostile)
    job = create_job(client)
    upload(client, job["id"])
    assert "'=HYPERLINK" in client.get(f"/api/jobs/{job['id']}/export").text


def test_candidate_with_no_email_falls_back_to_file_name(
    client: TestClient, ai_calls: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(ai_service, "extract_resume", lambda _: ResumeData(skills=["Python"]))
    job = create_job(client)
    upload(client, job["id"], name="jane-doe.pdf")
    item = client.get(f"/api/screening/{job['id']}").json()["data"]["items"][0]
    assert item["candidate_name"] == "jane-doe"


def test_in_progress_set_is_cleared_after_processing(client: TestClient, ai_calls: Any) -> None:
    upload(client, create_job(client)["id"])
    assert not screening_service._in_progress
