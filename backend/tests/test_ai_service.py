import json
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import httpx
import pytest
from groq import BadRequestError, RateLimitError

from app.schemas.resume import ResumeData
from app.services import ai_service
from app.services.ai_service import AIServiceError

REQUEST = httpx.Request("POST", "http://groq.test")


def reply(content: str) -> SimpleNamespace:
    message = SimpleNamespace(content=content)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def rate_limited() -> RateLimitError:
    response = httpx.Response(429, request=REQUEST, headers={"retry-after": "1"})
    return RateLimitError("slow down", response=response, body=None)


def bad_request() -> BadRequestError:
    return BadRequestError("bad", response=httpx.Response(400, request=REQUEST), body=None)


@pytest.fixture
def create(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    client = MagicMock()
    monkeypatch.setattr(ai_service, "_client", lambda: client)
    monkeypatch.setattr(ai_service.time, "sleep", lambda _: None)
    return client.chat.completions.create


def test_parses_reply_wrapped_in_code_fences(create: MagicMock) -> None:
    create.return_value = reply('```json\n{"name": "Asha", "skills": ["Python"]}\n```')
    result = ai_service.extract_resume("resume text")
    assert result.name == "Asha"
    assert result.skills == ["Python"]


def test_retries_after_rate_limit(create: MagicMock) -> None:
    create.side_effect = [rate_limited(), reply('{"name": "Asha"}')]
    assert ai_service.extract_resume("resume text").name == "Asha"
    assert create.call_count == 2


def test_retries_after_invalid_json(create: MagicMock) -> None:
    create.side_effect = [reply("not json"), reply('{"name": "Asha"}')]
    assert ai_service.extract_resume("resume text").name == "Asha"


def test_falls_back_when_json_mode_is_rejected(create: MagicMock) -> None:
    create.side_effect = [bad_request(), reply('{"name": "Asha"}')]
    assert ai_service.extract_resume("resume text").name == "Asha"
    assert "response_format" in create.call_args_list[0].kwargs
    assert "response_format" not in create.call_args_list[1].kwargs


def test_gives_up_with_a_friendly_error(create: MagicMock) -> None:
    create.side_effect = rate_limited()
    with pytest.raises(AIServiceError, match="retry later"):
        ai_service.extract_resume("resume text")
    assert create.call_count == ai_service.MAX_ATTEMPTS


def test_evaluation_never_sees_identity_or_contact_details(create: MagicMock) -> None:
    create.return_value = reply(
        json.dumps({"ai_score": 70, "summary": "ok", "recommendation": "Consider"})
    )
    resume = ResumeData(
        name="Asha Rao",
        email="asha@example.com",
        phone="+91 99999 99999",
        location="Mumbai",
        github_url="https://github.com/asharao",
        skills=["Python"],
    )
    from app.schemas.job import JobRequirements
    from app.schemas.screening import ScoreBreakdown

    breakdown = ScoreBreakdown(
        skills_score=100,
        experience_score=100,
        semantic_score=100,
        projects_score=100,
        education_score=100,
        certifications_score=100,
        matched_skills=[],
        missing_skills=[],
    )
    ai_service.evaluate_candidate(JobRequirements(), resume, breakdown)

    prompt: dict[str, Any] = create.call_args.kwargs["messages"][1]
    for private_value in ("Asha", "asha@example.com", "99999", "Mumbai", "asharao"):
        assert private_value not in prompt["content"]
    assert "Python" in prompt["content"]
