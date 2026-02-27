import os
from pathlib import Path
from typing import List, Optional, Tuple
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import Report
from backend.schemas import ReportResponse
from backend.storage import GeneratedReportStore
from backend.utils.slug_utils import slugify
from backend.utils.user_utils import get_or_create_user, get_user_by_email

_DEFAULT_USER_EMAIL_ENV = "EXPLORER_DEFAULT_USER_EMAIL"

def normalize_user(user_email: Optional[str], username: Optional[str]) -> Tuple[str, Optional[str]]:
    fallback_email = os.environ.get(_DEFAULT_USER_EMAIL_ENV, "")
    email = (user_email or fallback_email or "").strip()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "user_email is required for this endpoint. Set EXPLORER_DEFAULT_USER_EMAIL "
                "to use a server-side default."
            ),
        )
    normalized_username = (username or "").strip() or None
    return email, normalized_username

def resolve_base_dir(report_store: Optional[GeneratedReportStore]) -> Path:
    if report_store:
        return report_store.base_dir
    configured = os.environ.get("EXPLORER_REPORT_STORAGE_DIR", "data/reports")
    return Path(configured).expanduser().resolve()

def resolve_topic_title(title: str) -> str:
    resolved = (title or "").strip()
    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="title must contain non-whitespace characters.",
        )
    return resolved[:255]

def load_report_content(report: Report, base_dir: Path) -> Optional[str]:
    if not report.content_uri:
        return None
    path = Path(report.content_uri)
    if not path.is_absolute():
        path = base_dir / path
    try:
        if path.exists():
            return path.read_text(encoding="utf-8")
    except Exception:
        return None
    return None


def list_user_reports(session: Session, user_id: uuid.UUID) -> List[Report]:
    return session.scalars(
        select(Report)
        .where(
            Report.owner_user_id == user_id,
            Report.is_deleted.is_(False),
        )
        .order_by(Report.created_at.desc())
    ).all()


def get_user_report(
    session: Session, report_id: uuid.UUID, user_id: uuid.UUID
) -> Optional[Report]:
    report = session.get(Report, report_id)
    if not report or report.owner_user_id != user_id or report.is_deleted:
        return None
    return report


def build_report_response(
    report: Report, base_dir: Path, include_content: bool
) -> ReportResponse:
    return ReportResponse(
        id=report.id,
        topic=report.saved_topic.title if report.saved_topic else "",
        title=(
            (report.outline_snapshot or {}).get("report_title")
            if report.outline_snapshot
            else report.saved_topic.title if report.saved_topic else None
        ),
        status=report.status,
        summary=report.summary,
        content=load_report_content(report, base_dir) if include_content else None,
        created_at=report.created_at.isoformat(),
        updated_at=report.updated_at.isoformat(),
    )
