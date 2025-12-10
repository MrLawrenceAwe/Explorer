"""API endpoints for topic collections (folders)."""

from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import EmailStr
from sqlalchemy import select, func
from sqlalchemy.orm import Session, sessionmaker

from backend.api.dependencies import get_session_factory
from backend.db import SavedTopic, TopicCollection, session_scope
from backend.schemas import (
    TopicCollectionResponse,
    CreateTopicCollectionRequest,
    UpdateTopicCollectionRequest,
)
from backend.utils.api_helpers import normalize_user, get_or_create_user

router = APIRouter()


def _build_collection_response(
    collection: TopicCollection, topic_count: int = 0
) -> TopicCollectionResponse:
    return TopicCollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        position=collection.position,
        topic_count=topic_count,
        created_at=collection.created_at.isoformat(),
    )


@router.get("/collections", response_model=List[TopicCollectionResponse])
def list_collections(
    user_email: EmailStr = Query(..., description="Email used to scope results to the current user."),
    username: Optional[str] = Query(None, description="Optional username stored when creating the user record."),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    """List all topic collections for the current user."""
    user_email, username = normalize_user(user_email, username)
    with session_scope(session_factory) as session:
        user = get_or_create_user(session, user_email, username)
        
        # Query collections with topic counts
        collections = session.scalars(
            select(TopicCollection)
            .where(
                TopicCollection.owner_user_id == user.id,
                TopicCollection.is_deleted.is_(False),
            )
            .order_by(TopicCollection.position, TopicCollection.created_at.desc())
        ).all()
        
        # Get topic counts for each collection
        count_query = (
            select(SavedTopic.collection_id, func.count(SavedTopic.id))
            .where(
                SavedTopic.owner_user_id == user.id,
                SavedTopic.is_deleted.is_(False),
                SavedTopic.collection_id.isnot(None),
            )
            .group_by(SavedTopic.collection_id)
        )
        counts = {row[0]: row[1] for row in session.execute(count_query).all()}
        
        return [
            _build_collection_response(c, counts.get(c.id, 0))
            for c in collections
        ]


@router.post("/collections", response_model=TopicCollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(
    payload: CreateTopicCollectionRequest,
    user_email: EmailStr = Query(..., description="Email used to scope the new collection to the current user."),
    username: Optional[str] = Query(None, description="Optional username stored when creating the user record."),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    """Create a new topic collection."""
    user_email, username = normalize_user(user_email, username)
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Collection name is required.")
    
    with session_scope(session_factory) as session:
        user = get_or_create_user(session, user_email, username)
        
        # Check for duplicate name
        existing = session.scalar(
            select(TopicCollection).where(
                TopicCollection.owner_user_id == user.id,
                TopicCollection.name == name,
            )
        )
        if existing and not existing.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A collection named '{name}' already exists."
            )
        
        # Get max position to place new collection at the end
        max_position = session.scalar(
            select(func.max(TopicCollection.position)).where(
                TopicCollection.owner_user_id == user.id,
                TopicCollection.is_deleted.is_(False),
            )
        ) or 0

        if existing and existing.is_deleted:
            existing.is_deleted = False
            existing.description = (payload.description or "").strip() or None
            existing.color = (payload.color or "").strip() or None
            existing.icon = (payload.icon or "").strip() or None
            existing.position = max_position + 1
            session.flush()
            return _build_collection_response(existing, 0)
        
        collection = TopicCollection(
            name=name,
            description=(payload.description or "").strip() or None,
            color=(payload.color or "").strip() or None,
            icon=(payload.icon or "").strip() or None,
            position=max_position + 1,
            owner=user,
        )
        session.add(collection)
        session.flush()
        return _build_collection_response(collection, 0)


@router.get("/collections/{collection_id}", response_model=TopicCollectionResponse)
def get_collection(
    collection_id: uuid.UUID,
    user_email: EmailStr = Query(..., description="Email used to scope the request to the current user."),
    username: Optional[str] = Query(None, description="Optional username stored when creating the user record."),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    """Get a specific topic collection."""
    user_email, username = normalize_user(user_email, username)
    with session_scope(session_factory) as session:
        user = get_or_create_user(session, user_email, username)
        collection = session.get(TopicCollection, collection_id)
        if not collection or collection.owner_user_id != user.id or collection.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
        
        topic_count = session.scalar(
            select(func.count(SavedTopic.id)).where(
                SavedTopic.collection_id == collection.id,
                SavedTopic.is_deleted.is_(False),
            )
        ) or 0
        
        return _build_collection_response(collection, topic_count)


@router.patch("/collections/{collection_id}", response_model=TopicCollectionResponse)
def update_collection(
    collection_id: uuid.UUID,
    payload: UpdateTopicCollectionRequest,
    user_email: EmailStr = Query(..., description="Email used to scope the update to the current user."),
    username: Optional[str] = Query(None, description="Optional username stored when creating the user record."),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    """Update a topic collection."""
    user_email, username = normalize_user(user_email, username)
    with session_scope(session_factory) as session:
        user = get_or_create_user(session, user_email, username)
        collection = session.get(TopicCollection, collection_id)
        if not collection or collection.owner_user_id != user.id or collection.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
        
        if payload.name is not None:
            name = payload.name.strip()
            if not name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Collection name cannot be empty.")
            # Check for duplicate name (excluding current collection)
            existing = session.scalar(
                select(TopicCollection).where(
                    TopicCollection.owner_user_id == user.id,
                    TopicCollection.name == name,
                    TopicCollection.id != collection_id,
                    TopicCollection.is_deleted.is_(False),
                )
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A collection named '{name}' already exists."
                )
            collection.name = name
        
        if payload.description is not None:
            collection.description = payload.description.strip() or None
        if payload.color is not None:
            collection.color = payload.color.strip() or None
        if payload.icon is not None:
            collection.icon = payload.icon.strip() or None
        if payload.position is not None:
            collection.position = payload.position
        
        session.flush()
        
        topic_count = session.scalar(
            select(func.count(SavedTopic.id)).where(
                SavedTopic.collection_id == collection.id,
                SavedTopic.is_deleted.is_(False),
            )
        ) or 0
        
        return _build_collection_response(collection, topic_count)


@router.delete("/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: uuid.UUID,
    user_email: EmailStr = Query(..., description="Email used to scope the delete to the current user."),
    username: Optional[str] = Query(None, description="Optional username stored when creating the user record."),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    """Delete a topic collection. Topics in this collection will be moved to 'uncategorized'."""
    user_email, username = normalize_user(user_email, username)
    with session_scope(session_factory) as session:
        user = get_or_create_user(session, user_email, username)
        collection = session.get(TopicCollection, collection_id)
        if not collection or collection.owner_user_id != user.id or collection.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
        
        # Move topics to uncategorized (null collection_id)
        topics = session.scalars(
            select(SavedTopic).where(
                SavedTopic.collection_id == collection.id,
                SavedTopic.is_deleted.is_(False),
            )
        ).all()
        for topic in topics:
            topic.collection_id = None
        
        collection.is_deleted = True
