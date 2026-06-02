from __future__ import annotations

import base64
import json
import traceback
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict, Generator, Optional
from urllib.parse import unquote

from fastapi import Depends, HTTPException, Request
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from uniback.persistence.session import (
    current_session_ctx,
    get_session,
    get_session_manager,
)
from uniback.persistence.models.sysadmin import Identity, SystemFunction, ACL, ACLExpression
from uniback.persistence.models.core import ObjectType
from uniback.utils.serialization import deserialize_to_object, decompress_session


class AppSession:
    """The session container, equivalent to the previous dataclass."""

    def __init__(
        self,
        identity_id: int,
        identity_name: str,
        roles: list[str] | None = None,
        login_time: str | None = None,
    ):
        self.identity_id = identity_id
        self.identity_name = identity_name
        self.roles = roles or []
        self.login_time = login_time
        self.identity: Optional[Identity] = None
        self.db_session: Optional[Session] = None
        self.original_identity_id: Optional[int] = None


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency to provide a database session."""

    yield from get_session()


def is_function_name(s: str | None) -> bool:
    if s is None or s.lower() == "true":
        return False
    t = s.split(" ")
    if len(t) < 4:
        for p in t:
            if not p.isidentifier():
                return False
        return True
    return False


def get_n_session(read_only: bool = False, can_execute_rule: str = "True"):
    """
    Dependency that manages session lifecycle, authentication, and authorization.
    Replaces the @n_session decorator from Flask.
    """
    async def n_session_dependency(request: Request) -> Generator[AppSession, None, None]:
        # 1. Extract and Deserialize Session
        session_id = request.cookies.get("session")
        if not session_id:
            raise HTTPException(status_code=401, detail="No active session")

        from uniback.config.settings import get_cached_settings

        settings = get_cached_settings()

        if settings.auth.session_store == "redis":
            from uniback.utils.redis import get_redis_manager

            redis_mgr = get_redis_manager()
            serialized_sess = redis_mgr.client.get(f"session:{session_id}")
            if not serialized_sess:
                raise HTTPException(status_code=401, detail="Session not found in Redis")
        else:
            serialized_sess = session_id

        try:
            try:
                decoded = base64.b64decode(serialized_sess)
                decompressed = decompress_session(decoded)
                sess_data = deserialize_to_object(decompressed)
            except Exception:
                sess_data = deserialize_to_object(serialized_sess)
            
            sess = AppSession(
                identity_id=sess_data.get("identity_id"),
                identity_name=sess_data.get("identity_name"),
                roles=sess_data.get("roles"),
                login_time=sess_data.get("login_time"),
            )
            sess.original_identity_id = sess_data.get("original_identity_id")
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid session")

        # 2. Database Session Setup
        session_manager = get_session_manager()
        db_session = session_manager.get_session()
        sess.db_session = db_session
        
        try:
            # 3. Identity and Impersonation
            ident = db_session.query(Identity).get(sess.identity_id)
            if not ident:
                raise HTTPException(status_code=401, detail="Identity not found")
            
            impersonated_id = request.headers.get('Impersonated-id')
            if impersonated_id and read_only and ident.name in ["celery_user", "test_user"]:
                sess.original_identity_id = sess.identity_id
                sess.identity_id = int(impersonated_id)
                ident = db_session.query(Identity).get(sess.identity_id)
            
            sess.identity = ident

            # 4. SystemFunction and Rule lookup/creation
            route = request.scope.get("route")
            sf_name = ""
            if is_function_name(can_execute_rule):
                sf_name = can_execute_rule
            elif route:
                sf_name = f"{request.method} {route.path}"
            else:
                sf_name = f"{request.method} {request.url.path}"

            sf = db_session.query(SystemFunction).filter(SystemFunction.name == sf_name).first()
            effective_rule = can_execute_rule
            
            if not sf:
                sf = SystemFunction(
                    name=sf_name,
                    can_execute_rule=can_execute_rule if not is_function_name(can_execute_rule) else None
                )
                db_session.add(sf)
                db_session.flush()
                
                # Create ACL for the system function
                sys_func_type = db_session.query(ObjectType).filter(ObjectType.name == "sys-function").first()
                if sys_func_type:
                    acl = ACL(object_type=sys_func_type.id, object_uuid=sf.uuid)
                    db_session.add(acl)
                    db_session.flush()
                    
                    acl_expr = ACLExpression(acl_id=acl.id, expression=sf.can_execute_rule)
                    db_session.add(acl_expr)
            else:
                # Get rule from database
                now = datetime.now(timezone.utc)
                sys_func_type = db_session.query(ObjectType).filter(ObjectType.name == "sys-function").first()
                if sys_func_type:
                    rule_obj = db_session.query(ACLExpression).join(ACL).filter(
                        and_(
                            ACL.object_type == sys_func_type.id,
                            ACL.object_uuid == sf.uuid,
                            or_(ACLExpression.validity_start == None, ACLExpression.validity_start <= now),
                            or_(ACLExpression.validity_end == None, ACLExpression.validity_end >= now)
                        )
                    ).first()
                    if rule_obj:
                        effective_rule = rule_obj.expression

            # 5. Authorization Check (can_execute)
            from uniback.authorization.authr_filters import can_execute
            if not can_execute(db_session, effective_rule, ident.id):
                raise HTTPException(
                    status_code=403, 
                    detail=f"User {sess.identity_name} cannot execute this function ({sf_name})"
                )

            # 6. Dry Execute check
            if request.query_params.get("dry_execute"):
                # We raise an exception to stop execution but with a success message
                # Note: In a real app we might want a better way to return this
                raise HTTPException(
                    status_code=200,
                    detail={
                        "status": "success",
                        "content": {
                            "can_execute": True,
                            "identity": sess.identity_name,
                            "identity_id": sess.identity_id
                        }
                    }
                )

            # 7. Store in request.state
            request.state.n_session = sess

            token = current_session_ctx.set(sess)
            try:
                yield sess
            finally:
                current_session_ctx.reset(token)

            # 8. Post-Execution: Commit if not read_only
            if not read_only:
                db_session.commit()
                
        except Exception as e:
            db_session.rollback()
            if isinstance(e, HTTPException):
                raise e
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db_session.close()

    return n_session_dependency


def chew_data(param: Any) -> Any:
    """Ported from biobarcoding.rest.chew_data"""
    if isinstance(param, bytes):
        try:
            param = param.decode()
        except Exception:
            pass
    
    if not isinstance(param, str):
        return param

    # Try literal_eval
    try:
        import ast
        param = ast.literal_eval(param)
    except Exception:
        pass
    
    if not isinstance(param, str):
        return param

    # Try unquote
    try:
        param = unquote(param)
    except Exception:
        pass

    # Try json.loads
    try:
        param = json.loads(param)
    except Exception:
        pass
        
    return param


async def parse_request_params(request: Request) -> Dict[str, Any]:
    """
    Ported and adapted from biobarcoding.rest.parse_request_params.
    """
    kwargs = {'filter': [], 'order': [], 'pagination': {}, 'values': {}, 'searchValue': ''}
    
    # 1. From Query Parameters
    for key, value in request.query_params.items():
        chewed = chew_data(value)
        if key in kwargs:
            kwargs[key] = chewed
        else:
            kwargs['values'][key] = chewed

    # 2. From JSON Body
    if request.method in ["POST", "PUT"]:
        try:
            # We need to be careful not to consume the body if it's needed later
            # But in CRUD factory we usually want it here
            body = await request.json()
            if isinstance(body, dict):
                for key in ['filter', 'order', 'pagination', 'searchValue']:
                    if key in body:
                        kwargs[key] = body[key]
                
                for k, v in body.items():
                    if k not in ['filter', 'order', 'pagination', 'searchValue']:
                        kwargs['values'][k] = v
        except Exception:
            pass
            
    return kwargs