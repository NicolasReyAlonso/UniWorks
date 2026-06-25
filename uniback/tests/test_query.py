"""Unit tests for the query helpers in ``uniback.persistence.query``.

``parse_request_params`` is a pure dict transformation; ``filter_parse`` builds
SQLAlchemy filter expressions from the framework's filter DSL.
"""
from __future__ import annotations

import pytest

from uniback.persistence import query as q


# --------------------------------------------------------- parse_request_params

def test_parse_empty_returns_defaults():
    assert q.parse_request_params({}) == {
        "filter": [], "order": [], "pagination": {}, "values": {}, "searchValue": "",
    }


def test_parse_extracts_known_sections():
    out = q.parse_request_params({
        "filter": [{"name": "x"}],
        "order": ["name"],
        "pagination": {"limit": 10},
        "searchValue": "abc",
    })
    assert out["filter"] == [{"name": "x"}]
    assert out["order"] == ["name"]
    assert out["pagination"] == {"limit": 10}
    assert out["searchValue"] == "abc"


def test_parse_unknown_keys_go_to_values():
    out = q.parse_request_params({"name": "foo", "active": True})
    assert out["values"] == {"name": "foo", "active": True}


def test_parse_decodes_stringified_pagination():
    # chew_data should turn the stringified dict into a real dict.
    out = q.parse_request_params({"pagination": "{'limit': 5}"})
    assert out["pagination"] == {"limit": 5}


def test_parse_default_kwargs_fill_empty_sections():
    # Defaults only fill sections left at their empty sentinel (None / [] / "").
    out = q.parse_request_params({}, default_kwargs={"order": ["name"]})
    assert out["order"] == ["name"]


def test_parse_default_kwargs_do_not_override_present_values():
    out = q.parse_request_params({"order": ["x"]}, default_kwargs={"order": ["y"]})
    assert out["order"] == ["x"]


# ------------------------------------------------------------------ chew_data

@pytest.mark.parametrize("raw,expected", [
    ("5", 5),
    ("[1, 2, 3]", [1, 2, 3]),
    ("{'a': 1}", {"a": 1}),
    ("plain", "plain"),
])
def test_chew_data_coerces_literals(raw, expected):
    assert q.chew_data(raw) == expected


# ------------------------------------------------------------------ filter_parse

@pytest.fixture
def View(test_app):
    """Import the View model after the ORM has been initialized/configured."""
    from uniback.contrib.gui_crud.models import View as _View
    return _View


def test_filter_parse_empty_is_none(View):
    assert q.filter_parse(View, []) is None


def test_filter_parse_equality(View):
    assert q.filter_parse(View, [{"name": "abc"}]) is not None


def test_filter_parse_in_clause_from_list(View):
    assert q.filter_parse(View, [{"name": ["a", "b"]}]) is not None


def test_filter_parse_unknown_field_is_ignored(View):
    # An unknown column yields no clause -> overall result is None.
    assert q.filter_parse(View, [{"definitely_not_a_column": "x"}]) is None


@pytest.mark.parametrize("op_spec", [
    {"op": "ne", "unary": "x"},
    {"op": "ge", "unary": "a"},
    {"op": "le", "unary": "z"},
    {"op": "lt", "unary": "z"},
    {"op": "gt", "unary": "a"},
    {"op": "in", "unary": ["a", "b"]},
    {"op": "out", "unary": ["a", "b"]},
    {"op": "like", "unary": "%a%"},
    {"op": "ilike", "unary": "%a%"},
    {"op": "between", "left": "a", "right": "z"},
])
def test_filter_parse_supports_operators(View, op_spec):
    assert q.filter_parse(View, [{"name": op_spec}]) is not None
