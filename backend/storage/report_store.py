from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import shutil
from typing import Any, Dict, Iterable, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from backend.db import Report, ReportStatus, SavedTopic, User, session_scope
from backend.schemas import GenerateRequest, Outline
from backend.utils.slug_utils import slugify
from backend.utils.user_utils import get_or_create_user
from backend.db.session import create_session_factory_from_env

_DEFAULT_DB_URL = "sqlite:///data/reportgen.db"
_DEFAULT_DB_ENV = "EXPLORER_DATABASE_URL"
_DEFAULT_STORAGE_ENV = "EXPLORER_REPORT_STORAGE_DIR"
_DEFAULT_STORAGE_DIR = "data/reports"
_DEFAULT_USER_EMAIL_ENV = "EXPLORER_DEFAULT_USER_EMAIL"
_SYSTEM_USER_EMAIL = "system@explorer.local"
_SYSTEM_USERNAME = "Explorer System"

_TOPIC_RETRY_LIMIT = 3
_TOPIC_TITLE_MAX_LENGTH = 255
_FALLBACK_REPORT_TITLE = "Explorer Report"



@dataclass(frozen=True)
class StoredReportHandle:
    report_id: uuid.UUID
    owner_user_id: uuid.UUID
    report_dir: Path
    outline_path: Path
    transcript_path: Path


def build_stored_report_handle(
    base_dir: Path,
    owner_path_segment: str,
    report_id: uuid.UUID,
    owner_user_id: uuid.UUID,
) -> StoredReportHandle:
    report_dir = base_dir / owner_path_segment / str(report_id)
    report_dir.mkdir(parents=True, exist_ok=True)
    return StoredReportHandle(
        report_id=report_id,
        owner_user_id=owner_user_id,
        report_dir=report_dir,
        outline_path=report_dir / "outline.json",
        transcript_path=report_dir / "report.md",
    )


def write_outline_snapshot(handle: StoredReportHandle, outline: Outline) -> None:
    handle.outline_path.parent.mkdir(parents=True, exist_ok=True)
    handle.outline_path.write_text(
        json.dumps(outline.model_dump(), indent=2) + "\n",
        encoding="utf-8",
    )


def write_transcript(handle: StoredReportHandle, transcript: str) -> None:
    text = transcript.strip() + "\n"
    handle.transcript_path.parent.mkdir(parents=True, exist_ok=True)
    handle.transcript_path.write_text(text, encoding="utf-8")


