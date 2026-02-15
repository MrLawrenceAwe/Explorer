from __future__ import annotations

from typing import Iterable, Optional, Sequence, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import User

_DEFAULT_PLACEHOLDER_NAMES: Tuple[str, ...] = ("Explorer System",)


def get_or_create_user(
    session: Session,
    user_email: str,
    username: Optional[str],
    *,
    overwrite_placeholder: bool = False,
    placeholder_names: Sequence[str] = _DEFAULT_PLACEHOLDER_NAMES,
) -> User:
    """Fetch a user or create one, with optional placeholder overwrite rules."""

    user = session.scalar(select(User).where(User.email == user_email))
    if user:
        if username:
            if overwrite_placeholder and _is_placeholder(user.full_name, placeholder_names):
                user.full_name = username
            elif not user.full_name:
                user.full_name = username

            if overwrite_placeholder and _is_placeholder(user.username, placeholder_names):
                user.username = username
            elif not user.username:
                user.username = username
        return user

    user = User(email=user_email, full_name=username, username=username)
    session.add(user)
    session.flush()
    return user


def get_user_by_email(session: Session, user_email: str) -> Optional[User]:
    """Fetch a user by email without creating missing rows."""

    return session.scalar(select(User).where(User.email == user_email))


def _is_placeholder(value: Optional[str], placeholders: Iterable[str]) -> bool:
    return (value or "") in set(placeholders)


__all__ = ["get_or_create_user", "get_user_by_email"]
