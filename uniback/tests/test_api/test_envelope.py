"""
Verifies the ResponseEnvelope contract — Incremento 2 of the framework.

All endpoints (success and error) must return a body with `content`, `count`
and `issues[]`. Discovery and per-entity schema endpoints must also follow it.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


ENVELOPE_KEYS = {"content", "count", "issues"}


def assert_envelope(body):
    assert isinstance(body, dict), f"Body is not a JSON object: {body!r}"
    missing = ENVELOPE_KEYS - body.keys()
    assert not missing, f"Body is missing envelope keys {missing}: {body!r}"
    assert isinstance(body["issues"], list)


def test_404_returns_envelope_with_error_issue(client: TestClient):
    response = client.get("/api/this-route-does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert_envelope(body)
    assert body["content"] is None
    assert body["count"] == 0
    assert any(i["type"] == "ERROR" for i in body["issues"])
    assert any(i.get("code") == "NOT_FOUND" for i in body["issues"])


def test_validation_error_returns_envelope(client: TestClient):
    # /user_roles requires `email` query param; omit it to trigger validation.
    response = client.get("/api/user_roles")
    assert response.status_code == 422
    body = response.json()
    assert_envelope(body)
    assert body["content"] is None
    assert all(i["code"] == "VALIDATION_ERROR" for i in body["issues"] if i["type"] == "ERROR")
    assert body["issues"], "Validation errors should be reported as issues"


def test_login_returns_envelope(client: TestClient):
    response = client.put("/api/authn?user=test_user")
    assert response.status_code == 200
    body = response.json()
    assert_envelope(body)
    assert body["content"]["status"] == "success"
    assert body["content"]["identity"] == "test_user"


def test_authn_get_returns_envelope(logged_in_client: TestClient):
    response = logged_in_client.get("/api/authn")
    assert response.status_code == 200
    body = response.json()
    assert_envelope(body)
    assert body["content"]["identity"] == "test_user"


def test_sys_entities_endpoint(client: TestClient):
    response = client.get("/api/sys/entities")
    assert response.status_code == 200
    body = response.json()
    assert_envelope(body)
    assert isinstance(body["content"], list)
    assert body["count"] == len(body["content"])

    # At least one well-known CRUD-backed entity (e.g. roles) should appear.
    names = {entry["name"] for entry in body["content"]}
    assert names, "/sys/entities returned no entities — registry empty?"
    sample = body["content"][0]
    assert {"name", "path", "pk", "capabilities"}.issubset(sample.keys())
    caps = sample["capabilities"]
    assert {"list", "get", "create", "update", "delete", "schema"}.issubset(caps.keys())


def test_entity_schema_endpoint(logged_in_client: TestClient):
    # The `roles` entity is registered via make_simple_rest_crud which auto-creates /schema.json
    response = logged_in_client.get("/api/roles/schema.json")
    assert response.status_code == 200
    body = response.json()
    assert_envelope(body)
    content = body["content"]
    assert isinstance(content, dict)
    assert content.get("$schema", "").startswith("https://json-schema.org/")
    assert content.get("type") == "object"


def test_envelope_issue_has_optional_code_field():
    """The Issue model accepts the optional `code` field added in Incremento 2."""
    from uniback.api.schemas.responses import Issue, IType

    issue = Issue.error(message="boom", code="MY_CODE")
    assert issue.type == IType.ERROR
    assert issue.code == "MY_CODE"

    issue2 = Issue(type=IType.WARNING, message="legacy")
    assert issue2.code is None
