"""
Implementaciones por defecto de los contratos del plugin API.

Estas viven en el nucleo (no en un plugin) para que el insertador generico
funcione "out of the box". Cualquier plugin puede sobreescribirlas registrando
otra implementacion con el mismo ``name`` (el registro reemplaza por nombre).
"""

from __future__ import annotations

import json
from typing import Any, BinaryIO, Iterable, Mapping, Optional, Type

from sqlalchemy import inspect as sa_inspect, select

from uniback.plugins.contracts import FKResolver, Importer


class JsonImporter(Importer):
    """Parsea un JSON con una lista de objetos o un objeto con clave ``rows``."""
    name = "json"
    formats = ("json",)
    content_types = ("application/json",)

    def parse(self, stream: BinaryIO, *, entity_name=None, schema=None, options=None) -> Iterable[Mapping[str, Any]]:
        data = json.load(stream)
        if isinstance(data, dict):
            data = data.get("rows", data.get("items", data.get("content", [])))
        if not isinstance(data, list):
            raise ValueError("JSON debe ser una lista o un objeto con 'rows'/'items'/'content'")
        for row in data:
            if not isinstance(row, Mapping):
                raise ValueError(f"Cada fila debe ser un objeto JSON, recibido: {type(row).__name__}")
            yield dict(row)


class NdjsonImporter(Importer):
    """Parsea NDJSON / JSONL: una fila JSON por linea."""
    name = "ndjson"
    formats = ("ndjson", "jsonl")
    content_types = ("application/x-ndjson", "application/jsonl")

    def parse(self, stream: BinaryIO, *, entity_name=None, schema=None, options=None) -> Iterable[Mapping[str, Any]]:
        for raw_line in stream:
            line = raw_line.strip() if isinstance(raw_line, (bytes, bytearray)) else raw_line.strip()
            if not line:
                continue
            yield json.loads(line)


class PrimaryKeyFKResolver(FKResolver):
    """
    Acepta el valor FK como escalar (``42``, ``"uuid-..."``) o dict declarando
    una busqueda por la PK / por uuid: ``{"by": "id", "value": 42}`` o
    ``{"by": "uuid", "value": "..."}``.

    Si el valor llega como escalar, lo devuelve tal cual asumiendo que es ya la
    PK. El resto lo gestiona ``LookupFieldFKResolver``.
    """
    name = "by_primary_key"
    _SCALAR_KEYS = ("id", "uuid", "pk")

    def matches(self, target_class: Type, lookup: Any) -> bool:
        if isinstance(lookup, (int, str)):
            return True
        if isinstance(lookup, Mapping):
            by = lookup.get("by")
            return by in self._SCALAR_KEYS
        return False

    def resolve(self, db, target_class: Type, lookup: Any) -> Optional[Any]:
        if isinstance(lookup, (int, str)):
            return lookup
        by = lookup.get("by")
        value = lookup.get("value")
        if by == "id" or by == "pk":
            # Devolvemos directo: el caller asignara al campo FK.
            return value
        if by == "uuid":
            if not hasattr(target_class, "uuid"):
                return None
            obj = db.scalar(select(target_class).where(target_class.uuid == value))
            if obj is None:
                return None
            pk = sa_inspect(target_class).primary_key[0].name
            return getattr(obj, pk, None)
        return None


class LookupFieldFKResolver(FKResolver):
    """
    Resuelve ``{"by": "<campo>", "value": ...}`` buscando una unica fila donde
    ``target_class.<campo> == value`` y devolviendo su PK. Compatible con
    cualquier columna escalar (name, code, slug, etc.).
    """
    name = "by_lookup_field"

    def matches(self, target_class: Type, lookup: Any) -> bool:
        if not isinstance(lookup, Mapping):
            return False
        by = lookup.get("by")
        if not isinstance(by, str) or by in ("id", "pk", "uuid"):
            return False
        return hasattr(target_class, by)

    def resolve(self, db, target_class: Type, lookup: Mapping[str, Any]) -> Optional[Any]:
        by = lookup["by"]
        value = lookup.get("value")
        column = getattr(target_class, by, None)
        if column is None:
            return None
        obj = db.scalar(select(target_class).where(column == value))
        if obj is None:
            return None
        pk = sa_inspect(target_class).primary_key[0].name
        return getattr(obj, pk, None)


def register_core_defaults() -> None:
    """Inscribe los importers/resolvers por defecto en los registros globales."""
    from uniback.plugins.registries import fk_resolver_registry, importer_registry

    importer_registry.register(JsonImporter())
    importer_registry.register(NdjsonImporter())
    # Orden importante: el ultimo registrado se evalua primero (`reversed`).
    # Registramos primero el lookup por PK (fallback) y luego el de campo
    # arbitrario, asi un dict con ``by`` no-PK gana sobre el de PK.
    fk_resolver_registry.register(PrimaryKeyFKResolver())
    fk_resolver_registry.register(LookupFieldFKResolver())


__all__ = [
    "JsonImporter",
    "NdjsonImporter",
    "PrimaryKeyFKResolver",
    "LookupFieldFKResolver",
    "register_core_defaults",
]
