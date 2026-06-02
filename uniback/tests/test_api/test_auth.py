from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _content(response):
    body = response.json()
    assert "content" in body and "count" in body and "issues" in body, (
        f"Response is not a ResponseEnvelope: {body}"
    )
    return body["content"]


def test_login_logout_test_user(client: TestClient):
    response = client.put("/api/authn?user=test_user")
    assert response.status_code == 200
    content = _content(response)
    assert content["status"] == "success"
    assert content["identity"] == "test_user"

    assert "session" in client.cookies

    response = client.get("/api/authn")
    assert response.status_code == 200
    content = _content(response)
    assert content["status"] == "success"
    assert content["identity"] == "test_user"

    response = client.delete("/api/authn")
    assert response.status_code == 200
    assert _content(response)["status"] == "success"

    response = client.get("/api/authn")
    assert response.status_code in (400, 401)
    body = response.json()
    assert body["content"] is None
    assert any(issue["type"] == "ERROR" for issue in body["issues"])


def test_login_invalid_user(client: TestClient):
    response = client.put("/api/authn?user=non_existent_user")
    assert response.status_code == 200
    assert _content(response)["identity"] == "non_existent_user"


def test_logged_in_client_fixture(logged_in_client: TestClient):
    response = logged_in_client.get("/api/authn")
    assert response.status_code == 200
    assert _content(response)["identity"] == "test_user"
