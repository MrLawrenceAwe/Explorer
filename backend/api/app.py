import asyncio
import json
import os
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.routers import collections, reports, suggestions, topics

app = FastAPI(title="Explorer", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api"
app.include_router(collections.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(suggestions.router, prefix=api_prefix)
app.include_router(topics.router, prefix=api_prefix)

@app.get("/_routes")
def list_routes():
    return {"paths": [route.path for route in app.routes]}


frontend_dir = Path(__file__).resolve().parents[2] / "frontends" / "web" / "dist"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir), html=True), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(frontend_dir / "index.html")
