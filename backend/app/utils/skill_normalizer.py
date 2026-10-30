import re

# Every spelling on the right is treated as the canonical name on the left.
SKILL_ALIASES: dict[str, tuple[str, ...]] = {
    "javascript": ("js", "java script", "ecmascript", "es6"),
    "typescript": ("ts", "type script"),
    "python": ("python3", "py"),
    "postgresql": ("postgres", "postgre sql", "psql", "postgre"),
    "mysql": ("my sql",),
    "mongodb": ("mongo", "mongo db"),
    "node.js": ("node", "nodejs", "node js"),
    "react": ("reactjs", "react.js", "react js"),
    "next.js": ("next", "nextjs", "next js"),
    "vue.js": ("vue", "vuejs", "vue js"),
    "angular": ("angularjs", "angular.js"),
    "express.js": ("express", "expressjs"),
    "fastapi": ("fast api",),
    "rest api": (
        "rest",
        "rest apis",
        "restful",
        "restful api",
        "restful apis",
        "restful services",
        "rest services",
    ),
    "graphql": ("graph ql",),
    "aws": ("amazon web services",),
    "gcp": ("google cloud", "google cloud platform"),
    "azure": ("microsoft azure",),
    "docker": ("docker containers", "containerization"),
    "kubernetes": ("k8s",),
    "ci/cd": ("cicd", "ci cd", "continuous integration"),
    "git": ("github", "gitlab", "version control"),
    "machine learning": ("ml",),
    "deep learning": ("dl",),
    "artificial intelligence": ("ai",),
    "natural language processing": ("nlp",),
    "computer vision": ("cv",),
    "scikit-learn": ("sklearn", "scikit learn"),
    "tensorflow": ("tf", "tensor flow"),
    "pytorch": ("torch",),
    "sql": ("structured query language",),
    "c++": ("cpp",),
    "c#": ("csharp", "c sharp"),
    "golang": ("go",),
}

_ALIAS_TO_CANONICAL = {
    alias: canonical for canonical, aliases in SKILL_ALIASES.items() for alias in aliases
}

# Fine in a skills list, but in free text "go", "rest" or "next" are usually ordinary words.
_AMBIGUOUS_IN_PROSE = {"ai", "cv", "dl", "express", "go", "ml", "next", "node", "py", "rest", "tf"}


def normalize_skill(skill: str) -> str:
    """Reduce a skill to a canonical lowercase form, so "JS" and "JavaScript" compare equal."""
    key = re.sub(r"\s+", " ", skill.strip().lower())
    return _ALIAS_TO_CANONICAL.get(key, key)


def normalize_skills(skills: list[str]) -> set[str]:
    return {normalize_skill(skill) for skill in skills if skill.strip()}


def _phrase_in_text(phrase: str, text: str) -> bool:
    # Lookarounds rather than \b, which would fail on skills ending in symbols like "c++".
    return re.search(rf"(?<![\w+#]){re.escape(phrase)}(?![\w+#])", text) is not None


def term_in_text(term: str, text: str) -> bool:
    """True when a skill or any of its known spellings appears as a whole term in the text."""
    canonical = normalize_skill(term)
    lowered = text.lower()
    aliases = (a for a in SKILL_ALIASES.get(canonical, ()) if a not in _AMBIGUOUS_IN_PROSE)
    return any(_phrase_in_text(spelling, lowered) for spelling in (canonical, *aliases))
