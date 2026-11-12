"""
Tests for the ``entity_changed`` realtime broadcast (``uniback.utils.realtime``).

Pages such as the plants map refresh live when the assistant (or anyone) writes
to an entity. The contract they rely on: one event per entity, emitted only
after the ROOT commit (never after a savepoint or a rollback), carrying the
affected ids and no data.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from uniback.utils import realtime


@pytest.fixture
def dispatched(test_app, monkeypatch):
    """Install the broadcast on the test session factory and capture what it
    would publish instead of sending it to Redis."""
    _, session_manager, _ = test_app
    events: list[dict] = []
    monkeypatch.setattr(realtime, "_dispatch_entity_changes", events.append)
    realtime.install_entity_change_broadcast(session_manager.session_factory)
    return events


@pytest.fixture
def db(test_app):
    _, session_manager, _ = test_app
    session = session_manager.get_session()
    try:
        yield session
    finally:
        session.close()


def _plants(events: list[dict]) -> list[dict]:
    return [e["plants"] for e in events if "plants" in e]


# -------------------------------------------------------------------- session


def test_commit_emits_created_updated_deleted(dispatched, db):
    from plants.models import Plant

    plant = Plant(name="Drago joven", latitude=28.1, longitude=-15.4)
    db.add(plant)
    db.commit()
    assert _plants(dispatched) == [{"created": [plant.id], "updated": [], "deleted": []}]

    plant.notes = "regado"
    db.commit()
    assert _plants(dispatched)[-1] == {"created": [], "updated": [plant.id], "deleted": []}

    plant_id = plant.id
    db.delete(plant)
    db.commit()
    assert _plants(dispatched)[-1] == {"created": [], "updated": [], "deleted": [plant_id]}


def test_rollback_emits_nothing(dispatched, db):
    from plants.models import Plant

    db.add(Plant(name="Descartada"))
    db.flush()
    db.rollback()
    db.commit()  # the discarded flush must not leak into a later commit
    assert _plants(dispatched) == []


def test_savepoint_commit_waits_for_root_commit(dispatched, db):
    from plants.models import Plant

    savepoint = db.begin_nested()
    db.add(Plant(name="En savepoint"))
    savepoint.commit()
    assert _plants(dispatched) == []

    db.commit()
    assert len(_plants(dispatched)) == 1


# ---------------------------------------------------------------------- API


def test_bulk_endpoint_emits_once_after_commit(dispatched, logged_in_client: TestClient):
    """The assistant's confirm path: ``POST /plants/bulk`` in partial mode."""
    dispatched.clear()
    r = logged_in_client.post("/api/plants/bulk", json=[
        {"data": {"name": "IA 1", "latitude": 28.0, "longitude": -15.5}},
        {"data": {"name": "IA roto", "latitude": "no-es-un-numero"}},
        {"data": {"name": "IA 2", "latitude": 28.2, "longitude": -15.6}},
    ])
    assert r.status_code == 200, r.text
    created = [res["id"] for res in r.json()["content"]["results"] if res["ok"]]
    assert len(created) == 2

    events = _plants(dispatched)
    assert len(events) == 1
    assert events[0]["created"] == sorted(created)
