import io

import pymupdf
import pytest
from docx import Document

from app.core.config import MAX_UPLOAD_BYTES
from app.services import resume_parser
from app.services.resume_parser import ResumeParseError, ResumeValidationError
from app.utils.text_cleaner import clean_text

RESUME_TEXT = "Asha Rao\nBackend Developer\nSkills: Python, FastAPI, PostgreSQL, Git and Docker"


def make_pdf(text: str = RESUME_TEXT) -> bytes:
    document = pymupdf.open()
    page = document.new_page()
    page.insert_textbox(pymupdf.Rect(50, 50, 550, 300), text)
    return document.tobytes()


def make_docx(text: str = RESUME_TEXT, table_text: str | None = None) -> bytes:
    document = Document()
    for line in text.split("\n"):
        document.add_paragraph(line)
    if table_text:
        document.add_table(rows=1, cols=1).cell(0, 0).text = table_text
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def test_extracts_text_from_pdf() -> None:
    assert "FastAPI" in resume_parser.extract_text(make_pdf(), "pdf")


def test_extracts_text_from_docx_including_tables() -> None:
    text = resume_parser.extract_text(make_docx(table_text="Kubernetes specialist"), "docx")
    assert "FastAPI" in text
    assert "Kubernetes specialist" in text


def test_rejects_unsupported_extension() -> None:
    with pytest.raises(ResumeValidationError, match="PDF and DOCX"):
        resume_parser.validate_upload("resume.exe", b"MZ")


def test_rejects_file_over_five_megabytes() -> None:
    with pytest.raises(ResumeValidationError, match="5 MB"):
        resume_parser.validate_upload("resume.pdf", b"%PDF" + b"0" * MAX_UPLOAD_BYTES)


def test_rejects_file_whose_content_does_not_match_its_extension() -> None:
    with pytest.raises(ResumeValidationError, match="not a valid PDF"):
        resume_parser.validate_upload("resume.pdf", b"this is not a pdf")


def test_reports_corrupted_pdf() -> None:
    with pytest.raises(ResumeParseError, match="corrupted"):
        resume_parser.extract_text(b"%PDF-1.7 garbage that is not really a pdf", "pdf")


def test_reports_corrupted_docx() -> None:
    with pytest.raises(ResumeParseError, match="corrupted"):
        resume_parser.extract_text(b"PK\x03\x04 truncated", "docx")


def test_reports_resume_without_readable_text() -> None:
    with pytest.raises(ResumeParseError, match="No readable text"):
        resume_parser.extract_text(make_pdf(" "), "pdf")


def test_clean_text_normalizes_whitespace_and_decoration() -> None:
    cleaned = clean_text("Name\x00   Here\r\n\r\n\r\n\r\n-----------\nSkills:\t\tPython   ")
    assert cleaned == "Name Here\n\nSkills: Python"
