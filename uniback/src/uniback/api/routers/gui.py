from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from uniback.api.dependencies import AppSession, get_n_session
from uniback.api.schema_registry import build_entity_schema, get_entity
from uniback.api.schemas.responses import ResponseEnvelope
from uniback.persistence.models.screens import AppFlavor, Menu, Screen

SCREEN_SUFFIXES = ("_editable_table", "_browser", "_form", "_table")
SUFFIX_TO_TYPE = {
    "_browser": "browser",
    "_table": "editable_table",
    "_editable_table": "editable_table",
    "_form": "form",
}

INTERNAL_FIELDS = {"id", "uuid", "creation_time", "deactivation_time"}

router = APIRouter(tags=["GUI Config"])


def _resolve_ref(node: Dict[str, Any], defs: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve a local ``#/$defs/<name>`` ``$ref`` against the schema's defs."""
    ref = node.get("$ref")
    if not isinstance(ref, str) or not ref.startswith("#/$defs/"):
        return node
    resolved = defs.get(ref.split("/")[-1])
    return resolved if isinstance(resolved, dict) else node


def _effective_prop(prop: Dict[str, Any], defs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Flatten the nullable/optional wrapper Pydantic v2 emits for ``Optional[...]``
    fields into a single dict the column/field builders can read directly.

    A field like ``health`` arrives as
    ``{"anyOf": [{"$ref": "#/$defs/PlantHealth"}, {"type": "null"}], ...}`` — the
    ``enum``/``type`` live behind the ``$ref``, so without flattening the grid
    select shows no options and the type falls back to ``string``. Outer keywords
    (``default``, ``title``, ``x-*``) win over the resolved branch; the branch's
    own ``title``/``description`` (the ``$defs`` class name) are dropped so the
    column falls back to the humanized field name.
    """
    prop = _resolve_ref(prop, defs)
    variants = prop.get("anyOf") or prop.get("oneOf") or prop.get("allOf")
    if not variants or prop.get("type") or prop.get("enum"):
        return prop

    meaningful = [_resolve_ref(v, defs) for v in variants if isinstance(v, dict)]
    meaningful = [v for v in meaningful if v.get("type") != "null"]
    if len(meaningful) != 1:
        return prop

    outer = {k: v for k, v in prop.items() if k not in ("anyOf", "oneOf", "allOf")}
    merged = {**meaningful[0], **outer}
    if "title" not in outer:
        merged.pop("title", None)
    if "description" not in outer:
        merged.pop("description", None)
    return merged


def _json_schema_type(prop: Dict[str, Any]) -> str:
    """Extract the effective JSON Schema type, handling nullable anyOf."""
    t = prop.get("type")
    if t:
        return t
    for variant in prop.get("anyOf", []):
        vt = variant.get("type")
        if vt and vt != "null":
            return vt
    return "string"


def _field_type_for(prop: Dict[str, Any]) -> str:
    """Map a JSON Schema property to a frontend field type."""
    if prop.get("x-ui-widget"):
        return prop["x-ui-widget"]
    fmt = prop.get("format")
    if fmt == "date-time":
        return "datetime"
    if fmt == "date":
        return "date"
    jtype = _json_schema_type(prop)
    return {
        "integer": "number",
        "number": "number",
        "boolean": "switch",
        "object": "json",
        "array": "json",
    }.get(jtype, "text")


def _split_screen_name(name: str) -> Optional[tuple[str, str]]:
    """Return (entity_name, screen_type) for a synthetic-screen name, or None."""
    for suffix in SCREEN_SUFFIXES:
        if name.endswith(suffix):
            return name[: -len(suffix)], SUFFIX_TO_TYPE[suffix]
    return None


def _synthetic_browser(entity_name: str, schema: Dict[str, Any], endpoint: str) -> Dict[str, Any]:
    """Build a synthetic browser-screen definition from a JSON Schema."""
    properties = schema.get("properties", {}) or {}
    defs = schema.get("$defs", {}) or {}
    columns: List[Dict[str, Any]] = []
    for field, prop in properties.items():
        prop = _effective_prop(prop, defs)
        if field in INTERNAL_FIELDS or prop.get("x-readonly"):
            continue
        jtype = _json_schema_type(prop)
        if jtype in ("object", "array"):
            continue
        column: Dict[str, Any] = {
            "field": field,
            "header": prop.get("title") or field.replace("_", " ").title(),
            "sortable": True,
        }
        if prop.get("format") == "date-time":
            column["type"] = "datetime"
        columns.append(column)
        if len(columns) >= 6:
            break

    return {
        "type": "browser",
        "title": schema.get("title") or entity_name.replace("_", " ").title(),
        "fieldId": "id",
        "columns": columns,
        "actions": ["view", "edit", "delete", "create"],
        "pagination": {"pageSize": 25, "pageSizeOptions": [10, 25, 50, 100]},
        "synthetic": True,
    }


def _synthetic_form(entity_name: str, schema: Dict[str, Any], endpoint: str) -> Dict[str, Any]:
    """Build a synthetic form-screen definition from a JSON Schema."""
    properties = schema.get("properties", {}) or {}
    defs = schema.get("$defs", {}) or {}
    required = set(schema.get("required", []) or [])
    fields: List[Dict[str, Any]] = []
    for field, prop in properties.items():
        prop = _effective_prop(prop, defs)
        if field in INTERNAL_FIELDS:
            continue
        if prop.get("x-readonly"):
            continue
        item: Dict[str, Any] = {
            "field": field,
            "label": prop.get("title") or field.replace("_", " ").title(),
            "type": _field_type_for(prop),
        }
        if field in required or prop.get("x-required"):
            item["required"] = True
        fields.append(item)

    return {
        "type": "form",
        "title": schema.get("title") or entity_name.replace("_", " ").title(),
        "sections": [
            {"name": "basic", "title": "SECTIONS.BASIC", "fields": fields},
        ],
        "synthetic": True,
    }


# Validators we surface from JSON Schema for client-side cell validation.
_VALIDATOR_KEYS = (
    "minLength", "maxLength", "pattern",
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
    "multipleOf", "enum", "format",
)


def _column_validators(prop: Dict[str, Any]) -> Dict[str, Any]:
    """Pluck JSON Schema validation keywords useful for grid-cell validation."""
    out: Dict[str, Any] = {}
    for key in _VALIDATOR_KEYS:
        if key in prop:
            out[key] = prop[key]
    for variant in prop.get("anyOf", []):
        for key in _VALIDATOR_KEYS:
            if key in variant and key not in out:
                out[key] = variant[key]
    return out


def _synthetic_editable_table(entity_name: str, schema: Dict[str, Any], endpoint: str) -> Dict[str, Any]:
    """
    Build a synthetic editable-table screen definition. Each column carries the
    metadata the frontend grid needs to render editors and validate cells:
    type, editable/readonly, required, FK options endpoint, and validators.
    """
    properties = schema.get("properties", {}) or {}
    defs = schema.get("$defs", {}) or {}
    required = set(schema.get("required", []) or [])
    columns: List[Dict[str, Any]] = []

    for field, prop in properties.items():
        prop = _effective_prop(prop, defs)
        if field in INTERNAL_FIELDS:
            continue
        jtype = _json_schema_type(prop)
        # Nested objects/arrays are not editable inline; skip from grid.
        if jtype in ("object", "array") and prop.get("x-ui-widget") not in ("select", "select-lazy-loading"):
            continue

        readonly = bool(prop.get("x-readonly"))
        column: Dict[str, Any] = {
            "field": field,
            "header": prop.get("title") or field.replace("_", " ").title(),
            "type": _field_type_for(prop),
            "editable": not readonly,
            "readonly": readonly,
            "sortable": True,
        }
        if field in required or prop.get("x-required"):
            column["required"] = True
        if prop.get("x-options-endpoint"):
            column["optionsEndpoint"] = prop["x-options-endpoint"]
        if prop.get("x-foreign-key"):
            column["foreignKey"] = prop["x-foreign-key"]
        validators = _column_validators(prop)
        if validators:
            column["validators"] = validators

        columns.append(column)

    bulk_endpoint = endpoint.rstrip("/") + "/bulk"

    return {
        "type": "editable_table",
        "title": schema.get("title") or entity_name.replace("_", " ").title(),
        "fieldId": "id",
        "endpoint": endpoint,
        "bulkEndpoint": bulk_endpoint,
        "columns": columns,
        "actions": ["save", "addRow", "deleteRow", "paste", "export"],
        "pagination": {"pageSize": 50, "pageSizeOptions": [25, 50, 100, 200]},
        "synthetic": True,
    }


def _build_synthetic_screen(name: str) -> Optional[Dict[str, Any]]:
    """
    Build a screen dict on-the-fly from the registered JSON Schema of an entity.
    Returns ``None`` if the name cannot be mapped or no schema is available.
    """
    parsed = _split_screen_name(name)
    if not parsed:
        return None
    entity_name, screen_type = parsed

    reg = get_entity(entity_name)
    if not reg:
        return None

    schema = build_entity_schema(reg)
    if not schema:
        return None

    endpoint = reg.path or f"/{entity_name}"
    if not endpoint.startswith("/api/"):
        endpoint = "/api" + (endpoint if endpoint.startswith("/") else f"/{endpoint}")
    if screen_type == "form":
        definition = _synthetic_form(entity_name, schema, endpoint)
    elif screen_type == "editable_table":
        definition = _synthetic_editable_table(entity_name, schema, endpoint)
    else:
        definition = _synthetic_browser(entity_name, schema, endpoint)

    return {
        "id": None,
        "uuid": None,
        "name": name,
        "screen_type": screen_type,
        "main_entity_type": schema.get("title"),
        "endpoint": endpoint,
        "route": f"/d/{name}",
        "permission": None,
        "definition": definition,
        "synthetic": True,
    }


def _screen_to_dict(screen: Screen) -> Dict[str, Any]:
    definition = screen.definition or {}
    return {
        "id": screen.id,
        "uuid": str(screen.uuid) if screen.uuid else None,
        "name": screen.name,
        "screen_type": screen.screen_type,
        "main_entity_type": screen.main_entity_type,
        "endpoint": screen.endpoint,
        "route": f"/d/{screen.name}",
        "permission": definition.get("permission"),
        "definition": definition,
    }


def _menu_to_dict(menu: Menu, children: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "id": menu.id,
        "uuid": str(menu.uuid) if menu.uuid else None,
        "name": menu.name,
        "icon": menu.icon,
        "order": menu.order or 0,
        "definition": menu.definition or {},
        "screen": _screen_to_dict(menu.screen) if menu.screen else None,
        "children": children,
    }


def _build_tree(menus: List[Menu]) -> List[Dict[str, Any]]:
    by_parent: Dict[Optional[int], List[Menu] ] = {}
    for m in menus:
        by_parent.setdefault(m.parent_menu_id, []).append(m)

    def build(parent_id: Optional[int]) -> List[Dict[str, Any]]:
        nodes = by_parent.get(parent_id, [])
        nodes = sorted(nodes, key=lambda x: (x.order or 0, x.name or ""))
        return [_menu_to_dict(m, build(m.id)) for m in nodes]

    return build(None)


@router.get("/gui/navigation", response_model=ResponseEnvelope)
async def get_gui_navigation(
    app_flavor: Optional[str] = Query(default=None, description="Optional app flavor name to filter menus"),
    sess: AppSession = Depends(get_n_session(read_only=True)),
):
    """
    Return the hierarchical navigation tree used by the frontend sidebar.

    The frontend filters items by permission using its own permission map
    (loaded from ``/authn/functions/gui`` at login). The ``permissions``
    field is currently returned empty for that reason.
    """
    db: Session = sess.db_session

    stmt = select(Menu)
    if app_flavor:
        flavor = db.scalar(select(AppFlavor).where(AppFlavor.name == app_flavor))
        if flavor:
            stmt = stmt.where(Menu.app_flavor_id == flavor.id)

    menus = list(db.scalars(stmt).all())

    # Hot-plug: hide menus tied to a node that is not alive right now. A menu
    # opts in by carrying ``definition.requires_node = "<node_type>"``; the
    # node keeps a heartbeat key in Redis (see uniback.utils.realtime) and the
    # frontend refreshes the sidebar on the ``navigation_changed`` event.
    from uniback.utils.realtime import node_is_alive

    required = {m.definition.get("requires_node") for m in menus if m.definition}
    required.discard(None)
    dead = {node for node in required if not node_is_alive(node)}
    if dead:
        hidden_parents = {
            m.id for m in menus
            if m.definition and m.definition.get("requires_node") in dead
        }
        menus = [
            m for m in menus
            if m.id not in hidden_parents and m.parent_menu_id not in hidden_parents
        ]

    tree = _build_tree(menus)

    return ResponseEnvelope.ok(content={"menus": tree, "permissions": {}})


@router.get("/gui/screens/by-name/{name}", response_model=ResponseEnvelope)
async def get_screen_by_name(
    name: str,
    sess: AppSession = Depends(get_n_session(read_only=True)),
):
    """
    Return a screen definition by name.

    If no screen exists in the database, fall back to a synthetic definition
    built from the entity's registered JSON Schema (see ``schema_registry``).
    """
    db: Session = sess.db_session
    screen = db.scalar(select(Screen).where(Screen.name == name))
    if screen:
        return ResponseEnvelope.ok(content=_screen_to_dict(screen))

    synthetic = _build_synthetic_screen(name)
    if synthetic:
        return ResponseEnvelope.ok(content=synthetic)

    raise HTTPException(status_code=404, detail=f"Screen '{name}' not found")


@router.get("/gui/screens/{screen_id}", response_model=ResponseEnvelope)
async def get_screen_by_id(
    screen_id: int,
    sess: AppSession = Depends(get_n_session(read_only=True)),
):
    """Return a single screen definition looked up by its numeric id."""
    db: Session = sess.db_session
    screen = db.get(Screen, screen_id)
    if not screen:
        raise HTTPException(status_code=404, detail=f"Screen {screen_id} not found")
    return ResponseEnvelope.ok(content=_screen_to_dict(screen))


@router.get("/gui/menu")
async def get_gui_menu():
    """Legacy hardcoded sidebar definition. Kept for backwards compatibility."""
    return {
        "microservices_node": {
            "icon": "api",
            "code": "Microservicios (Dinamico)",
            "routes": {
                "dashboard": {
                    "code": "Panel General",
                    "routerLink": "systemFunctionsBrowse",
                    "routes": ["/systemFunctionsBrowse"],
                    "permission": "gui-system-functions"
                },
                "status": {
                    "code": "Estado de Nodos",
                    "routerLink": "statusCheckersDetail",
                    "routes": ["/statusCheckersDetail"],
                    "permission": "gui-status-checkers"
                }
            }
        },
        "dwc_species": {
            "icon": "bug",
            "code": "Especies (Darwin Core)",
            "routes": {
                "organism_browse": {
                    "code": "Ver Especies DwC",
                    "routerLink": "dynamic/species/browse",
                    "routes": ["/dynamic/species/browse", "/dynamic/species/import", "/dynamic/species/detail"],
                    "permission": "gui-organisms"
                }
            }
        },
        "test_node_ui": {
            "icon": "rocket",
            "code": "Laboratorio de Pruebas",
            "routes": {
                "experiments": {
                    "code": "Ver Experimentos",
                    "routerLink": "caseStudiesBrowse",
                    "routes": ["/caseStudiesBrowse"],
                    "permission": "gui-case-studies"
                }
            }
        }
    }
