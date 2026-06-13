"""
Herramientas de serie del asistente.

De servidor (``side="server"``) — se ejecutan en el backend bajo la sesión del
usuario, así el ACL del kernel se aplica solo:
  * ``list_entities``     — catálogo de entidades CRUD (de ``schema_registry``).
  * ``get_entity_schema`` — JSON Schema de una entidad.
  * ``query_records``     — consulta registros respetando el ACL de lectura.

De UI (``side="ui"``) — acciones terminales que ejecuta el overlay del
navegador; el backend solo las emite:
  * ``navigate_to``        — lleva al usuario a una ruta del front.
  * ``propose_table_rows`` — propone filas para una entidad; el overlay las
    muestra y, si el usuario confirma, las da de alta vía el CRUD existente.
"""

from __future__ import annotations

import logging
from typing import Any, List

from uniback.plugins.contracts import AssistantTool

log = logging.getLogger(__name__)

_MAX_LIMIT = 100


class ListEntitiesTool(AssistantTool):
    name = "list_entities"
    side = "server"
    description = (
        "Lista las entidades de datos disponibles (tablas) con su nombre, ruta "
        "de API y etiquetas. Úsala para descubrir qué datos existen."
    )
    input_schema = {"type": "object", "properties": {}}

    def execute(self, session: Any, **_: Any) -> Any:
        from uniback.api.schema_registry import all_entities

        return {
            "entities": [
                {"name": reg.name, "path": reg.path, "tags": list(reg.tags or [])}
                for reg in all_entities().values()
            ]
        }


class GetEntitySchemaTool(AssistantTool):
    name = "get_entity_schema"
    side = "server"
    description = (
        "Devuelve el JSON Schema de una entidad (campos, tipos y restricciones). "
        "Úsala antes de proponer filas para conocer los campos requeridos."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "entity": {"type": "string", "description": "Nombre de la entidad, p.ej. 'seed_batches'"},
        },
        "required": ["entity"],
    }

    def execute(self, session: Any, *, entity: str, **_: Any) -> Any:
        from uniback.api.schema_registry import build_entity_schema, get_entity

        reg = get_entity(entity)
        if reg is None:
            return {"error": f"Entidad desconocida: {entity}"}
        schema = build_entity_schema(reg)
        return {"entity": entity, "schema": schema or {}}


class QueryRecordsTool(AssistantTool):
    name = "query_records"
    side = "server"
    description = (
        "Consulta registros de una entidad. Devuelve solo lo que el usuario "
        "tiene permiso de leer (se aplica el control de acceso). Acepta filtros "
        "opcionales y un límite."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "entity": {"type": "string", "description": "Nombre de la entidad"},
            "filters": {"type": "object", "description": "Filtros campo->valor (opcional)"},
            "limit": {"type": "integer", "description": "Máximo de registros (1-100)", "default": 25},
        },
        "required": ["entity"],
    }

    def execute(self, session: Any, *, entity: str, filters: dict | None = None,
                limit: int = 25, **_: Any) -> Any:
        from uniback.api.schema_registry import get_entity
        from uniback.persistence.query import get_query
        from uniback.utils.common import prepare_content

        reg = get_entity(entity)
        if reg is None or reg.orm_class is None:
            return {"error": f"Entidad no consultable: {entity}"}
        orm = reg.orm_class
        db = session.db_session
        limit = max(1, min(int(limit or 25), _MAX_LIMIT))

        params: dict = {}
        if filters:
            params["filter"] = filters

        try:
            stmt, _count = get_query(db, orm, preselection={"authr_reference": False}, **params)
        except Exception as e:  # filtros inválidos, etc.
            return {"error": f"Consulta inválida: {e}"}

        # ACL de lectura: solo para entidades polimórficas (FunctionalObject).
        try:
            from uniback.authorization.authr_filters import authr_filter
            from uniback.persistence.models.core import class_to_object_type_id
            from uniback.persistence.models.sysadmin import PermissionType

            obj_type_id = class_to_object_type_id.get(orm)
            if obj_type_id is not None:
                read_perm = db.query(PermissionType).filter(PermissionType.name == "read").one()
                clause = authr_filter(db, orm, read_perm.id, [obj_type_id], session.identity_id)
                if clause is False:
                    return {"entity": entity, "count": 0, "records": []}
                if clause is not None and not isinstance(clause, bool):
                    stmt = stmt.where(clause)
        except Exception:
            log.exception("[assistant] fallo aplicando ACL a query_records(%s)", entity)

        rows = db.execute(stmt.limit(limit)).scalars().all()
        return {"entity": entity, "count": len(rows), "records": prepare_content(rows)}


class NavigateToTool(AssistantTool):
    name = "navigate_to"
    side = "ui"
    description = (
        "Lleva al usuario a una pantalla del frontend. Usa rutas de pantalla "
        "dinámica como '/d/<screen_name>' (p.ej. '/d/seed_batches_browser')."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "route": {"type": "string", "description": "Ruta del front, p.ej. '/d/seed_batches_browser'"},
            "reason": {"type": "string", "description": "Breve motivo mostrado al usuario (opcional)"},
        },
        "required": ["route"],
    }


class ProposeTableRowsTool(AssistantTool):
    name = "propose_table_rows"
    side = "ui"
    description = (
        "Propone una o varias filas para añadir a una entidad. NO las crea: el "
        "overlay las muestra al usuario y solo se dan de alta si confirma. Úsala "
        "cuando el usuario pida añadir elementos a una tabla."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "entity": {"type": "string", "description": "Entidad destino, p.ej. 'seed_batches'"},
            "rows": {
                "type": "array",
                "description": "Lista de objetos campo->valor según el schema de la entidad",
                "items": {"type": "object"},
            },
        },
        "required": ["entity", "rows"],
    }


def build_builtin_tools() -> List[AssistantTool]:
    return [
        ListEntitiesTool(),
        GetEntitySchemaTool(),
        QueryRecordsTool(),
        NavigateToTool(),
        ProposeTableRowsTool(),
    ]
