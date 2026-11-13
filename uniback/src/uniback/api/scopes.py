"""
Ámbitos globales de trabajo: resolución contra el modelo de datos.

Un plugin declara un ámbito (``GlobalScope``) nombrando solo su entidad. Aquí
se deduce, a partir del ORM, a qué otras entidades afecta: todas las que
tengan una clave foránea directa a ella. El resultado es lo que sirve
``GET /gui/scopes`` y lo único que el frontend necesita para filtrar listados
y prerrellenar altas sin conocer el dominio.

Solo relaciones DIRECTAS: una clave foránea de una clave foránea no se sigue
(habría que elegir camino en el grafo y los joins dejarían de ser previsibles).
Las relaciones por tabla de pertenencia las declara el plugin explícitamente
en ``GlobalScope.membership``.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Type

from sqlalchemy import inspect

from uniback.api.schema_registry import all_entities
from uniback.plugins.registries import global_scope_registry
from uniback.utils.common import _deduce_label_field

log = logging.getLogger(__name__)


def _fk_field_to(orm_class: Type, target_table: Any) -> Optional[str]:
    """Atributo de ``orm_class`` que es clave foránea directa a ``target_table``.

    Las claves primarias se descartan: en herencia joined-table la ``id`` de la
    subclase apunta a la tabla padre, y eso es identidad, no pertenencia.
    """
    mapper = inspect(orm_class)
    candidates = []
    for column in mapper.columns:
        if column.primary_key:
            continue
        if any(fk.column.table is target_table for fk in column.foreign_keys):
            try:
                candidates.append(mapper.get_property_by_column(column).key)
            except Exception:
                continue
    return sorted(candidates)[0] if candidates else None


def resolve_global_scopes() -> List[Dict[str, Any]]:
    """Ámbitos declarados, cada uno con las entidades a las que se aplica."""
    entities = all_entities()
    resolved: List[Dict[str, Any]] = []

    for scope in global_scope_registry.ordered():
        registration = entities.get(scope.entity)
        if registration is None or registration.orm_class is None:
            log.warning("Ámbito '%s': la entidad '%s' no está registrada; se omite",
                        scope.name, scope.entity)
            continue

        scope_table = inspect(registration.orm_class).local_table
        targets: Dict[str, Dict[str, Any]] = {}
        for name, other in entities.items():
            if name == scope.entity or other.orm_class is None:
                continue
            field = _fk_field_to(other.orm_class, scope_table)
            if field:
                targets[name] = {"entity": name, "endpoint": other.path, "field": field, "kind": "fk"}

        for name, filter_key in scope.membership.items():
            other = entities.get(name)
            if other is None or name in targets:
                continue
            targets[name] = {"entity": name, "endpoint": other.path,
                             "field": filter_key, "kind": "membership"}

        resolved.append({
            "name": scope.name,
            "entity": scope.entity,
            "endpoint": registration.path,
            "label": scope.label,
            "value_field": "id",
            "label_field": _deduce_label_field(registration.orm_class),
            "state_key": scope.state_key,
            "targets": [targets[name] for name in sorted(targets)],
        })

    return resolved
