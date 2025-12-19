from __future__ import annotations

import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from backend.schemas import GenerateRequest, Outline
from backend.utils.slug_utils import slugify

from .report_store import StoredReportHandle

_DEFAULT_STORAGE_ENV = "EXPLORER_REPORT_STORAGE_DIR"
_DEFAULT_STORAGE_DIR = "data/reports"
_DEFAULT_USER_EMAIL_ENV = "EXPLORER_DEFAULT_USER_EMAIL"
_SYSTEM_USER_EMAIL = "system@explorer.local"
_SYSTEM_USERNAME = "Explorer System"


class FileOnlyReportStore:
    """Persist outline + report artifacts to disk without database writes."""

    def __init__(self, *, base_dir: Optional[Path | str] = None) -> None:
        configured_base = base_dir or os.environ.get(_DEFAULT_STORAGE_ENV, _DEFAULT_STORAGE_DIR)
        self.base_dir = Path(configured_base).expanduser().resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._default_user_email = os.environ.get(
            _DEFAULT_USER_EMAIL_ENV,
            _SYSTEM_USER_EMAIL,
        )

    def prepare_report(self, request: GenerateRequest, outline: Outline) -> StoredReportHandle:
        report_id = uuid.uuid4()
        user_email = (request.user_email or self._default_user_email or "").strip()
        user_key = slugify(user_email) if user_email else "default"
        owner_user_id = uuid.uuid5(uuid.NAMESPACE_DNS, user_key)
        handle = self._build_report_handle(report_id, owner_user_id, user_key)
        self._write_outline_snapshot(handle, outline)
        self._write_metadata(handle, request, outline, user_email)
        return handle

    def finalize_report(
        self,
        handle: StoredReportHandle,
        transcript: str,
        written_sections: Iterable[Dict[str, Any]],
        summary: Optional[str] = None,
    ) -> None:
        text = transcript.strip() + "\n"
        handle.transcript_path.parent.mkdir(parents=True, exist_ok=True)
        handle.transcript_path.write_text(text, encoding="utf-8")
        self._update_metadata(handle, summary, list(written_sections))

    def discard_report(self, handle: StoredReportHandle) -> None:
        if handle.report_dir.exists():
            shutil.rmtree(handle.report_dir, ignore_errors=True)

    def _build_report_handle(
        self,
        report_id: uuid.UUID,
        owner_user_id: uuid.UUID,
        user_key: str,
    ) -> StoredReportHandle:
        report_dir = self.base_dir / user_key / str(report_id)
        report_dir.mkdir(parents=True, exist_ok=True)
        return StoredReportHandle(
            report_id=report_id,
            owner_user_id=owner_user_id,
            report_dir=report_dir,
            outline_path=report_dir / "outline.json",
            transcript_path=report_dir / "report.md",
        )

    def _write_outline_snapshot(self, handle: StoredReportHandle, outline: Outline) -> None:
        handle.outline_path.parent.mkdir(parents=True, exist_ok=True)
        handle.outline_path.write_text(
            json.dumps(outline.model_dump(), indent=2) + "\n",
            encoding="utf-8",
        )

    def _write_metadata(
        self,
        handle: StoredReportHandle,
        request: GenerateRequest,
        outline: Outline,
        user_email: str,
    ) -> None:
        payload = {
            "report_id": str(handle.report_id),
            "user_email": user_email or None,
            "username": request.username or _SYSTEM_USERNAME,
            "topic": request.topic,
            "report_title": outline.report_title,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "running",
        }
        self._write_metadata_file(handle, payload)

    def _update_metadata(
        self,
        handle: StoredReportHandle,
        summary: Optional[str],
        written_sections: list[Dict[str, Any]],
    ) -> None:
        metadata = self._read_metadata_file(handle)
        metadata["status"] = "complete"
        metadata["completed_at"] = datetime.now(timezone.utc).isoformat()
        metadata["summary"] = summary
        metadata["sections"] = written_sections
        self._write_metadata_file(handle, metadata)

    def _metadata_path(self, handle: StoredReportHandle) -> Path:
        return handle.report_dir / "metadata.json"

    def _read_metadata_file(self, handle: StoredReportHandle) -> Dict[str, Any]:
        path = self._metadata_path(handle)
        if not path.exists():
            return {}
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def _write_metadata_file(self, handle: StoredReportHandle, payload: Dict[str, Any]) -> None:
        path = self._metadata_path(handle)
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
