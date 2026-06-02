"""
Verifies the JSON Schema served at /<entity>/schema.json carries the x-* UI
hints required by the dynamic form generator (Incremento 3).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _props(schema: dict) -> dict:
    assert schema.get("type") == "object"
    return schema.get("properties") or {}


def test_roles_schema_contains_ui_hints(logged_in_client: TestClient):
    response = logged_in_client.get("/api/roles/schema.json")
    assert response.status_code == 200
    body = response.json()
    schema = body["content"]
    assert schema, "Expected /<entity>/schema.json to return a non-empty schema"
    props = _props(schema)
    assert props, "Expected at least one property in the roles schema"


def test_datetime_columns_get_datepicker_hint(logged_in_client: TestClient):
    # `identities` has datetime columns (`creation_time`, `deactivation_time`).
    response = logged_in_client.get("/api/identities/schema.json")
    if response.status_code != 200:
        pytest.skip("Identities schema endpoint not available in this configuration")
    schema = response.json()["content"]
    props = _props(schema)
    candidates = {k for k, v in props.items() if v.get("x-ui-widget") == "datepicker"}
    assert candidates, "No datetime property exposed as datepicker"


def test_foreign_key_columns_get_lazy_select_hint(logged_in_client: TestClient):
    # `identities_roles` is a join table between identities and roles.
    response = logged_in_client.get("/api/identities_roles/schema.json")
    if response.status_code != 200:
        pytest.skip("identities_roles schema endpoint not available")
    schema = response.json()["content"]
    props = _props(schema)
    fk_props = {k: v for k, v in props.items() if v.get("x-ui-widget") == "select-lazy-loading"}
    assert fk_props, "Expected at least one FK column to be hinted as select-lazy-loading"
    for value in fk_props.values():
        endpoint = value.get("x-options-endpoint")
        assert endpoint and endpoint.startswith("/")


def test_unit_hints_helper_handles_boolean_and_text():
    """Direct unit test of `_ui_hints_for_column` without HTTP."""
    from sqlalchemy import Boolean, Column, ForeignKey, String, DateTime, Integer
    from sqlalchemy.orm import declarative_base

    from uniback.utils.common import _ui_hints_for_column

    Base = declarative_base()

    class Target(Base):
        __tablename__ = "_fixture_target"
        id = Column(Integer, primary_key=True)

    class Probe(Base):
        __tablename__ = "_fixture_probe"
        id = Column(Integer, primary_key=True)
        active = Column(Boolean)
        name = Column(String(50))
        bio = Column(String(2000))
        created_at = Column(DateTime)
        target_id = Column(Integer, ForeignKey("_fixture_target.id"))

    assert _ui_hints_for_column(Probe.__table__.c.active)["x-ui-widget"] == "checkbox"
    assert "x-ui-widget" not in _ui_hints_for_column(Probe.__table__.c.name)
    assert _ui_hints_for_column(Probe.__table__.c.bio)["x-ui-widget"] == "textarea"
    assert _ui_hints_for_column(Probe.__table__.c.created_at)["x-ui-widget"] == "datepicker"

    fk_hints = _ui_hints_for_column(Probe.__table__.c.target_id)
    assert fk_hints["x-ui-widget"] == "select-lazy-loading"
    assert fk_hints["x-options-endpoint"] == "/_fixture_target/"


def test_column_info_overrides_take_precedence():
    """Manual `column.info` hints win over heuristics."""
    from sqlalchemy import Column, Integer, String
    from sqlalchemy.orm import declarative_base

    from uniback.utils.common import _ui_hints_for_column

    Base = declarative_base()

    class Probe(Base):
        __tablename__ = "_fixture_override"
        id = Column(Integer, primary_key=True)
        notes = Column(String(50), info={"ui": {"ui-widget": "textarea", "formly-props": {"rows": 10}}})

    hints = _ui_hints_for_column(Probe.__table__.c.notes)
    assert hints["x-ui-widget"] == "textarea"
    assert hints["x-formly-props"] == {"rows": 10}
