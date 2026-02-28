import uuid
from typing import Any, Dict, List, Optional

from starlette.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session, sessionmaker

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    from mcp.server import FastMCP  # type: ignore

from backend.api.dependencies import (
    get_outline_service,
    get_report_service,
    get_report_store,
    get_session_factory,
    get_suggestion_service,
)
from backend.db import session_scope
from backend.schemas import GenerateRequest, OutlineRequest, SuggestionsRequest
from backend.utils.api_helpers import (
    build_report_response,
    get_user_report,
    list_user_reports,
    get_user_by_email,
    normalize_user,
    resolve_base_dir,
)


class ReportListRequest(BaseModel):
    user_email: Optional[EmailStr] = Field(
        default=None,
        description=(
            "Optional email used to scope results; defaults to EXPLORER_DEFAULT_USER_EMAIL."
        ),
    )
    username: Optional[str] = Field(
        default=None,
        description="Optional username stored when creating the user record.",
    )
    include_content: bool = Field(
        default=False,
        description="When true, includes report content from storage.",
    )


class ReportGetRequest(BaseModel):
    report_id: uuid.UUID = Field(..., description="Report UUID")
    user_email: Optional[EmailStr] = Field(
        default=None,
        description=(
            "Optional email used to scope results; defaults to EXPLORER_DEFAULT_USER_EMAIL."
        ),
    )
    username: Optional[str] = Field(
        default=None,
        description="Optional username stored when creating the user record.",
    )
    include_content: bool = Field(
        default=True,
        description="When true, includes report content from storage.",
    )


mcp = FastMCP("Explorer MCP")


@mcp.custom_route("/healthz", methods=["GET"], include_in_schema=False)
async def healthz(_request):
    return JSONResponse({"status": "ok"})


@mcp.tool(name="outline.generate", description="Generate an outline from a topic.")
async def outline_generate(request: OutlineRequest) -> Dict[str, Any]:
    service = get_outline_service()
    return await service.handle_outline_request(request)


@mcp.tool(name="suggestions.generate", description="Generate topic suggestions.")
async def suggestions_generate(request: SuggestionsRequest) -> Dict[str, Any]:
    service = get_suggestion_service()
    response = await service.generate(request)
    return response.model_dump()


@mcp.tool(
    name="reports.generate",
    description="Generate a report (returns the full event stream and final payload).",
)
async def reports_generate(request: GenerateRequest) -> Dict[str, Any]:
    service = get_report_service()
    events: List[Dict[str, Any]] = []
    async for event in service.stream_report(request):
        events.append(event)
    final_event = events[-1] if events else None
    return {"events": events, "final": final_event}


@mcp.tool(name="reports.list", description="List reports for the current user.")
def reports_list(request: ReportListRequest) -> List[Dict[str, Any]]:
    session_factory: sessionmaker[Session] = get_session_factory()
    report_store = get_report_store()
    user_email, username = normalize_user(request.user_email, request.username)
    base_dir = resolve_base_dir(report_store)
    with session_scope(session_factory) as session:
        user = get_user_by_email(session, user_email)
        if not user:
            return []
        reports = list_user_reports(session, user.id)
        return [
            build_report_response(report, base_dir, request.include_content).model_dump()
            for report in reports
        ]


@mcp.tool(name="reports.get", description="Fetch a single report by id.")
def reports_get(request: ReportGetRequest) -> Dict[str, Any]:
    session_factory: sessionmaker[Session] = get_session_factory()
    report_store = get_report_store()
    user_email, username = normalize_user(request.user_email, request.username)
    base_dir = resolve_base_dir(report_store)
    with session_scope(session_factory) as session:
        user = get_user_by_email(session, user_email)
        if not user:
            return {"error": "Report not found"}
        report = get_user_report(session, request.report_id, user.id)
        if not report:
            return {"error": "Report not found"}
        return build_report_response(report, base_dir, request.include_content).model_dump()


app = mcp.sse_app()

__all__ = ["app", "mcp"]
