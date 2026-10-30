"""Turns an uploaded PDF or DOCX into clean text."""

import io
from pathlib import Path
from zipfile import BadZipFile

import pymupdf
from docx import Document
from docx.opc.exceptions import PackageNotFoundError

from app.core.config import MAX_UPLOAD_BYTES
from app.utils.text_cleaner import clean_text

MIN_RESUME_CHARS = 50

CONTENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class ResumeValidationError(Exception):
    """The upload itself is unacceptable; the message is safe to show the user."""


class ResumeParseError(Exception):
    """The file was accepted but no usable text came out; the message is safe to show the user."""


def validate_upload(file_name: str, content: bytes) -> str:
    """Check extension, size and file signature. Returns the file type ("pdf" or "docx")."""
    file_type = Path(file_name).suffix.lower().lstrip(".")
    if file_type not in CONTENT_TYPES:
        raise ResumeValidationError("Only PDF and DOCX files are supported.")
    if not content:
        raise ResumeValidationError("This file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise ResumeValidationError("Files must be 5 MB or smaller.")

    # The extension is only a claim; the leading bytes show what the file really is.
    signature = b"%PDF" if file_type == "pdf" else b"PK\x03\x04"
    if not content.startswith(signature):
        raise ResumeValidationError(
            f"This file is not a valid {file_type.upper()}. Please check the file and try again."
        )
    return file_type


def _extract_pdf(content: bytes) -> str:
    try:
        with pymupdf.open(stream=content, filetype="pdf") as document:
            return "\n".join(page.get_text() for page in document)
    except (pymupdf.FileDataError, RuntimeError, ValueError) as exc:
        raise ResumeParseError("This PDF appears to be corrupted and could not be read.") from exc


def _extract_docx(content: bytes) -> str:
    try:
        document = Document(io.BytesIO(content))
    except (PackageNotFoundError, BadZipFile, KeyError, ValueError) as exc:
        raise ResumeParseError("This DOCX appears to be corrupted and could not be read.") from exc

    parts = [paragraph.text for paragraph in document.paragraphs]
    # Many resume templates lay their content out in tables.
    for table in document.tables:
        for row in table.rows:
            parts.append(" | ".join(cell.text for cell in row.cells))
    return "\n".join(parts)


def extract_text(content: bytes, file_type: str) -> str:
    raw_text = _extract_pdf(content) if file_type == "pdf" else _extract_docx(content)
    text = clean_text(raw_text)
    if len(text) < MIN_RESUME_CHARS:
        raise ResumeParseError(
            "No readable text was found. Scanned or image-only resumes are not supported."
        )
    return text
