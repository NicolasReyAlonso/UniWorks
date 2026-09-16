"""
Tests for /gui/screens/by-name — the endpoint the frontend DynamicPage calls to
resolve a screen definition.

Regression: opening a record from a browser whose display name differs from its
registered CRUD entity (e.g. ``datasets_browser`` → entity ``functional_objects``)
used to 404 on the derived ``*_form`` name, so the frontend showed
"no view for this object". The synthetic fallback must resolve the entity via the
sibling browser screen's endpoint.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from uniback.api.routers.gui import _entity_name_from_endpoint


def _content(response):
    body = response.json()
    assert {"content", "count", "issues"} <= body.keys()
    return body["content"]


# --------------------------------------------------------------------- helpers


def test_entity_name_from_endpoint():
    assert _entity_name_from_endpoint("/api/functional_objects") == "functional_objects"
    assert _entity_name_from_endpoint("/api/acl/permission_types") == "permission_types"
    assert _entity_name_from_endpoint("/api/viewz/") == "viewz"


# ------------------------------------------------------------------- endpoint


def test_seeded_browser_screen_is_returned(logged_in_client: TestClient):
    resp = logged_in_client.get("/api/gui/screens/by-name/datasets_browser")
    assert resp.status_code == 200
    screen = _content(resp)
    assert screen["screen_type"] == "browser"
    assert screen["endpoint"] == "/api/functional_objects"


def test_form_screen_is_synthesized_via_sibling(logged_in_client: TestClient):
    """``datasets_form`` has no DB screen and ``datasets`` is not a registered
    entity — it must resolve through the ``datasets_browser`` sibling's endpoint."""
    resp = logged_in_client.get("/api/gui/screens/by-name/datasets_form")
    assert resp.status_code == 200, resp.text
    screen = _content(resp)
    assert screen["screen_type"] == "form"
    assert screen["synthetic"] is True
    # Endpoint inherited from the sibling browser, not the (unregistered) prefix.
    assert screen["endpoint"] == "/api/functional_objects"
    definition = screen["definition"]
    assert definition["type"] == "form"
    assert definition["sections"], "synthetic form should carry at least one section"


def test_unknown_screen_returns_404(logged_in_client: TestClient):
    resp = logged_in_client.get("/api/gui/screens/by-name/definitely_not_an_entity_form")
    assert resp.status_code == 404
