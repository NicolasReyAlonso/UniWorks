"""
Verifies the schema generation features of Incremento 4:
  - /sys/schemas returns a versioned bundle with every registered entity.
  - /<entity>/schema.json supports ETag-based conditional GET (304).
  - The bundle version is stable across identical generations.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _envelope_content(response):
    body = response.json()
    assert {"content", "count", "issues"} <= body.keys()
    return body["content"]


# ---------------------------------------------------------------------- bundle


def test_sys_schemas_returns_versioned_bundle(client: TestClient):
    response = client.get("/api/sys/schemas")
    assert response.status_code == 200
    bundle = _envelope_content(response)

    assert bundle["$schema"].startswith("https://json-schema.org/")
    assert isinstance(bundle["version"], str) and bundle["version"]
    assert "generated_at" in bundle
    assert isinstance(bundle["entities"], dict)
    assert bundle["entities"], "Expected at least one registered entity"


def test_sys_schemas_bundle_includes_known_entities(client: TestClient):
    bundle = _envelope_content(client.get("/api/sys/schemas"))
    # `roles` is registered via make_simple_rest_crud in simple_routers.py and
    # should always be present in a default initialization.
    assert "roles" in bundle["entities"], (
        f"Expected 'roles' in bundle; got: {list(bundle['entities'].keys())[:10]}..."
    )

    role_schema = bundle["entities"]["roles"]
    assert role_schema.get("type") == "object"
    assert "properties" in role_schema


def test_sys_schemas_version_is_stable(client: TestClient):
    first = _envelope_content(client.get("/api/sys/schemas"))
    second = _envelope_content(client.get("/api/sys/schemas"))
    assert first["version"] == second["version"], (
        "Bundle version drifted between two consecutive calls — generation is not deterministic"
    )
    # generated_at MUST change between calls so consumers can tell which run produced the document.
    assert first["generated_at"] != second["generated_at"]


def test_sys_schemas_etag_round_trip(client: TestClient):
    first = client.get("/api/sys/schemas")
    assert first.status_code == 200
    etag = first.headers.get("etag")
    assert etag and etag.startswith('W/"')

    second = client.get("/api/sys/schemas", headers={"If-None-Match": etag})
    assert second.status_code == 304
    assert second.headers.get("etag") == etag


# -------------------------------------------------------- per-entity schema ETag


def test_entity_schema_returns_etag_header(logged_in_client: TestClient):
    response = logged_in_client.get("/api/roles/schema.json")
    assert response.status_code == 200
    etag = response.headers.get("etag")
    assert etag and etag.startswith('W/"')


def test_entity_schema_supports_if_none_match(logged_in_client: TestClient):
    first = logged_in_client.get("/api/roles/schema.json")
    etag = first.headers["etag"]

    cached = logged_in_client.get("/api/roles/schema.json", headers={"If-None-Match": etag})
    assert cached.status_code == 304
    assert cached.headers.get("etag") == etag


def test_entity_schema_etag_differs_per_entity(logged_in_client: TestClient):
    a = logged_in_client.get("/api/roles/schema.json").headers["etag"]
    b_resp = logged_in_client.get("/api/identities/schema.json")
    if b_resp.status_code != 200:
        pytest.skip("Identities schema endpoint not exposed in this configuration")
    b = b_resp.headers["etag"]
    assert a != b, "ETags should be content-addressed: distinct schemas → distinct ETags"


# ------------------------------------------------------- polymorphism (oneOf)
#
# These read the entity schema from the unauthenticated /sys/schemas bundle so
# they exercise the real ORM-derived schema without depending on the auth-only
# per-entity endpoint.


def _bundle_entities(client: TestClient):
    return _envelope_content(client.get("/api/sys/schemas"))["entities"]


def test_functional_objects_schema_is_polymorphic(client: TestClient):
    """
    FunctionalObject is the root of a SQLAlchemy polymorphic hierarchy
    (polymorphic_on=object_type_id). Its schema must expose `oneOf` plus an
    `x-discriminator`, while keeping the base `properties` so consumers that
    do not understand `oneOf` still see the common columns.
    """
    schema = _bundle_entities(client)["functional_objects"]

    # Base columns are still present (non-oneOf consumers keep working).
    assert schema.get("type") == "object"
    assert "properties" in schema and "object_type_id" in schema["properties"]

    assert isinstance(schema.get("oneOf"), list) and schema["oneOf"], (
        "Polymorphic root must emit a non-empty oneOf"
    )
    disc = schema.get("x-discriminator")
    assert isinstance(disc, dict)
    assert disc.get("propertyName") == "object_type_id"

    mapping = disc.get("mapping") or {}
    # Collection (106), CaseStudy (103) and Dataset (0) are registered subclasses.
    assert set(mapping.values()) >= {"Collection", "CaseStudy", "Dataset"}, (
        f"Discriminator mapping missing known subclasses: {mapping}"
    )
    # Every variant in oneOf describes an object with its own properties.
    for variant in schema["oneOf"]:
        assert variant.get("type") == "object"
        assert "properties" in variant


def test_subclass_schema_is_not_polymorphic(client: TestClient):
    """A subclass (case_studies -> CaseStudy) must NOT carry oneOf itself."""
    entities = _bundle_entities(client)
    if "case_studies" not in entities:
        pytest.skip("case_studies not registered in this configuration")
    assert "oneOf" not in entities["case_studies"], (
        "Only the polymorphic root should emit oneOf"
    )


def test_bundle_carries_polymorphic_entity(client: TestClient):
    fo = _bundle_entities(client).get("functional_objects")
    assert fo is not None, "functional_objects should be registered in the bundle"
    assert isinstance(fo.get("oneOf"), list) and fo["oneOf"]
    assert fo.get("x-discriminator", {}).get("propertyName") == "object_type_id"


def test_polymorphism_does_not_destabilize_bundle_version(client: TestClient):
    """oneOf/x-relationships are deterministic → bundle version stays stable."""
    first = _envelope_content(client.get("/api/sys/schemas"))["version"]
    second = _envelope_content(client.get("/api/sys/schemas"))["version"]
    assert first == second


# ------------------------------------------------------ x-relationships


def test_functional_objects_schema_reflects_relationships(client: TestClient):
    """
    `relationship()` definitions are reflected as an `x-relationships` array.
    FunctionalObject.rl_owner is a many-to-one relationship to Identity and is
    resolved to the registered `identities` entity.
    """
    schema = _bundle_entities(client)["functional_objects"]
    rels = schema.get("x-relationships")
    assert isinstance(rels, list) and rels, "Expected x-relationships array"

    by_name = {r["name"]: r for r in rels}
    assert "rl_owner" in by_name, f"rl_owner missing; got {list(by_name)}"
    owner = by_name["rl_owner"]
    assert owner["direction"] == "MANYTOONE"
    assert owner["collection"] is False
    assert owner["target"] == "identities"
    assert "owner_id" in (owner.get("local_columns") or [])


def test_relationships_sorted_and_stable(client: TestClient):
    rels = _bundle_entities(client)["functional_objects"]["x-relationships"]
    names = [r["name"] for r in rels]
    assert names == sorted(names), "x-relationships must be sorted by name (stable ETag)"


# --------------------------------------------------------- registry unit tests


def test_compute_etag_is_stable_for_same_input():
    from uniback.api.schema_registry import compute_etag

    payload = {"a": 1, "nested": {"x": [1, 2, 3]}}
    assert compute_etag(payload) == compute_etag(payload)
    assert compute_etag(payload) != compute_etag({"a": 1, "nested": {"x": [1, 2, 4]}})


def test_build_schema_bundle_uses_registered_entities():
    """Direct call without HTTP — registry must be populated by the running app."""
    from uniback.api.schema_registry import all_entities, build_schema_bundle

    # The fixture-driven app has been initialized at this point by other tests,
    # so the registry should not be empty. If it is, the bundle test above
    # already covers the case via HTTP. Be defensive here.
    if not all_entities():
        pytest.skip("Registry empty — schema bundle test relies on app initialization side-effects")

    bundle = build_schema_bundle("http://test")
    assert bundle["entities"], "Registered entities should yield non-empty bundle"
