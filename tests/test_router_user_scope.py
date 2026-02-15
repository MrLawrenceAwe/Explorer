from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func, select

from backend.api.routers.collections import list_collections
from backend.api.routers.reports import list_reports
from backend.api.routers.topics import create_saved_topic, list_saved_topics
from backend.db import (
    Base,
    SavedTopic,
    TopicCollection,
    User,
    create_engine_from_url,
    create_session_factory,
    session_scope,
)
from backend.schemas import CreateSavedTopicRequest


def _session_factory():
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    return create_session_factory(engine)


def _count_users(session_factory) -> int:
    with session_scope(session_factory) as session:
        return session.scalar(select(func.count(User.id))) or 0


def test_read_endpoints_do_not_create_missing_users():
    session_factory = _session_factory()
    assert _count_users(session_factory) == 0

    reports = list_reports(
        user_email="missing@example.com",
        username="Missing",
        include_content=False,
        session_factory=session_factory,
        report_store=None,
    )
    topics = list_saved_topics(
        user_email="missing@example.com",
        username="Missing",
        session_factory=session_factory,
    )
    collections = list_collections(
        user_email="missing@example.com",
        username="Missing",
        session_factory=session_factory,
    )

    assert reports == []
    assert topics == []
    assert collections == []
    assert _count_users(session_factory) == 0


def test_create_saved_topic_rejects_foreign_collection_for_existing_topic():
    session_factory = _session_factory()
    with session_scope(session_factory) as session:
        user_b = User(email="b@example.com", full_name="B", username="B")
        session.add(user_b)
        session.flush()
        foreign_collection = TopicCollection(name="B Collection", owner=user_b)
        session.add(foreign_collection)
        session.flush()
        foreign_collection_id = foreign_collection.id

    create_saved_topic(
        payload=CreateSavedTopicRequest(title="Shared Topic"),
        user_email="a@example.com",
        username="A",
        session_factory=session_factory,
    )

    try:
        create_saved_topic(
            payload=CreateSavedTopicRequest(
                title="Shared Topic", collection_id=foreign_collection_id
            ),
            user_email="a@example.com",
            username="A",
            session_factory=session_factory,
        )
        raise AssertionError("Expected HTTPException for invalid collection ownership")
    except HTTPException as exception:
        assert exception.status_code == 400

    with session_scope(session_factory) as session:
        user_a = session.scalar(select(User).where(User.email == "a@example.com"))
        assert user_a is not None
        topic = session.scalar(
            select(SavedTopic).where(
                SavedTopic.owner_user_id == user_a.id,
                SavedTopic.title == "Shared Topic",
            )
        )
        assert topic is not None
        assert topic.collection_id is None
