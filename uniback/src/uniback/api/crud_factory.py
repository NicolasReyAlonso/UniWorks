from __future__ import annotations
from typing import Any, Callable, Dict, List, Optional, Set, Type, Union
from fastapi import APIRouter, Depends, Request, Response, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy import select

from uniback.api.dependencies import get_n_session, AppSession
from uniback.api.schemas.responses import ResponseEnvelope
from uniback.api.schema_registry import (
    EntityRegistration,
    build_entity_schema,
    compute_etag,
    register_entity,
)
from uniback.persistence.query import get_query, parse_request_params
from uniback.authorization.authr_filters import authr_filter
from uniback.utils.common import orm2json, prepare_content, sqlalchemy_to_pydantic, get_enriched_json_schema


def _format_error(e: Exception) -> Any:
    """Render an exception as a JSON-friendly per-row error payload."""
    if isinstance(e, ValidationError):
        return e.errors(include_url=False)
    if isinstance(e, LookupError):
        return [{"type": "not_found", "msg": str(e)}]
    if isinstance(e, ValueError):
        return [{"type": "value_error", "msg": str(e)}]
    return [{"type": "internal", "msg": str(e)}]


def register_api(
    router: APIRouter,
    handlers: Dict[str, Callable],
    url_prefix: str = "/",
    pk: str = "id",
    disabled_methods: Set[str] = None
):
    """
    Registers CRUD routes on a router. 
    Kept separate to allow registration of custom handler implementations.
    """
    disabled_methods = disabled_methods or set()
    
    # List
    if "list" not in disabled_methods and (h := handlers.get("list")):
        router.add_api_route(url_prefix, h, methods=["GET"], response_model=ResponseEnvelope)
    
    # Create
    if "create" not in disabled_methods and (h := handlers.get("create")):
        router.add_api_route(url_prefix, h, methods=["POST"], response_model=ResponseEnvelope)
        
    # Get one
    if "get" not in disabled_methods and (h := handlers.get("get")):
        router.add_api_route(f"{url_prefix}{{{pk}}}", h, methods=["GET"], response_model=ResponseEnvelope)
        
    # Update
    if "update" not in disabled_methods and (h := handlers.get("update")):
        router.add_api_route(f"{url_prefix}{{{pk}}}", h, methods=["PUT"], response_model=ResponseEnvelope)
        
    # Delete
    if "delete" not in disabled_methods and (h := handlers.get("delete")):
        router.add_api_route(f"{url_prefix}{{{pk}}}", h, methods=["DELETE"], response_model=ResponseEnvelope)

