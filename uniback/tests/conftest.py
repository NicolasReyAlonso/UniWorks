import copy
import os

# The test suite exercises the full application surface (auth + core), so it
# must run as a monolith regardless of any ambient UNIBACK_NODE_TYPE the host
# environment sets (the layered docker-compose images export NODE_TYPE=core,
# which would otherwise unmount the auth router and 404 every logged-in test).
os.environ["UNIBACK_NODE_TYPE"] = "monolith"

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
    "api": {"title": "Uniback Test API"},
}


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
