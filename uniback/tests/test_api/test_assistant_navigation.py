"""
Tests for the assistant's navigation catalog and the ``navigate_to`` validation.

Regression: the model had no list of real front-end routes, so it invented them
(``/d/plants_map`` instead of ``/plantsMap``) or picked the browser when asked
for bulk entry, and the backend forwarded any route to the browser unchecked.
"""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from uniback.contrib.assistant import service
from uniback.contrib.assistant.navigation import (
    _humanize,
    format_catalog,
    navigable_pages,
    resolve_route,
)
from uniback.contrib.assistant.tools import NavigateToTool
from uniback.plugins.contracts import StreamEvent, ToolInputError


@pytest.fixture
def app_session(test_app):
    _, session_manager, _ = test_app
    db = session_manager.get_session()
    try:
        yield SimpleNamespace(db_session=db)
    finally:
        db.close()


def _events(stream):
    return [json.loads(chunk[len("data: "):]) for chunk in stream]


# --------------------------------------------------------------------- helpers


def test_humanize_menu_codes():
    assert _humanize("SIDEBAR.DATA.COLLECTIONS") == "Collections"
    assert _humanize("SIDEBAR.SECURITY.TITLE") == "Security"
    assert _humanize("Plantas en el mapa") == "Plantas en el mapa"
    assert _humanize(None) is None


# ------------------------------------------------------------------- catalog


def test_catalog_lists_sidebar_pages(app_session):
    pages = {p.route: p for p in navigable_pages(app_session.db_session)}

    assert pages["/plantsMap"].label == "Plantas en el mapa"
    assert pages["/d/plants_editable_table"].kind == "alta masiva / edición en tabla"
    assert pages["/d/datasets_browser"].kind == "listado"

    catalog = format_catalog(list(pages.values()))
    assert "/plantsMap" in catalog
    assert "/d/seed_batches_editable_table" in catalog


@pytest.mark.parametrize("requested, expected", [
    ("/plantsMap", "/plantsMap"),
    ("/plantsmap", "/plantsMap"),
    ("plantsMap", "/plantsMap"),
    ("/seed_batches_editable_table", "/d/seed_batches_editable_table"),
    ("/d/datasets_form", "/d/datasets_form"),              # synthetic, not in the menu
    ("/d/datasets_browser/5", "/d/datasets_browser/5"),
    ("/d/plants_browser?page=2", "/d/plants_browser?page=2"),
    ("/d/Plants_Editable_Table", "/d/plants_editable_table"),
])
def test_resolve_route_accepts_and_normalizes(app_session, requested, expected):
    db = app_session.db_session
    assert resolve_route(db, requested, navigable_pages(db)) == expected


@pytest.mark.parametrize("requested", ["/d/plants_map", "/plants", "", "/", "/d/nope_browser"])
def test_resolve_route_rejects_unknown(app_session, requested):
    db = app_session.db_session
    assert resolve_route(db, requested, navigable_pages(db)) is None


def test_navigate_tool_rejects_with_valid_routes(app_session):
    with pytest.raises(ToolInputError) as exc:
        NavigateToTool().prepare(app_session, route="/d/plants_map")
    assert "/plantsMap" in str(exc.value)


# ---------------------------------------------------------------- chat loop


class _ScriptedProvider:
    """Replays one scripted list of events per model turn and records prompts."""

    name = "stub"
    label = "Stub"

    def __init__(self, turns):
        self._turns = list(turns)
        self.calls = []

    def stream_turn(self, *, system, messages, tools):
        self.calls.append({"system": system, "messages": [dict(m) for m in messages]})
        yield from self._turns.pop(0)


def test_invalid_route_is_returned_to_model_not_emitted(app_session, monkeypatch):
    provider = _ScriptedProvider([
        [StreamEvent(type="tool_use", tool_id="t1", tool_name="navigate_to",
                     tool_input={"route": "/d/plants_map"})],
        [StreamEvent(type="tool_use", tool_id="t2", tool_name="navigate_to",
                     tool_input={"route": "/plantsmap"})],
        [StreamEvent(type="text", text="Listo.")],
    ])
    monkeypatch.setattr(service, "_resolve_provider", lambda *_: provider)
    monkeypatch.setattr(service, "_select_tools", lambda _: [NavigateToTool()])

    events = _events(service.run_chat_stream(
        session=app_session,
        model="stub",
        enabled_tool_names=None,
        messages=[{"role": "user", "content": "llévame al mapa de plantas"}],
        current_context={},
        persist=False,
    ))

    ui_actions = [e for e in events if e["type"] == "ui_action"]
    assert [a["input"]["route"] for a in ui_actions] == ["/plantsMap"]

    assert "/plantsMap" in provider.calls[0]["system"]
    rejection = provider.calls[1]["messages"][-1]
    assert rejection["role"] == "tool" and rejection["tool_call_id"] == "t1"
    assert "error" in json.loads(rejection["content"])
