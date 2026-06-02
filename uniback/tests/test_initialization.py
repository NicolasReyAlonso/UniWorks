from __future__ import annotations

from fastapi.testclient import TestClient

from uniback import initialize


def test_initialize_creates_components() -> None:
    config = {
        "database": {"url": "sqlite:///:memory:"},
        "api": {"title": "Test API"},
    }

    orm_base, session_manager, app = initialize(config)

    assert orm_base is not None
    assert session_manager is not None

    session = session_manager.get_session()
    session.close()

    client = TestClient(app)
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"