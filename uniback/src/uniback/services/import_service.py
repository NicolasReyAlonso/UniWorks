"""
Motor generico de insercion de datos.

Opera contra cualquier entidad registrada en ``schema_registry`` sin acoplarse
a un dominio concreto. Resuelve referencias FK declaradas como escalar o como
``{"by": campo, "value": ...}`` apoyandose en ``fk_resolver_registry``, valida
con el ``pydantic_schema`` derivado del ORM cuando esta disponible y devuelve
un informe fila a fila para que la UI pueda mostrar errores parciales sin
abortar la importacion completa.
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any, Dict, Iterable, List, Mapping, Optional

from sqlalchemy import inspect as sa_inspect, select
from sqlalchemy.orm import Session, RelationshipProperty

from uniback.api.schema_registry import EntityRegistration, get_entity
from uniback.plugins.contracts import ImportRowResult
from uniback.plugins.registries import fk_resolver_registry


log = logging.getLogger(__name__)


VALID_MODES = ("insert", "upsert", "dry_run")


def _build_fk_index(orm_class) -> Dict[str, Dict[str, Any]]:
    """
    Devuelve {nombre_columna: {target_class, target_pk_name}} para cada FK
    declarada sobre ``orm_class``. Usado para resolver lookups dict.
    """
    mapper = sa_inspect(orm_class)
    out: Dict[str, Dict[str, Any]] = {}
    for col in mapper.columns:
        if not col.foreign_keys:
            continue
        # Tomamos la primera FK declarada en la columna.
        fk = next(iter(col.foreign_keys))
        target_table = fk.column.table
        # Localizamos la clase ORM mapeada a esa tabla.
        target_class = None
        for cls_mapper in mapper.registry.mappers:
            if cls_mapper.local_table is target_table:
                target_class = cls_mapper.class_
                break
        if target_class is None:
            continue
        out[col.name] = {
            "target_class": target_class,
            "target_pk_name": fk.column.name,
        }
    return out


def _relationship_to_fk(orm_class) -> Dict[str, str]:
    """
    Mapea ``rel_name -> columna_fk`` para las relationships con una sola FK
    local. Permite aceptar ``{"role": {"by": "name", "value": "..."}}`` y
    asignarlo al ``role_id`` correspondiente.
    """
    mapper = sa_inspect(orm_class)
    out: Dict[str, str] = {}
    for rel in mapper.relationships:
        if not isinstance(rel, RelationshipProperty):
            continue
        local_cols = list(rel.local_columns)
        if len(local_cols) != 1:
            continue
        out[rel.key] = local_cols[0].name
    return out


def _resolve_fk_value(db: Session, target_class, raw_value: Any) -> Any:
    """
    Aplica el registro de FK resolvers. Si ninguno gana, devuelve el valor
    original (puede ser ya la PK directamente).
    """
    if raw_value is None:
        return None
    resolved = fk_resolver_registry.resolve(db, target_class, raw_value)
    return resolved if resolved is not None else (raw_value if not isinstance(raw_value, Mapping) else None)


def _prepare_row(
    db: Session,
    reg: EntityRegistration,
    row: Mapping[str, Any],
    fk_index: Mapping[str, Mapping[str, Any]],
    rel_to_fk: Mapping[str, str],
) -> Dict[str, Any]:
    """
    Normaliza una fila: expande relaciones a columnas FK y resuelve lookups.
    No valida tipos; eso lo hace pydantic despues.
    """
    prepared: Dict[str, Any] = {}
    for key, value in row.items():
        # 1) Relationship name -> columna FK subyacente.
        if key in rel_to_fk:
            fk_col = rel_to_fk[key]
            fk_meta = fk_index.get(fk_col)
            if fk_meta is None:
                # Relationship sin FK explicita: ignoramos el atajo.
                continue
            resolved = _resolve_fk_value(db, fk_meta["target_class"], value)
            prepared[fk_col] = resolved
            continue
        # 2) Columna FK explicita con valor compuesto.
        if key in fk_index and isinstance(value, Mapping):
            fk_meta = fk_index[key]
            resolved = _resolve_fk_value(db, fk_meta["target_class"], value)
            prepared[key] = resolved
            continue
        # 3) Resto: pasa tal cual.
        prepared[key] = value
    return prepared


def _validate_with_pydantic(reg: EntityRegistration, data: Mapping[str, Any]) -> Dict[str, Any]:
    schema = reg.pydantic_schema
    if schema is None:
        return dict(data)
    try:
        validated = schema.model_validate(data)
        return validated.model_dump(exclude_unset=True)
    except Exception as e:
        raise ValueError(str(e))


def _upsert_lookup(db: Session, reg: EntityRegistration, data: Mapping[str, Any]) -> Optional[Any]:
    """
    Busca una fila existente para upsert. Prioriza la PK; si no esta presente,
    intenta por ``uuid``. Mas adelante esto podra venir de un campo
    ``lookup_fields`` en ``EntityRegistration``.
    """
    orm_class = reg.orm_class
    if orm_class is None:
        return None
    mapper = sa_inspect(orm_class)
    pk_col = mapper.primary_key[0].name
    if pk_col in data and data[pk_col] is not None:
        return db.get(orm_class, data[pk_col])
    if "uuid" in data and data["uuid"] is not None and hasattr(orm_class, "uuid"):
        return db.scalar(select(orm_class).where(orm_class.uuid == data["uuid"]))
    return None


def _assign(obj: Any, data: Mapping[str, Any]) -> None:
    for k, v in data.items():
        if k.startswith("_"):
            continue
        if not hasattr(obj, k):
            continue
        if callable(getattr(obj, k)):
            continue
        setattr(obj, k, v)


def import_rows(
    db: Session,
    entity_name: str,
    rows: Iterable[Mapping[str, Any]],
    *,
    mode: str = "insert",
    stop_on_error: bool = False,
) -> Dict[str, Any]:
    """
    Inserta/upserta filas en ``entity_name``. Devuelve un informe con totales
    y un detalle por fila apto para ResponseEnvelope.

    Args:
        db: sesion SQLAlchemy ya abierta (transaccion del caller).
        entity_name: nombre tal y como esta registrado en ``schema_registry``.
        rows: iterable de dicts. Soporta FK como escalar o ``{"by", "value"}``.
        mode: ``insert`` | ``upsert`` | ``dry_run``.
        stop_on_error: si True, interrumpe en la primera fila fallida.

    El caller decide el commit. En ``dry_run`` hacemos rollback al final para
    no dejar rastro aunque el caller haga commit por error.
    """
    if mode not in VALID_MODES:
        raise ValueError(f"mode invalido: {mode!r}. Validos: {VALID_MODES}")

    reg = get_entity(entity_name)
    if reg is None or reg.orm_class is None:
        raise LookupError(f"Entidad '{entity_name}' no registrada (o sin ORM class)")

    orm_class = reg.orm_class
    fk_index = _build_fk_index(orm_class)
    rel_to_fk = _relationship_to_fk(orm_class)

    results: List[ImportRowResult] = []
    ok_count = 0
    err_count = 0

    # Envolvemos todo el import en un savepoint exterior. En modo ``dry_run``
    # lo rollbackeamos al final para no tocar la tx del caller; en el resto
    # de modos lo commiteamos (la tx exterior sigue viva, el commit final lo
    # decide el caller).
    outer_sp = db.begin_nested()
    try:
        for idx, raw_row in enumerate(rows):
            if not isinstance(raw_row, Mapping):
                results.append(ImportRowResult(index=idx, ok=False, error="fila no es un objeto"))
                err_count += 1
                if stop_on_error:
                    break
                continue

            row_sp = db.begin_nested()
            try:
                prepared = _prepare_row(db, reg, raw_row, fk_index, rel_to_fk)
                validated = _validate_with_pydantic(reg, prepared)

                obj = None
                if mode == "upsert":
                    obj = _upsert_lookup(db, reg, validated)
                if obj is None:
                    obj = orm_class()
                _assign(obj, validated)
                db.add(obj)
                db.flush()

                pk_name = sa_inspect(orm_class).primary_key[0].name
                pk_value = getattr(obj, pk_name, None)
                row_sp.commit()
                results.append(ImportRowResult(index=idx, ok=True, pk=pk_value))
                ok_count += 1
            except Exception as e:  # noqa: BLE001
                row_sp.rollback()
                log.warning("import fila %s fallo: %s", idx, e)
                results.append(ImportRowResult(index=idx, ok=False, error=str(e), raw=dict(raw_row)))
                err_count += 1
                if stop_on_error:
                    break

        if mode == "dry_run":
            outer_sp.rollback()
        else:
            outer_sp.commit()
    except Exception:
        if outer_sp.is_active:
            outer_sp.rollback()
        raise

    return {
        "entity": entity_name,
        "mode": mode,
        "total": ok_count + err_count,
        "ok": ok_count,
        "errors": err_count,
        "rows": [asdict(r) for r in results],
    }


__all__ = ["import_rows", "VALID_MODES"]
