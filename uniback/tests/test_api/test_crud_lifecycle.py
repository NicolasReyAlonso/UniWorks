"""End-to-end CRUD lifecycle tests through the generated routers.

These exercise the full single-item CRUD surface (create / read / list / update
/ delete) and the per-entity ``schema.json`` endpoint, covering both router
factories:

* ``viewz``       -> ``make_simple_rest_crud`` (crud_factory.py)
* ``collections`` -> ``make_crudie_rest_crud``  (crudie.py)

Both entities are ``FunctionalObject`` subclasses, so the create/update payload
is just ``{"name": ...}`` (sent flat, as the frontend ``entity-client`` does).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _content(response):
    body = response.json()
    assert {"content", "count", "issues"} <= body.keys(), body
    return body["content"]


def _row(content):
    """Read endpoints may return a single dict or a one-item list."""
    if isinstance(content, list):
        assert content, "expected a non-empty result"
        return content[0]
    return content


@pytest.mark.parametrize("base", ["/api/viewz/", "/api/collections/"])
def test_full_crud_lifecycle(logged_in_client: TestClient, base: str):
    # --- create ---
    r = logged_in_client.post(base, json={"name": "lifecycle-1"})
    assert r.status_code == 200, r.text
    created = _content(r)
    assert created, "create returned empty content"
    entity_id = _row(created)["id"]
    assert _row(created)["name"] == "lifecycle-1"

    # --- read one ---
    r = logged_in_client.get(f"{base}{entity_id}")
    assert r.status_code == 200, r.text
    assert _row(_content(r))["name"] == "lifecycle-1"

    # --- list contains it ---
    r = logged_in_client.get(base)
    assert r.status_code == 200, r.text
    assert any(row.get("name") == "lifecycle-1" for row in _content(r))

    # --- update (flat body, as the frontend sends it) ---
    r = logged_in_client.put(f"{base}{entity_id}", json={"name": "lifecycle-2"})
    assert r.status_code == 200, r.text
    after = _row(_content(logged_in_client.get(f"{base}{entity_id}")))
    assert after["name"] == "lifecycle-2", "update did not persist the change"

    # --- delete ---
    r = logged_in_client.delete(f"{base}{entity_id}")
    assert r.status_code == 200, r.text

    # --- read after delete: the row is gone ---
    assert not _content(logged_in_client.get(f"{base}{entity_id}")), "row survived delete"


@pytest.mark.parametrize("base", ["/api/viewz/", "/api/collections/"])
def test_entity_schema_json_and_etag(logged_in_client: TestClient, base: str):
    r = logged_in_client.get(f"{base}schema.json")
    assert r.status_code == 200, r.text
    schema = _content(r)
    assert schema.get("type") == "object"
    assert "name" in schema.get("properties", {})

    etag = r.headers.get("ETag")
    assert etag, "schema.json should expose an ETag"

    # Conditional GET with the same ETag must short-circuit to 304.
    r2 = logged_in_client.get(f"{base}schema.json", headers={"If-None-Match": etag})
    assert r2.status_code == 304
