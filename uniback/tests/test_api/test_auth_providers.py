"""Tests for the multi-provider authentication surface.

Covers the provider-discovery endpoint and the built-in ``basic``
(username/password) provider: self-registration, login via the
``Authorization: Basic`` header, and the seeded demo user.
"""
from __future__ import annotations

import base64

from fastapi.testclient import TestClient


def _content(response):
    body = response.json()
    assert {"content", "count", "issues"} <= body.keys(), body
    return body["content"]


def _basic_header(username: str, password: str) -> dict:
    token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("utf-8")
    return {"Authorization": f"Basic {token}"}


# ---------------------------------------------------------------- discovery

def test_providers_lists_basic_and_hides_firebase(client: TestClient):
    providers = _content(client.get("/api/authn/providers"))
    ids = {p["id"] for p in providers}
    assert "basic" in ids
    # The test configuration has no firebase credentials -> firebase is hidden.
    assert "firebase" not in ids
    basic = next(p for p in providers if p["id"] == "basic")
    assert basic["supports_register"] is True


# ---------------------------------------------------------------- register + login

def test_register_then_login_roundtrip(client: TestClient):
    reg = client.post(
        "/api/authn/register",
        json={"username": "alice", "email": "alice@example.org", "password": "sup3rsecret"},
    )
    assert reg.status_code == 200, reg.text
    assert _content(reg)["identity"] == "alice"

    login = client.put("/api/authn", headers=_basic_header("alice", "sup3rsecret"))
    assert login.status_code == 200, login.text
    assert _content(login)["identity"] == "alice"
    assert "session" in client.cookies

    who = client.get("/api/authn")
    assert who.status_code == 200
    assert _content(who)["identity"] == "alice"


def test_login_wrong_password_is_rejected(client: TestClient):
    client.post("/api/authn/register", json={"username": "bob", "password": "rightpassword"})
    bad = client.put("/api/authn", headers=_basic_header("bob", "wrongpassword"))
    assert bad.status_code == 401


def test_login_unknown_user_is_rejected(client: TestClient):
    r = client.put("/api/authn", headers=_basic_header("ghost", "whatever1"))
    assert r.status_code == 401


def test_register_rejects_short_password(client: TestClient):
    r = client.post("/api/authn/register", json={"username": "carol", "password": "short"})
    assert r.status_code == 400


def test_register_rejects_duplicate_username(client: TestClient):
    client.post("/api/authn/register", json={"username": "dave", "password": "longenough1"})
    dup = client.post("/api/authn/register", json={"username": "dave", "password": "longenough2"})
    assert dup.status_code == 409


# ---------------------------------------------------------------- seeded demo user

def test_seeded_demo_user_can_login(client: TestClient):
    login = client.put("/api/authn", headers=_basic_header("demo", "demo1234"))
    assert login.status_code == 200, login.text
    assert _content(login)["identity"] == "demo"
