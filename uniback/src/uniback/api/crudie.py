import json
import os.path
import traceback
from typing import Any, Dict, List, Tuple, Type, Optional, Union
from pydantic import BaseModel

from sqlalchemy import select, func, inspect
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import NoResultFound, ObjectDeletedError

from fastapi import APIRouter, Depends, Request, Response
from uniback.api.dependencies import AppSession, get_n_session, parse_request_params
from uniback.api.schemas.responses import ResponseEnvelope, Issue, IType
from uniback.api.schema_registry import (
    EntityRegistration,
    compute_etag,
    register_entity,
)
from uniback.persistence.query import get_query, filter_parse
from uniback.utils.common import listify, generate_json, get_enriched_json_schema, prepare_content


def log_exception(e):
    import os, sys
    exc_type, exc_obj, exc_tb = sys.exc_info()
    if exc_tb:
        fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
        print(exc_type, fname, exc_tb.tb_lineno)
    print(e)

def orm2dict(*data):
    def model_to_dict(model, instance):
        from sqlalchemy.orm import class_mapper
        try:
            mapper = class_mapper(model)
        except:
            return {}
        columns = [col.key for col in mapper.column_attrs]
        from sqlalchemy.ext.hybrid import hybrid_property
        hybrid_properties = [attr.__name__ for attr in mapper.all_orm_descriptors if isinstance(attr, hybrid_property)]

        result = {}
        for column in columns + hybrid_properties:
            try:
                result[column] = getattr(instance, column)
            except:
                pass
        return result

    dd = [model_to_dict(_.__class__, _) for _ in data if _]
    return dd

def get_orm_pk(orm):
    return inspect(orm).primary_key[0]

def get_orm_pk_value(target):
    pk = inspect(target.__class__).primary_key_from_instance(target)
    return pk[0] if len(pk) == 1 else pk

def get_filtering(key: str, params: dict):
    _filter = listify(params.get('filter', []))
    _v = params.get(key)
    if _v is None:
        _v = params.get('values', {}).get(key)
    if _v is None:
        _v = next(iter([_f.get(key) for _f in _filter if isinstance(_f, dict) and _f.get(key)]), None)
    return _v

def get_orm_params(orm, **params):
    try:
        mapper = inspect(orm)
        columns = set(mapper.column_attrs.keys())
    except:
        columns = set()
    return dict([(k, v) for k, v in params.items() if k in columns])

def get_or_create(session, model, no_flush=False, **params):
    instance = session.query(model).filter_by(**params).first()
    if not instance:
        instance = model(**params)
        if no_flush:
            return instance
        session.add(instance)
        session.flush()
    return instance

# ---------------------------------------------------------------------------
# Registro extensible de entidades CRUDIE. El kernel registra las suyas abajo
# y cada plugin (contrib o externo) registra las propias con
# ``register_crudie_entity`` usando loaders perezosos (los imports de modelos
# solo se ejecutan al resolver, nunca al registrar).
# La resolucion es por prefijo mas largo que case con ``entity`` (reproduce el
# antiguo encadenado de ``startswith``: 'annotation_text' gana a 'annotation').
# ---------------------------------------------------------------------------

_ORM_LOADERS: Dict[str, Any] = {}
_SERVICE_LOADERS: Dict[str, Any] = {}


def register_crudie_entity(prefix: str, orm_loader=None, service_loader=None):
    """Register lazy loaders for an entity prefix handled by CRUDIE routers."""
    if orm_loader is not None:
        _ORM_LOADERS[prefix] = orm_loader
    if service_loader is not None:
        _SERVICE_LOADERS[prefix] = service_loader


def _lookup(loaders: Dict[str, Any], entity: str):
    best = None
    for prefix in loaders:
        if entity.startswith(prefix) and (best is None or len(prefix) > len(best)):
            best = prefix
    return loaders[best]() if best else None


def get_orm(entity: str):
    return _lookup(_ORM_LOADERS, entity)

def get_service(entity: str):
    return _lookup(_SERVICE_LOADERS, entity)


def _register_kernel_crudie_entities():
    def _browser_filter_orm():
        from uniback.persistence.models.sysadmin import BrowserFilter
        return BrowserFilter

    def _browser_filter_service():
        from uniback.services.sys.browser_filters import Service
        return Service

    def _browser_filter_form_service():
        from uniback.services.sys.browser_filters import FormService
        return FormService

    register_crudie_entity("browser_filter", _browser_filter_orm, _browser_filter_service)
    register_crudie_entity("browser_filter_form", service_loader=_browser_filter_form_service)


_register_kernel_crudie_entities()