def make_simple_rest_crud(
    entity: Type,
    entity_name: str,
    execution_rules: Dict[str, str] = None,
    aux_filter: Optional[Callable] = None,
    default_filter: Optional[Dict] = None,
    alt_methods: Optional[Dict[str, Callable]] = None,
    disabled_methods: Set[str] = None,
    soft_delete_by_default: bool = False,
    control_acl: bool = False,
    tags: List[str] = None,
    exclude_from_create: Optional[List[str]] = None,
    exclude_from_update: Optional[List[str]] = None,
    exclude_from_read: Optional[List[str]] = None,
):
    """
    Factory to generate a CRUD router for an entity.
    Adapted from biobarcoding.rest.make_simple_rest_crud for FastAPI.
    """
    # Create Schema
    final_exclude_create = exclude_from_create or []
    
    # Automatic exclusions for FunctionalObject on CREATE only
    try:
        from uniback.persistence.models.core import FunctionalObject
        if issubclass(entity, FunctionalObject):
            for field in ["id", "uuid", "creation_time"]:
                if field not in final_exclude_create:
                    final_exclude_create.append(field)
    except (ImportError, TypeError):
        pass

    # Read Schema
    final_exclude_read = exclude_from_read or []

    # Automatic exclusions for FunctionalObject on READ
    try:
        from uniback.persistence.models.core import FunctionalObject
        if issubclass(entity, FunctionalObject):
            for field in ["ts_vector", "ts_vector_update_time"]:
                if field not in final_exclude_read:
                    final_exclude_read.append(field)
    except (ImportError, TypeError):
        pass

    # Update Schema
    final_exclude_update = exclude_from_update or []

    # The primary key is addressed via the path (PUT /e/{id}) or the bulk
    # item id, never part of the update body. Excluding it keeps update
    # payloads REST-conventional and lets bulk update validate without
    # requiring the client to echo the id inside `data`.
    try:
        from sqlalchemy import inspect as _sa_inspect
        for _pk_col in _sa_inspect(entity).primary_key:
            if _pk_col.key not in final_exclude_update:
                final_exclude_update.append(_pk_col.key)
    except Exception:
        pass

    create_schema = None
    update_schema = None
    read_schema = None
    
    try:
        create_schema = sqlalchemy_to_pydantic(entity, exclude=final_exclude_create)
        update_schema = sqlalchemy_to_pydantic(entity, exclude=final_exclude_update)
        read_schema = sqlalchemy_to_pydantic(entity, exclude=final_exclude_read)
    except Exception:
        pass


    def apply_read_schema(content: Any) -> Any:
        if read_schema is None or content is None:
            return content
        try:
            if isinstance(content, list):
                return [read_schema.model_validate(item).model_dump() for item in content]
            return read_schema.model_validate(content).model_dump()
        except Exception:
            return content
    execution_rules = execution_rules or {}
    router = APIRouter(prefix=f"/{entity_name}", tags=tags if tags is not None else [entity_name])
    
    if default_filter is None:
        default_filter = {'authr_reference': False}

    # --- HANDLERS ---

    async def list_items(
        request: Request,
        sess: AppSession = Depends(get_n_session(read_only=True, can_execute_rule=execution_rules.get("r", "True")))
    ):
        db = sess.db_session
        
        # ACL Filter
        clause = None
        if control_acl:
            from uniback.persistence.models.core import class_to_object_type_id
            from uniback.persistence.models.sysadmin import PermissionType
            read_perm = db.query(PermissionType).filter(PermissionType.name == "read").one()
            clause = authr_filter(db, entity, read_perm.id, [class_to_object_type_id.get(entity)], sess.identity_id)

        params = parse_request_params(await request.json() if request.method == "POST" else request.query_params)

        if alt_methods and "get" in alt_methods:
            # Note: alt_methods expect (db, _id), here _id is None for list
            try:
                entities = alt_methods["get"](db, None, sess=sess)
            except TypeError:
                entities = alt_methods["get"](db, None)

            if entities is not None:
                # Manual ACL check if needed
                if control_acl and isinstance(entities, list):
                    passed = []
                    from uniback.persistence.models.core import class_to_object_type_id
                    from uniback.persistence.models.sysadmin import PermissionType
                    read_perm = db.query(PermissionType).filter(PermissionType.name == "read").one()
                    for e in entities:
                        if not hasattr(e, 'uuid'):
                            passed.append(e)
                            continue
                        e_clause = authr_filter(db, entity, read_perm.id, [class_to_object_type_id.get(entity)], sess.identity_id, object_uuids=[e.uuid])
                        if isinstance(e_clause, bool):
                            if e_clause: passed.append(e)
                        else:
                            check_stmt = select(entity.id).where(entity.id == e.id).where(e_clause)
                            if db.execute(check_stmt).scalar():
                                passed.append(e)
                    entities = passed

                return ResponseEnvelope(content=apply_read_schema(prepare_content(entities)), count=len(entities) if isinstance(entities, list) else 0)

        # Default behavior
        stmt, count = get_query(db, entity, aux_filter=aux_filter, preselection=default_filter, **params)
        
        if clause is not None and isinstance(clause, bool) is False:
            stmt = stmt.where(clause)
            
        result = db.execute(stmt).scalars().all()
        
        if params.get('values', {}).get('only_ids') or params.get('only_ids'):
            from uniback.persistence.query import get_orm_pk_value
            result = [get_orm_pk_value(c) for c in result]
        else:
            # Convert ORM objects to serializable dicts
            result = prepare_content(result)
            result = apply_read_schema(result)

        return ResponseEnvelope(content=result, count=count)

    async def get_item(
        _id: int,
        sess: AppSession = Depends(get_n_session(read_only=True, can_execute_rule=execution_rules.get("r", "True")))
    ):
        db = sess.db_session
        
        obj = None
        if alt_methods and "get" in alt_methods:
            try:
                obj = alt_methods["get"](db, _id, sess=sess)
            except TypeError:
                obj = alt_methods["get"](db, _id)

        if obj is None:
            obj = db.get(entity, _id)

        if not obj:
            raise HTTPException(status_code=404, detail=f"{entity_name} not found")
            
        if control_acl:
            from uniback.persistence.models.core import class_to_object_type_id
            from uniback.persistence.models.sysadmin import PermissionType
            read_perm = db.query(PermissionType).filter(PermissionType.name == "read").one()
            
            objs = obj if isinstance(obj, list) else [obj]
            passed = []
            for o in objs:
                if not hasattr(o, 'uuid'):
                    passed.append(o)
                    continue
                clause = authr_filter(db, entity, read_perm.id, [class_to_object_type_id.get(entity)], sess.identity_id, object_uuids=[o.uuid])
                if isinstance(clause, bool):
                    if clause: passed.append(o)
                else:
                    check_stmt = select(entity.id).where(entity.id == o.id).where(clause)
                    if db.execute(check_stmt).scalar():
                        passed.append(o)
            
            if not passed:
                raise HTTPException(status_code=403, detail="Forbidden")
            
            content = passed[0] if not isinstance(obj, list) else passed
            return ResponseEnvelope(content=apply_read_schema(prepare_content(content)), count=len(passed))

        return ResponseEnvelope(content=apply_read_schema(prepare_content(obj)), count=1 if not isinstance(obj, list) else len(obj))

    async def create_item(
        request: Request,
        sess: AppSession = Depends(get_n_session(can_execute_rule=execution_rules.get("c", "True")))
    ):
        db = sess.db_session
        data = await request.json()
        
        if create_schema:
            try:
                validated = create_schema.model_validate(data)
                data = validated.model_dump(exclude_unset=True)
            except Exception as e:
                raise HTTPException(status_code=422, detail=str(e))

        if alt_methods and "post" in alt_methods:
            try:
                obj = alt_methods["post"](db, data, sess=sess)
            except TypeError:
                obj = alt_methods["post"](db, data)
            if obj is None:
                obj = entity()
        else:
            obj = entity()
            
        for k, v in data.items():
            if hasattr(obj, k) and not k.startswith('_') and not callable(getattr(obj, k)):
                setattr(obj, k, v)
        
        db.add(obj)
        db.flush()
        db.refresh(obj)
        return ResponseEnvelope(content=apply_read_schema(prepare_content(obj)))

    async def update_item(
        _id: int,
        request: Request,
        sess: AppSession = Depends(get_n_session(can_execute_rule=execution_rules.get("u", "True")))
    ):
        db = sess.db_session
        data = await request.json()
        
        if update_schema:
            try:
                validated = update_schema.model_validate(data)
                data = validated.model_dump(exclude_unset=True)
            except Exception as e:
                raise HTTPException(status_code=422, detail=str(e))

        if alt_methods and "put" in alt_methods:
            try:
                obj = alt_methods["put"](db, {"_id": _id, **data}, sess=sess)
            except TypeError:
                obj = alt_methods["put"](db, {"_id": _id, **data})
        else:
            obj = db.get(entity, _id)
            
        if not obj:
            raise HTTPException(status_code=404, detail=f"{entity_name} not found")

        for k, v in data.items():
            if hasattr(obj, k) and not k.startswith('_') and not callable(getattr(obj, k)):
                setattr(obj, k, v)
                
        db.add(obj)
        db.flush()
        db.refresh(obj)
        return ResponseEnvelope(content=apply_read_schema(prepare_content(obj)))

    async def delete_item(
        _id: int,
        request: Request,
        sess: AppSession = Depends(get_n_session(can_execute_rule=execution_rules.get("d", "True")))
    ):
        db = sess.db_session
        
        if alt_methods and "delete" in alt_methods:
            try:
                obj = alt_methods["delete"](db, _id, sess=sess)
            except TypeError:
                obj = alt_methods["delete"](db, _id)
        else:
            obj = db.get(entity, _id)
            
        if not obj:
            raise HTTPException(status_code=404, detail=f"{entity_name} not found")
            
        soft_delete = soft_delete_by_default or request.query_params.get("soft_delete") == "true"
        
        if soft_delete:
            if hasattr(obj, "is_deleted"):
                obj.is_deleted = True
                db.add(obj)
            else:
                db.delete(obj)
        else:
            db.delete(obj)
            
        return ResponseEnvelope(content={"status": "deleted"})

    handlers = {
        "list": list_items,
        "get": get_item,
        "create": create_item,
        "update": update_item,
        "delete": delete_item
    }

    register_entity(EntityRegistration(
        name=entity_name,
        path=f"/{entity_name}",
        factory="simple",
        orm_class=entity,
        pydantic_schema=create_schema,
        tags=list(tags or []),
    ))

    # Bulk endpoint: mixed create/update/delete. Each item is classified by:
    #   _op == "delete" + id  -> delete
    #   id present            -> update (full row, same as PUT)
    #   no id                 -> create
    # ?on_error=partial (default) wraps each row in a savepoint so failed rows
    # don't roll back successful ones. ?on_error=abort fails the whole batch on
    # the first error.
    @router.post("/bulk")
    async def bulk_write(
        request: Request,
        sess: AppSession = Depends(get_n_session(can_execute_rule=execution_rules.get("c", "True"))),
    ):
        on_error = request.query_params.get("on_error", "partial")
        if on_error not in ("partial", "abort"):
            raise HTTPException(status_code=400, detail="on_error must be 'partial' or 'abort'")

        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Body must be a JSON array")
        if not isinstance(body, list):
            raise HTTPException(status_code=400, detail="Body must be a JSON array")

        db = sess.db_session
        results: List[Dict[str, Any]] = []
        summary = {"created": 0, "updated": 0, "deleted": 0, "failed": 0}

        def classify(item: Dict[str, Any]) -> str:
            if not isinstance(item, dict):
                raise ValueError("Each item must be an object")
            if item.get("_op") == "delete":
                return "delete"
            return "update" if item.get("id") is not None else "create"

        def validate(op: str, data: Dict[str, Any]) -> Dict[str, Any]:
            schema = create_schema if op == "create" else update_schema
            if schema is None:
                return data
            validated = schema.model_validate(data)
            # exclude_unset for both create and update: only persist
            # client-provided fields so ORM/DB defaults and the polymorphic
            # discriminator (object_type_id) are not clobbered with None.
            # Mirrors the single-row create path.
            return validated.model_dump(exclude_unset=True)

        def apply_create(data: Dict[str, Any]) -> Any:
            obj = entity()
            for k, v in data.items():
                if hasattr(obj, k) and not k.startswith("_") and not callable(getattr(obj, k)):
                    setattr(obj, k, v)
            db.add(obj)
            db.flush()
            return obj

        def apply_update(_id: Any, data: Dict[str, Any]) -> Any:
            obj = db.get(entity, _id)
            if not obj:
                raise LookupError(f"{entity_name} {_id} not found")
            for k, v in data.items():
                if hasattr(obj, k) and not k.startswith("_") and not callable(getattr(obj, k)):
                    setattr(obj, k, v)
            db.add(obj)
            db.flush()
            return obj

        def apply_delete(_id: Any) -> None:
            obj = db.get(entity, _id)
            if not obj:
                raise LookupError(f"{entity_name} {_id} not found")
            if soft_delete_by_default and hasattr(obj, "is_deleted"):
                obj.is_deleted = True
                db.add(obj)
            else:
                db.delete(obj)
            db.flush()

        def run_one(idx: int, item: Any) -> Dict[str, Any]:
            op = classify(item)
            if op == "delete":
                apply_delete(item.get("id"))
                return {"idx": idx, "ok": True, "op": "delete", "id": item.get("id")}
            if isinstance(item.get("data"), dict):
                data = item["data"]
            else:
                # Flat row: strip envelope keys so they don't reach validation/setattr.
                data = {k: v for k, v in item.items() if k not in ("_op", "id")}
            validated = validate(op, data)
            obj = apply_create(validated) if op == "create" else apply_update(item.get("id"), validated)
            return {"idx": idx, "ok": True, "op": op, "id": getattr(obj, "id", None)}

        for idx, item in enumerate(body):
            if on_error == "partial":
                sp = db.begin_nested()
                try:
                    res = run_one(idx, item)
                    sp.commit()
                    results.append(res)
                    summary[{"create": "created", "update": "updated", "delete": "deleted"}[res["op"]]] += 1
                except Exception as e:
                    sp.rollback()
                    summary["failed"] += 1
                    op_guess = item.get("_op") if isinstance(item, dict) else None
                    if not op_guess and isinstance(item, dict):
                        op_guess = "update" if item.get("id") is not None else "create"
                    results.append({
                        "idx": idx,
                        "ok": False,
                        "op": op_guess,
                        "id": item.get("id") if isinstance(item, dict) else None,
                        "errors": _format_error(e),
                    })
            else:  # abort
                try:
                    res = run_one(idx, item)
                    results.append(res)
                    summary[{"create": "created", "update": "updated", "delete": "deleted"}[res["op"]]] += 1
                except Exception as e:
                    raise HTTPException(
                        status_code=422,
                        detail={"idx": idx, "errors": _format_error(e), "completed": results},
                    )

        return ResponseEnvelope.ok(content={"results": results, "summary": summary})

    # JSON Schema endpoints (with ETag-based conditional GET).
    @router.get("/schema.json")
    async def get_json_schema(request: Request, response: Response):
        if not create_schema:
            return ResponseEnvelope(content={})

        enriched_schema = get_enriched_json_schema(
            create_schema,
            str(request.url),
            title=entity_name.replace("_", " ").title().replace(" ", ""),
            description=f"Schema for {entity_name}",
            orm_class=entity,
        )
        etag = compute_etag(enriched_schema)
        if_none_match = request.headers.get("if-none-match")
        if if_none_match and if_none_match == etag:
            return Response(status_code=304, headers={"ETag": etag})

        response.headers["ETag"] = etag
        return ResponseEnvelope(content=enriched_schema)

    register_api(router, handlers, url_prefix="/", pk="_id", disabled_methods=disabled_methods)

    return router
