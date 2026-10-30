import re
import unicodedata

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
_SPACES = re.compile(r"[^\S\n]+")
_BLANK_LINES = re.compile(r"\n{3,}")
_DECORATION = re.compile(r"^[\s\-_=*•·~.|]{3,}$", re.MULTILINE)


def clean_text(text: str) -> str:
    """Normalize extracted resume text: whitespace, blank lines and non-printing characters."""
    text = unicodedata.normalize("NFKC", text).replace("\r\n", "\n").replace("\r", "\n")
    text = _SPACES.sub(" ", _CONTROL_CHARS.sub(" ", text))
    text = _DECORATION.sub("", text)
    lines = [line.strip() for line in text.split("\n")]
    return _BLANK_LINES.sub("\n\n", "\n".join(lines)).strip()