class BasicService:
    formats = ['json', 'tsv', 'csv', 'xlsx']

    def __init__(self, sess: AppSession):
        self.sess = sess
        self.db = sess.db_session
        self.orm = None # Defined by subclasses

    def prepare_values(self, **values) -> dict:
        return values

    def check_values(self, **values) -> dict:
        return get_orm_params(self.orm, **values)

    def prepare_external_values(self, **values) -> dict:
        return values

    def after_create(self, new_object, **values) -> dict:
        return values

    def after_update(self, new_object, **values) -> dict:
        return values

    def delete_related(self, *content, **kwargs):
        return 0

    def attach_data(self, *content, fast_mode: bool = False) -> list:
        return orm2dict(*content) if fast_mode else list(content)

    def get_query(self, query=None, id=None, aux_filter=None, preselection=None, aux_order=None, **kwargs) -> Tuple[Any, int]:
        if aux_filter is None and hasattr(self, 'aux_filter'):
            aux_filter = self.aux_filter
        if aux_order is None and hasattr(self, 'aux_order'):
            aux_order = self.aux_order
            
        _id = id or kwargs.get('id')
        return get_query(self.db, self.orm, stmt=query, id=_id, aux_filter=aux_filter, 
                         preselection=preselection, aux_order=aux_order, **kwargs)

    def create(self, **kwargs) -> Tuple[Any, int]:
        values = self.prepare_values(**kwargs)
        from sqlalchemy.exc import SQLAlchemyError
        try:
            content = self.orm(**self.check_values(**values))
            self.db.add(content)
            self.db.flush()
        except SQLAlchemyError as e:
            log_exception(e)
            raise e
        foreign_values = self.prepare_external_values(**kwargs)
        self.after_create(content, **foreign_values)
        return content, 1

    def read(self, **kwargs) -> Tuple[Any, int]:
        stmt, count = self.get_query(purpose='read', **kwargs)
        content = self.db.execute(stmt).scalars().all()

        def reply_content(c):
            if not c:
                return c
            cc = listify(c)
            fm = get_filtering('fast_mode', kwargs)
            no_attach = get_filtering('no_attach', kwargs)
            
            if no_attach:
                if fm is False:
                    r = [json.loads(generate_json(_)) for _ in cc]
                else:
                    r = orm2dict(*cc)
            else:
                attached = self.attach_data(*cc, fast_mode=fm)
                if fm is False:
                    r = [json.loads(generate_json(_)) for _ in attached]
                else:
                    r = attached
            return r

        if get_filtering('only_ids', kwargs):
            return [get_orm_pk_value(c) for c in listify(content)], count
        if get_filtering('raw', kwargs):
            return content, count
        
        return reply_content(content), count

    def update(self, id=None, values=None, **kwargs) -> Tuple[Any, int]:
        if values is None:
            values = kwargs.get('values', {})
        _id = id or values.get('id') or kwargs.get('id')
        ids = listify(_id)
        
        changes = self.prepare_values(**values)
        stmt, count = self.get_query(purpose='contribute', id=ids, **kwargs)
        content = self.db.execute(stmt).scalars().all()
        foreign_changes = self.prepare_external_values(**values)
        
        for row in content:
            for k, v in self.check_values(**changes).items():
                try:
                    setattr(row, k, v)
                except:
                    log_exception(f'"{k}" does not exist in "{row}"')
            self.after_update(row, **foreign_changes)
        
        self.db.flush()
        return content, count

    def delete(self, id=None, **kwargs) -> Tuple[Any, int]:
        _id = id or kwargs.get('id')
        ids = listify(_id)
        
        stmt, count = self.get_query(purpose='delete', id=ids, **kwargs)
        content = self.db.execute(stmt).scalars().all()
        
        self.delete_related(*content, **kwargs)
        for row in content:
            self.db.delete(row)
        
        self.db.flush()
        return content, count

    def import_file(self, input_file, **kwargs):
        raise NotImplementedError()

    def export_file(self, **kwargs):
        raise NotImplementedError()

def getCRUDIE(entity: str, sess: AppSession):
    ServiceClass = get_service(entity)
    
    class CRUDIE:
        def __init__(self, sess: AppSession):
            self.sess = sess
            self.service = ServiceClass(sess) if ServiceClass else None
            self.entity = entity

        def create(self, **kwargs):
            try:
                content, count = self.service.create(**kwargs)
                issues = [Issue(type=IType.INFO, message=f'CREATE {self.entity}: Success')]
                status = 201
            except Exception as e:
                self.sess.db_session.rollback()
                log_exception(e)
                issues = [Issue(type=IType.ERROR, message=f'CREATE {self.entity}: Failed')]
                content, count, status = None, 0, 409
            return issues, content, count, status

        def read(self, **kwargs):
            try:
                content, count = self.service.read(**kwargs)
                issues = [Issue(type=IType.INFO, message=f'READ {self.entity}: Success')]
                status = 200
            except Exception as e:
                traceback.print_exc()
                log_exception(e)
                issues = [Issue(type=IType.ERROR, message=f'READ {self.entity}: Failed')]
                content, count, status = None, 0, 400
            return issues, content, count, status

        def update(self, **kwargs):
            try:
                content, count = self.service.update(**kwargs)
                issues = [Issue(type=IType.INFO, message=f'UPDATE {self.entity}: Success')]
                status = 200
            except Exception as e:
                self.sess.db_session.rollback()
                log_exception(e)
                issues = [Issue(type=IType.ERROR, message=f'UPDATE {self.entity}: Failed')]
                content, count, status = None, 0, 409
            return issues, content, count, status

        def delete(self, **kwargs):
            try:
                content, count = self.service.delete(**kwargs)
                issues = [Issue(type=IType.INFO, message=f'DELETE {self.entity}: Success')]
                status = 200
            except Exception as e:
                self.sess.db_session.rollback()
                log_exception(e)
                issues = [Issue(type=IType.ERROR, message=f'DELETE {self.entity}: Failed')]
                content, count, status = None, 0, 404
            return issues, content, count, status

        def import_data(self, input_file, **kwargs):
            try:
                content, count = self.service.import_file(input_file, **kwargs)
                issues = [Issue(type=IType.INFO, message=f'IMPORT {self.entity}: Success')]
                status = 200
            except Exception as e:
                self.sess.db_session.rollback()
                log_exception(e)
                issues = [Issue(type=IType.ERROR, message=f'IMPORT {self.entity}: Failed')]
                content, count, status = None, 0, 409
            return issues, content, count, status

        def export_data(self, **kwargs):
            try:
                content, count = self.service.export_file(**kwargs)
                issues = [Issue(type=IType.INFO, message=f'EXPORT {self.entity}: Success')]
                status = 200
            except Exception as e:
                self.sess.db_session.rollback()
                log_exception(e)
                issues = [Issue(type=IType.ERROR, message=f'EXPORT {self.entity}: Failed')]
                content, count, status = None, 0, 409
            return issues, content, count, status

    return CRUDIE(sess)