class GeneratedReportStore:
    """Persist generated report metadata plus artifacts to disk."""

    def __init__(
        self,
        *,
        base_dir: Optional[Path | str] = None,
        session_factory: Optional[sessionmaker[Session]] = None,
    ) -> None:
        configured_base = base_dir or os.environ.get(_DEFAULT_STORAGE_ENV, _DEFAULT_STORAGE_DIR)
        self.base_dir = Path(configured_base).expanduser().resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._session_factory = session_factory or _create_default_session_factory()
        self._default_user_email = os.environ.get(
            _DEFAULT_USER_EMAIL_ENV,
            _SYSTEM_USER_EMAIL,
        )

    def prepare_report(self, request: GenerateRequest, outline: Outline) -> StoredReportHandle:
        """Create DB rows and disk directories prior to section streaming."""

        topic_title = self._topic_title(request, outline)
        attempt = 0
        while True:
            handle: Optional[StoredReportHandle] = None
            try:
                with session_scope(self._session_factory) as session:
                    user_email = request.user_email or self._default_user_email
                    if request.user_email:
                        username = request.username
                    else:
                        username = request.username or _SYSTEM_USERNAME
                    user = get_or_create_user(
                        session,
                        user_email,
                        username,
                        overwrite_placeholder=True,
                        placeholder_names=(_SYSTEM_USERNAME,),
                    )
                    saved_topic = self._get_or_create_saved_topic(
                        session,
                        user,
                        topic_title,
                        slug_override=self._generate_slug_variant(topic_title, attempt),
                    )
                    report = Report(
                        saved_topic=saved_topic,
                        owner=user,
                        status=ReportStatus.RUNNING,
                        outline_snapshot=outline.model_dump(),
                        sections={"outline": outline.model_dump(), "written": []},
                        generated_started_at=datetime.now(timezone.utc),
                    )
                    session.add(report)
                    session.flush()
                    handle = self._build_report_handle(report.id, user.id)
                self._write_outline_snapshot(handle, outline)
                break
            except IntegrityError as exception:
                if not self._is_slug_unique_violation(exception):
                    raise
                attempt += 1
                if attempt >= _TOPIC_RETRY_LIMIT:
                    raise
                continue
            except Exception as exception:
                if handle is not None:
                    self.discard_report(
                        handle,
                    )
                raise
        return handle

    def finalize_report(
        self,
        handle: StoredReportHandle,
        transcript: str,
        written_sections: Iterable[Dict[str, Any]],
        summary: Optional[str] = None,
    ) -> None:
        """Persist the final transcript and update DB metadata."""

        write_transcript(handle, transcript)
        sections_payload = list(written_sections)
        with session_scope(self._session_factory) as session:
            report = session.get(Report, handle.report_id)
            if not report:
                return
            report.status = ReportStatus.COMPLETE
            if summary:
                report.summary = summary
            report.sections = {"outline": report.outline_snapshot, "written": sections_payload}
            report.content_uri = self._relative_uri(handle.transcript_path)
            report.generated_completed_at = datetime.now(timezone.utc)

    def discard_report(self, handle: StoredReportHandle) -> None:
        """Remove the persisted report row and artifacts when generation fails."""

        self._remove_artifacts(handle)
        with session_scope(self._session_factory) as session:
            report = session.get(Report, handle.report_id)
            if not report:
                return
            session.delete(report)

    def _topic_title(self, request: GenerateRequest, outline: Outline) -> str:
        topic = _normalize_topic_title(request.topic)
        if topic:
            return topic
        outline_title = _normalize_topic_title(outline.report_title)
        if outline_title:
            return outline_title
        return _FALLBACK_REPORT_TITLE

    def _get_or_create_saved_topic(
        self,
        session: Session,
        user: User,
        title: str,
        *,
        slug_override: Optional[str] = None,
    ) -> SavedTopic:
        existing_topic = session.scalar(
            select(SavedTopic).where(
                SavedTopic.owner_user_id == user.id,
                SavedTopic.title == title,
            )
        )
        if existing_topic:
            if existing_topic.is_deleted:
                existing_topic.is_deleted = False
            return existing_topic
        base_slug = slug_override or slugify(title)
        slug = base_slug
        while True:
            existing = session.scalar(select(SavedTopic).where(SavedTopic.slug == slug))
            if existing is None:
                break
            if existing.owner_user_id == user.id:
                return existing
            slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
        topic = SavedTopic(
            slug=slug,
            title=title,
            owner=user,
        )
        session.add(topic)
        session.flush()
        return topic

    def _generate_slug_variant(self, base_title: str, attempt: int) -> str:
        if attempt == 0:
            return slugify(base_title)
        suffix = uuid.uuid4().hex[:6]
        return f"{slugify(base_title)}-{attempt}-{suffix}"

    def _remove_artifacts(self, handle: StoredReportHandle) -> None:
        if handle.report_dir.exists():
            shutil.rmtree(handle.report_dir, ignore_errors=True)

    @staticmethod
    def _is_slug_unique_violation(error: IntegrityError) -> bool:
        orig = getattr(error, "orig", None)
        message = str(orig or error).lower()
        if "unique constraint" not in message and "duplicate key value" not in message:
            return False
        slug_markers = (
            "saved_topics.slug",
            "uq_saved_topics_slug",
            "topics.slug",
            "uq_topics_slug",
        )
        return any(marker in message for marker in slug_markers)

    def _relative_uri(self, path: Path) -> str:
        try:
            return str(path.relative_to(self.base_dir))
        except ValueError:
            return str(path)

    def _build_report_handle(
        self,
        report_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> StoredReportHandle:
        return build_stored_report_handle(
            self.base_dir,
            str(owner_user_id),
            report_id,
            owner_user_id,
        )

    def _write_outline_snapshot(self, handle: StoredReportHandle, outline: Outline) -> None:
        write_outline_snapshot(handle, outline)


def _create_default_session_factory() -> sessionmaker[Session]:
    return create_session_factory_from_env(
        env_var=_DEFAULT_DB_ENV,
        default_url=_DEFAULT_DB_URL,
    )


def _normalize_topic_title(value: Optional[str]) -> str:
    if not isinstance(value, str):
        return ""
    normalized = value.strip()
    if not normalized:
        return ""
    if len(normalized) > _TOPIC_TITLE_MAX_LENGTH:
        normalized = normalized[:_TOPIC_TITLE_MAX_LENGTH]
    return normalized
