from __future__ import annotations

import re

_SLUG_PATTERN = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    """Normalize a string into a filesystem-safe, lowercase slug."""

    if not isinstance(value, str):
        return "topic"
    candidate = _SLUG_PATTERN.sub("-", value.lower()).strip("-")
    return candidate or "topic"


__all__ = ["slugify"]
