from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from backend.api.dependencies import get_session_factory
from backend.db import SavedTopic, Report, session_scope
from backend.schemas import SavedTopicResponse, CreateSavedTopicRequest, UpdateSavedTopicRequest
from backend.utils.api_helpers import (
    normalize_user,
    resolve_topic_title,
)
from backend.utils.saved_topics import (
    get_or_create_saved_topic,
    validate_collection_for_user,
)
from backend.utils.user_utils import get_or_create_user, get_user_by_email

router = APIRouter()

@router.get("/saved_topics", response_model=List[SavedTopicResponse])
def list_saved_topics(
    user_email: Optional[EmailStr] = Query(
        None,
        description="Optional email used to scope results; defaults to EXPLORER_DEFAULT_USER_EMAIL.",
    ),
    username: Optional[str] = Query(None, description="Optional username stored when creating the user record."),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    user_email, username = normalize_user(user_email, username)
    with session_scope(session_factory) as session:
        user = get_user_by_email(session, user_email)
        if not user:
            return []
        topics = session.scalars(
            select(SavedTopic)
            .where(
                SavedTopic.owner_user_id == user.id,
                SavedTopic.is_deleted.is_(False),
            )
            .order_by(SavedTopic.created_at.desc())
        ).all()
        return [
            SavedTopicResponse(
                id=topic.id,
                title=topic.title,
                slug=topic.slug,
                collection_id=topic.collection_id,
                created_at=topic.created_at.isoformat(),
            )
            for topic in topics
        ]


@router.post("/saved_topics", response_model=SavedTopicResponse, status_code=status.HTTP_201_CREATED)
def create_saved_topic(
    payload: CreateSavedTopicRequest,
    user_email: Optional[EmailStr] = Query(
        None,
        description="Optional email used to scope the new topic; defaults to EXPLORER_DEFAULT_USER_EMAIL.",
    ),
    username: Optional[str] = Query(None, description="Optional username stored when creating the user record."),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    user_email, username = normalize_user(user_email, username)
    title = resolve_topic_title(payload.title)
    with session_scope(session_factory) as session:
        user = get_or_create_user(session, user_email, username)
        collection_id = payload.collection_id
        if collection_id is not None:
            collection_id = validate_collection_for_user(session, user.id, collection_id)

        topic = get_or_create_saved_topic(
            session,
            user,
            title,
            collection_id=collection_id,
            update_existing_collection=payload.collection_id is not None,
        )
        return SavedTopicResponse(
            id=topic.id,
            title=topic.title,
            slug=topic.slug,
            collection_id=topic.collection_id,
            created_at=topic.created_at.isoformat(),
        )


@router.delete("/saved_topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_topic(
    topic_id: uuid.UUID,
    user_email: Optional[EmailStr] = Query(
        None,
        description="Optional email used to scope the delete; defaults to EXPLORER_DEFAULT_USER_EMAIL.",
    ),
    username: Optional[str] = Query(None, description="Optional username stored when creating the user record."),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    user_email, username = normalize_user(user_email, username)
    with session_scope(session_factory) as session:
        user = get_user_by_email(session, user_email)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved topic not found.")
        topic = session.get(SavedTopic, topic_id)
        if not topic or topic.owner_user_id != user.id or topic.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved topic not found.")
        topic.is_deleted = True
        reports = session.scalars(
            select(Report).where(
                Report.saved_topic_id == topic.id,
                Report.owner_user_id == user.id,
                Report.is_deleted.is_(False),
            )
        ).all()
        for report in reports:
            report.is_deleted = True


@router.patch("/saved_topics/{topic_id}", response_model=SavedTopicResponse)
def update_saved_topic(
    topic_id: uuid.UUID,
    payload: UpdateSavedTopicRequest,
    user_email: Optional[EmailStr] = Query(
        None,
        description="Optional email used to scope the update; defaults to EXPLORER_DEFAULT_USER_EMAIL.",
    ),
    username: Optional[str] = Query(None, description="Optional username stored when creating the user record."),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    """Update a saved topic (e.g., move to a different collection)."""
    user_email, username = normalize_user(user_email, username)
    with session_scope(session_factory) as session:
        user = get_user_by_email(session, user_email)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved topic not found.")
        topic = session.get(SavedTopic, topic_id)
        if not topic or topic.owner_user_id != user.id or topic.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved topic not found.")
        
        # Update collection_id
        if "collection_id" in payload.model_fields_set:
            if payload.collection_id is not None:
                topic.collection_id = validate_collection_for_user(
                    session, user.id, payload.collection_id
                )
            else:
                # Explicitly set to None (move to uncategorized)
                topic.collection_id = None
        
        session.flush()
        return SavedTopicResponse(
            id=topic.id,
            title=topic.title,
            slug=topic.slug,
            collection_id=topic.collection_id,
            created_at=topic.created_at.isoformat(),
        )
