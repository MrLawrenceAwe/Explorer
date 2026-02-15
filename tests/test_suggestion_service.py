from __future__ import annotations

import asyncio

from backend.db import (
    Base,
    Report,
    ReportStatus,
    SavedTopic,
    User,
    create_engine_from_url,
    create_session_factory,
    session_scope,
)
from backend.schemas import SuggestionsRequest
from backend.services.suggestion_service import SuggestionService


class _StubSuggestionClient:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    async def call_text_async(self, model_spec, system_prompt, user_prompt, style_hint=None):
        self.calls.append((model_spec.model, system_prompt, user_prompt))
        response = self._responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def _session_factory():
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    return create_session_factory(engine)


def test_load_report_headings_collects_all_subsections():
    session_factory = _session_factory()
    with session_scope(session_factory) as session:
        user = User(email="seed@example.com", full_name="Seeder", username="Seeder")
        session.add(user)
        session.flush()
        topic = SavedTopic(slug="topic", title="Topic", owner=user)
        session.add(topic)
        session.flush()
        report = Report(
            saved_topic=topic,
            owner=user,
            status=ReportStatus.COMPLETE,
            sections={
                "outline": {
                    "sections": [
                        {"title": "Section One", "subsections": ["First A", "First B"]},
                        {"title": "Section Two", "subsections": ["Second A"]},
                    ]
                }
            },
        )
        session.add(report)

    service = SuggestionService(text_client=object(), session_factory=session_factory)
    request = SuggestionsRequest.model_validate({"include_report_headings": True})

    seeds = service._collect_seeds(request)

    assert "Section One" in seeds
    assert "Section Two" in seeds
    assert "First A" in seeds
    assert "First B" in seeds
    assert "Second A" in seeds


def test_generate_with_free_roam_merges_sources():
    client = _StubSuggestionClient(
        [
            '{"suggestions":[{"title":"AI Safety"},{"title":"Model Evaluation"}]}',
            '{"suggestions":[{"title":"AI Safety"},{"title":"Synthetic Data Governance"}]}',
        ]
    )
    service = SuggestionService(text_client=client, session_factory=None)
    request = SuggestionsRequest.model_validate(
        {
            "topic": "AI",
            "enable_free_roam": True,
            "max_suggestions": 4,
            "model": {"model": "test-model"},
        }
    )

    response = asyncio.run(service.generate(request))

    assert [item.title for item in response.suggestions] == [
        "AI Safety",
        "Model Evaluation",
        "Synthetic Data Governance",
    ]
    assert [item.source for item in response.suggestions] == [
        "guided",
        "guided",
        "free_roam",
    ]
    assert len(client.calls) == 2


def test_generate_keeps_guided_results_when_free_roam_fails():
    client = _StubSuggestionClient(
        [
            '{"suggestions":[{"title":"AI Safety"},{"title":"Model Evaluation"}]}',
            RuntimeError("free roam unavailable"),
        ]
    )
    service = SuggestionService(text_client=client, session_factory=None)
    request = SuggestionsRequest.model_validate(
        {
            "topic": "AI",
            "enable_free_roam": True,
            "max_suggestions": 4,
            "model": {"model": "test-model"},
        }
    )

    response = asyncio.run(service.generate(request))

    assert [item.title for item in response.suggestions] == [
        "AI Safety",
        "Model Evaluation",
    ]
    assert [item.source for item in response.suggestions] == [
        "guided",
        "guided",
    ]
    assert len(client.calls) == 2
