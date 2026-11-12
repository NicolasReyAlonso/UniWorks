import copy
import os

# The test suite exercises the full application surface (auth + core), so it
# must run as a monolith regardless of any ambient UNIBACK_NODE_TYPE the host
# environment sets (the layered docker-compose images export NODE_TYPE=core,
# which would otherwise unmount the auth router and 404 every logged-in test).
os.environ["UNIBACK_NODE_TYPE"] = "monolith"
# Tests run on SQLite, which cannot execute the PostgreSQL trigger DDL that
# SQLAlchemy-Continuum's native versioning generates.
os.environ["UNIBACK_NATIVE_VERSIONING"] = "false"
# The suite assumes no external identity provider: the docker-compose images
# export real Firebase credentials, which would otherwise make the provider
# list (and token verification) depend on the host environment.
os.environ.pop("UNIBACK_AUTH_FIREBASE_CREDENTIALS_PATH", None)
# Sessions travel in the cookie, so the suite needs no Redis and never writes
# test sessions into a live one.
os.environ["UNIBACK_AUTH_SESSION_STORE"] = "cookie"

import pytest
from fastapi.testclient import TestClient

from uniback import initialize
from uniback.persistence.base import set_table_prefix
from uniback.persistence.session import reset_session_manager


DEFAULT_CONFIG = {
    "database": {
        "url": "sqlite:///:memory:?check_same_thread=False",
        "echo": False,
        "auto_seed": True,
        "pool_recycle": 3600,
    },
    # Realtime broadcast off: tests must not publish to the shared Redis bus
    # (test_entity_events installs it explicitly with a captured dispatcher).
    "api": {"title": "Uniback Test API", "realtime_entity_events": False},
}


@pytest.fixture(autouse=True)
def isolated_node_presence(monkeypatch):
    """Keep the suite off the shared realtime bus.

    Initializing the app starts node heartbeats and a presence watcher against
    Redis; from a test run that would publish fake presence into a live
    deployment and make hot-plug menus depend on whatever nodes happen to be
    up. Tests see every node as alive unless they patch ``node_is_alive``.
    """
    from uniback.utils import realtime

    monkeypatch.setattr(realtime, "start_node_presence", lambda *a, **k: None)
    monkeypatch.setattr(realtime, "start_presence_watcher", lambda *a, **k: None)
    monkeypatch.setattr(realtime, "node_is_alive", lambda node_type: True)


@pytest.fixture(autouse=True)
def cleanup_session_manager():
    """Ensure the global session manager is reset between tests."""

    yield
    reset_session_manager()


@pytest.fixture
def test_config():
    """Return a fresh copy of a minimal test configuration."""

    return copy.deepcopy(DEFAULT_CONFIG)


@pytest.fixture
def test_app(test_config):
    """Initialize the application with an in-memory database for tests."""

    set_table_prefix("ub_")
    orm_base, session_manager, app = initialize(test_config)
    return orm_base, session_manager, app


@pytest.fixture
def client(test_app):
    """Provide a FastAPI test client for the initialized app."""

    _, _, app = test_app
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def logged_in_client(client):
    """Provide a TestClient with an active session for test_user."""
    response = client.put("/api/authn?user=test_user")
    assert response.status_code == 200
    return client
