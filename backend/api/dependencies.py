from functools import lru_cache
import os
from typing import Optional

from sqlalchemy.orm import Session, sessionmaker

from backend.db.session import create_session_factory_from_env
from backend.services.outline_service import OutlineService
from backend.services.report_service import ReportGeneratorService
from backend.services.suggestion_service import SuggestionService
from backend.storage import GeneratedReportStore

@lru_cache
def get_outline_service() -> OutlineService:
    return OutlineService()


@lru_cache
def get_report_store() -> Optional[GeneratedReportStore]:
    if os.environ.get("EXPLORER_DISABLE_STORAGE", "").lower() in {"1", "true", "yes", "on"}:
        return None
    return GeneratedReportStore()


@lru_cache
def get_report_service() -> ReportGeneratorService:
    return ReportGeneratorService(
        outline_service=get_outline_service(),
        report_store=get_report_store(),
    )


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    return create_session_factory_from_env(
        env_var="EXPLORER_DATABASE_URL",
        default_url="sqlite:///data/reportgen.db",
    )


@lru_cache
def get_suggestion_service() -> SuggestionService:
    return SuggestionService()