def make_crudie_rest_crud(entity: str, prefix: str = None, tags: List[str] = None, schema: Type[BaseModel] = None):
    router = APIRouter(prefix=prefix or f"/{entity}", tags=tags if tags is not None else [entity])

    orm_class = None
    pydantic_schema = schema
    if pydantic_schema is None:
        try:
            orm_class = get_orm(entity)
            if orm_class is not None:
                from uniback.utils.common import sqlalchemy_to_pydantic
                pydantic_schema = sqlalchemy_to_pydantic(orm_class)
        except Exception:
            pydantic_schema = None

    register_entity(EntityRegistration(
        name=entity,
        path=prefix or f"/{entity}",
        factory="crudie",
        orm_class=orm_class,
        pydantic_schema=pydantic_schema,
        tags=list(tags or []),
    ))

    @router.get("/schema.json", response_model=ResponseEnvelope)
    async def get_json_schema(request: Request, response: Response):
        target_schema = pydantic_schema
        effective_orm = orm_class
        if target_schema is None:
            # Re-derive lazily; covers cases where the ORM became importable
            # after this router was built (e.g. plugins).
            late_orm = get_orm(entity)
            if late_orm is not None:
                effective_orm = late_orm
                try:
                    from uniback.utils.common import sqlalchemy_to_pydantic
                    target_schema = sqlalchemy_to_pydantic(late_orm)
                except Exception:
                    target_schema = None

        if not target_schema:
            return ResponseEnvelope(content={})

        enriched_schema = get_enriched_json_schema(
            target_schema,
            str(request.url),
            title=entity.replace("_", " ").title().replace(" ", ""),
            description=f"Schema for {entity}",
            orm_class=effective_orm,
        )
        etag = compute_etag(enriched_schema)
        if request.headers.get("if-none-match") == etag:
            return Response(status_code=304, headers={"ETag": etag})

        response.headers["ETag"] = etag
        return ResponseEnvelope(content=enriched_schema)

    @router.get("/", response_model=ResponseEnvelope)
    async def list_items(request: Request, sess: AppSession = Depends(get_n_session(read_only=True))):
        crudie = getCRUDIE(entity, sess)
        params = await parse_request_params(request)
        issues, content, count, status = crudie.read(**params)
        return ResponseEnvelope(content=prepare_content(content), count=count, issues=issues)

    @router.post("/", response_model=ResponseEnvelope)
    async def create_item(request: Request, sess: AppSession = Depends(get_n_session())):
        crudie = getCRUDIE(entity, sess)
        params = await parse_request_params(request)
        issues, content, count, status = crudie.create(**params.get('values', {}))
        return ResponseEnvelope(content=prepare_content(content), count=count, issues=issues)

    @router.get("/{id}", response_model=ResponseEnvelope)
    async def get_item(id: Any, sess: AppSession = Depends(get_n_session(read_only=True))):
        crudie = getCRUDIE(entity, sess)
        issues, content, count, status = crudie.read(id=id)
        return ResponseEnvelope(content=prepare_content(content), count=count, issues=issues)

    @router.put("/{id}", response_model=ResponseEnvelope)
    async def update_item(id: Any, request: Request, sess: AppSession = Depends(get_n_session())):
        crudie = getCRUDIE(entity, sess)
        params = await parse_request_params(request)
        issues, content, count, status = crudie.update(id=id, values=params.get('values', {}))
        return ResponseEnvelope(content=prepare_content(content), count=count, issues=issues)

    @router.delete("/{id}", response_model=ResponseEnvelope)
    async def delete_item(id: Any, sess: AppSession = Depends(get_n_session())):
        crudie = getCRUDIE(entity, sess)
        issues, content, count, status = crudie.delete(id=id)
        return ResponseEnvelope(content=prepare_content(content), count=count, issues=issues)

    return router
