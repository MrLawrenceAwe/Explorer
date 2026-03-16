from __future__ import annotations

import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import SavedTopic, TopicCollection, User
from backend.utils.slug_utils import slugify


def validate_collection_for_user(
    session: Session, user_id: uuid.UUID, collection_id: uuid.UUID
) -> uuid.UUID:
    collection = session.get(TopicCollection, collection_id)
    if not collection or collection.owner_user_id != user_id or collection.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid collection.",
        )
    return collection_id


def get_or_create_saved_topic(
    session: Session,
    user: User,
    title: str,
    *,
    collection_id: Optional[uuid.UUID] = None,
    update_existing_collection: bool = False,
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
        if update_existing_collection:
            existing_topic.collection_id = collection_id
        return existing_topic

    topic = SavedTopic(
        slug=_find_available_slug(session, title),
        title=title,
        owner=user,
        collection_id=collection_id,
    )
    session.add(topic)
    session.flush()
    return topic


def _find_available_slug(session: Session, title: str) -> str:
    base_slug = slugify(title)
    candidate = base_slug
    attempt = 0

    while True:
        conflict = session.scalar(select(SavedTopic).where(SavedTopic.slug == candidate))
        if conflict is None:
            return candidate
        attempt += 1
        candidate = f"{base_slug}-{attempt}"
