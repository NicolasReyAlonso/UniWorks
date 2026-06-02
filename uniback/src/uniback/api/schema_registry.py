"""
Project-wide registry of entities exposed via CRUD routers, plus helpers to
build their JSON Schemas and compute stable ETags.

Both ``make_simple_rest_crud`` (in crud_factory.py) and
``make_crudie_rest_crud`` (in crudie.py) call ``register_entity`` so the bundle
endpoint at ``/sys/schemas`` and ETag handling can find them.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Type

from pydantic import BaseModel

from uniback.utils.common import get_enriched_json_schema, sqlalchemy_to_pydantic


@dataclass
class EntityRegistration:
    name: str
    path: str
    factory: str = "simple"  # "simple" | "crudie"
    orm_class: Optional[Type] = None
    pydantic_schema: Optional[Type[BaseModel]] = None
    tags: list = field(default_factory=list)


_REGISTRY: Dict[str, EntityRegistration] = {}


def register_entity(reg: EntityRegistration) -> None:
    """Register or replace an entity definition. Idempotent by `name`."""
    _REGISTRY[reg.name] = reg


def get_entity(name: str) -> Optional[EntityRegistration]:
    return _REGISTRY.get(name)


def all_entities() -> Dict[str, EntityRegistration]:
    return dict(_REGISTRY)


def clear_registry() -> None:
    """Test helper to ensure isolation between runs."""
    _REGISTRY.clear()


def build_entity_schema(reg: EntityRegistration, schema_url: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Build the enriched JSON Schema for a registered entity. Returns ``None`` if
    no Pydantic schema can be derived from the registration.
    """
    pydantic_schema = reg.pydantic_schema
    if pydantic_schema is None and reg.orm_class is not None:
        try:
            pydantic_schema = sqlalchemy_to_pydantic(reg.orm_class)
        except Exception:
            pydantic_schema = None
    if pydantic_schema is None:
        return None

    return get_enriched_json_schema(
        pydantic_schema,
        schema_url or f"/{reg.name}/schema.json",
        title=reg.name.replace("_", " ").title().replace(" ", ""),
        description=f"Schema for {reg.name}",
        orm_class=reg.orm_class,
    )


def compute_etag(payload: Any) -> str:
    """
    Stable, content-addressed ETag for any JSON-serializable payload. Weak
    validator (``W/"..."``) since the textual encoding may shift across Python
    versions while the logical content stays the same.
    """
    raw = json.dumps(payload, sort_keys=True, default=str, separators=(",", ":"))
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    return f'W/"{digest}"'


def build_schema_bundle(base_url: str = "") -> Dict[str, Any]:
    """
    Build a single document containing every registered entity's JSON Schema.
    Consumers use this for codegen and to mirror the API surface in other
    projects.
    """
    entities: Dict[str, Any] = {}
    for name, reg in sorted(_REGISTRY.items()):
        schema = build_entity_schema(reg, schema_url=f"{base_url}/{reg.name}/schema.json".rstrip("/"))
        if schema is not None:
            entities[name] = schema

    bundle: Dict[str, Any] = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "entities": entities,
    }
    # Compute version over the entities only — generated_at intentionally
    # excluded so the version stays stable across identical generations.
    bundle["version"] = compute_etag(entities).strip('W/"')
    return bundle
