"""
Tests for global work scopes (``GET /gui/scopes``).

A plugin declares a scope by naming its entity; the framework derives from the
ORM which entities it narrows (direct foreign keys) and the frontend filters
listings and pre-fills new records from that answer alone. The demo scope is
the plants plugin's ``zone``.
"""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from uniback.api.scopes import resolve_global_scopes
from uniback.plugins.contracts import GlobalScope
from uniback.plugins.registries import global_scope_registry


def _scopes(client: TestClient) -> dict:
    response = client.get("/api/gui/scopes")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["count"] == len(body["content"])
    return {scope["name"]: scope for scope in body["content"]}


def _targets(scope: dict) -> dict:
    return {t["entity"]: t for t in scope["targets"]}


def _list(client: TestClient, path: str, **filters) -> list:
    params = {"filter": json.dumps(filters)} if filters else {}
    response = client.get(path, params=params)
    assert response.status_code == 200, response.text
    return response.json()["content"]


# ------------------------------------------------------------------ discovery


def test_scopes_require_a_session(client: TestClient):
    assert client.get("/api/gui/scopes").status_code == 401


def test_zone_scope_targets_are_derived_from_foreign_keys(logged_in_client: TestClient):
    zone = _scopes(logged_in_client)["zone"]

    assert zone["entity"] == "zones"
    assert zone["endpoint"] == "/zones"
    assert (zone["value_field"], zone["label_field"]) == ("id", "name")

    # Nobody listed ``plants``: it is there because Plant.zone_id points to zones.
    targets = _targets(zone)
    assert targets["plants"] == {
        "entity": "plants", "endpoint": "/plants", "field": "zone_id", "kind": "fk",
    }
    # Entities with no relation to zones are not targets, and neither is the
    # parent table Plant inherits from.
    assert "roles" not in targets
    assert "functional_objects" not in targets


def test_case_study_scope_is_a_declared_membership(logged_in_client: TestClient):
    case_study = _scopes(logged_in_client)["case_study"]

    assert case_study["state_key"] == "gbl_cs"
    assert _targets(case_study)["functional_objects"] == {
        "entity": "functional_objects",
        "endpoint": "/functional_objects",
        "field": "case_study_id",
        "kind": "membership",
    }


def test_scopes_follow_declared_order(logged_in_client: TestClient):
    names = list(_scopes(logged_in_client))
    assert names.index("zone") < names.index("case_study")


def test_scope_with_unregistered_entity_is_skipped(test_app):
    global_scope_registry.register(GlobalScope(name="ghost", entity="no_such_entity", label="Ghost"))
    try:
        assert "ghost" not in {scope["name"] for scope in resolve_global_scopes()}
    finally:
        global_scope_registry.unregister("ghost")


# ----------------------------------------------------- what the scope enables


def test_listing_narrows_to_the_selected_zone(logged_in_client: TestClient):
    """The filter the frontend builds from a target (``{field: id}``) works on
    the generic listing with no entity-specific code."""
    zones = {z["name"]: z["id"] for z in _list(logged_in_client, "/api/zones/")}
    assert {"Tafira", "Las Palmas ciudad", "Sur de Gran Canaria"} <= set(zones)

    everything = _list(logged_in_client, "/api/plants/")
    tafira = _list(logged_in_client, "/api/plants/", zone_id=zones["Tafira"])

    assert {p["name"] for p in tafira} == {"Drago centenario", "Palmera canaria del campus"}
    assert len(tafira) < len(everything)
    assert all(p["zone_id"] == zones["Tafira"] for p in tafira)


def test_record_created_with_the_scope_default_lands_in_the_zone(logged_in_client: TestClient):
    zones = {z["name"]: z["id"] for z in _list(logged_in_client, "/api/zones/")}
    sur = zones["Sur de Gran Canaria"]

    created = logged_in_client.post("/api/plants/", json={"name": "Balo", "zone_id": sur})
    assert created.status_code == 200, created.text

    names = {p["name"] for p in _list(logged_in_client, "/api/plants/", zone_id=sur)}
    assert names == {"Cardón", "Balo"}


def test_plant_schema_publishes_the_zone_selector(logged_in_client: TestClient):
    schema = logged_in_client.get("/api/plants/schema.json").json()["content"]
    foreign_key = schema["properties"]["zone_id"]["x-foreign-key"]
    assert foreign_key["entity"] == "zones"
    assert foreign_key["endpoint"] == "/zones"
    assert foreign_key["label"] == "name"
