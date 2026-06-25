from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from uniback.api.dependencies import AppSession, get_db, get_n_session
from uniback.api.schemas.responses import Issue, ResponseEnvelope
from uniback.persistence.models.sysadmin import (
    Authenticator,
    Identity,
    IdentityAuthenticator,
    SystemFunction,
)
from uniback.contrib.auth.service import ApiKeyService, AuthService, firebase_auth
from uniback.utils.common import hash_password
from uniback.utils.serialization import compress_session, serialize_from_object

router = APIRouter(tags=["Authentication"])


class LoginContent(BaseModel):
    status: str
    identity: str
    message: str = ""


class ApiKeyCreate(BaseModel):
    roles: List[str]
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


class ApiKeyContent(BaseModel):
    api_key: Optional[str] = None
    name: Optional[str] = None
    key_idx: int
    roles: List[str]
    valid_from: str
    valid_until: Optional[str] = None


@router.put("/authn", response_model=ResponseEnvelope)
async def login(request: Request, response: Response, db: Session = Depends(get_db)):
    """Login and establish a session."""
    id_auth, roles = AuthService.authenticate_request(request, db)

    if id_auth.identity.deactivation_time:
        raise HTTPException(status_code=401, detail="Identity disabled, cannot login")

    from uniback.config.settings import get_cached_settings

    settings = get_cached_settings()

    sess_data = {
        "identity_id": id_auth.identity.id,
        "identity_name": id_auth.identity.name,
        "roles": roles,
        "login_time": datetime.now(timezone.utc).isoformat(),
    }

    if settings.auth.session_store == "redis":
        from uniback.utils.redis import get_redis_manager

        session_id = str(uuid.uuid4())
        redis_mgr = get_redis_manager()
        serialized = serialize_from_object(sess_data)
        compressed = compress_session(serialized)
        encoded_data = base64.b64encode(compressed).decode("utf-8")
        redis_mgr.client.setex(
            f"session:{session_id}", settings.auth.session_expire_seconds, encoded_data
        )
        cookie_value = session_id
    else:
        serialized = serialize_from_object(sess_data)
        compressed = compress_session(serialized)
        cookie_value = base64.b64encode(compressed).decode("utf-8")

    response.set_cookie(key="session", value=cookie_value, httponly=True)

    return ResponseEnvelope.ok(
        content=LoginContent(status="success", identity=id_auth.identity.name).model_dump()
    )


@router.get("/authn", response_model=ResponseEnvelope)
async def get_authn(sess: AppSession = Depends(get_n_session())):
    """Obtain current identity details."""
    return ResponseEnvelope.ok(
        content={
            "status": "success",
            "identity": sess.identity_name,
            "identity_id": sess.identity_id,
        }
    )


@router.delete("/authn", response_model=ResponseEnvelope)
async def logout(request: Request, response: Response):
    """Logout by clearing the session cookie and Redis entry if needed."""
    session_id = request.cookies.get("session")
    if session_id:
        from uniback.config.settings import get_cached_settings

        settings = get_cached_settings()
        if settings.auth.session_store == "redis":
            from uniback.utils.redis import get_redis_manager

            redis_mgr = get_redis_manager()
            redis_mgr.client.delete(f"session:{session_id}")

    response.delete_cookie(key="session")
    return ResponseEnvelope.ok(content={"status": "success", "message": "Logged out"})


@router.get("/authn/providers", response_model=ResponseEnvelope)
async def list_auth_providers():
    """List the authentication providers currently available to the client.

    Unavailable providers (e.g. Firebase without configured credentials) are
    omitted so the login/registration UI can render itself dynamically.
    """
    from uniback.config.settings import get_cached_settings

    settings = get_cached_settings()
    providers: List[dict] = []

    if settings.auth.basic_auth_enabled:
        providers.append(
            {
                "id": "basic",
                "label": "Usuario y contraseña",
                "kind": "password",
                "supports_register": True,
            }
        )

    firebase_available = bool(settings.auth.firebase_credentials_path) and firebase_auth is not None
    if firebase_available:
        providers.append(
            {
                "id": "firebase",
                "label": "Google",
                "kind": "oauth",
                "methods": ["google", "anonymous"],
            }
        )

    return ResponseEnvelope.ok(content=providers)


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


@router.post("/authn/register", response_model=ResponseEnvelope)
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Self-registration for the built-in basic (username/password) provider."""
    from uniback.config.settings import get_cached_settings

    settings = get_cached_settings()
    if not settings.auth.basic_auth_enabled:
        raise HTTPException(status_code=404, detail="Basic authentication is disabled")

    username = (payload.username or "").strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    min_len = settings.auth.password_min_length
    if len(payload.password or "") < min_len:
        raise HTTPException(
            status_code=400, detail=f"Password must be at least {min_len} characters long"
        )

    if db.query(Identity).filter(Identity.name == username).first():
        raise HTTPException(status_code=409, detail="Username already exists")

    authenticator = db.query(Authenticator).filter(Authenticator.name == "basic").first()
    if not authenticator:
        authenticator = Authenticator(name="basic")
        db.add(authenticator)
        db.flush()

    identity = Identity(name=username, email=payload.email, can_login=True)
    db.add(identity)
    db.flush()

    db.add(
        IdentityAuthenticator(
            identity_id=identity.id,
            authenticator_id=authenticator.id,
            name=username,
            email=payload.email,
            authenticator_info={"password_hash": hash_password(payload.password)},
        )
    )
    db.commit()

    return ResponseEnvelope.ok(
        content={"status": "success", "identity": username, "message": "Registered"}
    )


@router.get("/user_roles", response_model=ResponseEnvelope)
async def get_user_roles(email: str, db: Session = Depends(get_db)):
    """Obtain roles for a user by email."""
    identity = db.query(Identity).filter(Identity.email == email).first()
    if not identity:
        raise HTTPException(status_code=404, detail=f"User {email} not found")
    return ResponseEnvelope.ok(content={"roles": [ri.role.name for ri in identity.roles]})


@router.get("/token_verification", response_model=ResponseEnvelope)
async def token_verification(request: Request):
    """Verify a token (primarily for NGINX subauth)."""
    auth_token = None
    if "Authorization" in request.headers:
        auth_token = request.headers["Authorization"].split(" ")[1]

    if not auth_token:
        raise HTTPException(status_code=401, detail="The session token is missing")

    if firebase_auth:
        try:
            firebase_auth.verify_id_token(auth_token)
        except Exception:
            raise HTTPException(status_code=401, detail="The session token is not valid or has expired")

    return ResponseEnvelope.ok(
        content={"status": "success", "message": "valid token"},
        issues=[Issue.info("Token verified")],
    )


@router.get("/api_keys/", response_model=ResponseEnvelope)
@router.get("/api_keys/{identity_id}", response_model=ResponseEnvelope)
async def list_api_keys(
    identity_id: Optional[int] = None,
    sess: AppSession = Depends(get_n_session()),
    db: Session = Depends(get_db),
):
    """List API keys for the current user."""
    if identity_id == 0:
        target_id = sess.identity_id
    else:
        target_id = identity_id

    if target_id and target_id != sess.identity_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only list your own API keys")

    result = ApiKeyService.list_api_keys(db, target_id)

    from uniback.utils.common import prepare_content
    prepared_result = prepare_content(result)
    count = len(prepared_result) if isinstance(prepared_result, list) else 0

    return ResponseEnvelope(content=prepared_result, count=count)


@router.post("/api_keys/", response_model=ResponseEnvelope)
async def create_api_key(
    data: ApiKeyCreate, sess: AppSession = Depends(get_n_session()), db: Session = Depends(get_db)
):
    """Create a new API key for the current user."""
    result = ApiKeyService.create_api_key(
        db, sess.identity_id, data.roles, data.valid_from, data.valid_until
    )
    content = result if isinstance(result, dict) else (
        result.model_dump() if hasattr(result, "model_dump") else result.__dict__
    )
    return ResponseEnvelope.ok(content=content)


@router.delete("/api_keys/{key_idx}", response_model=ResponseEnvelope)
async def delete_api_key(
    key_idx: int, sess: AppSession = Depends(get_n_session()), db: Session = Depends(get_db)
):
    """Delete an API key."""
    success = ApiKeyService.delete_api_key(db, sess.identity_id, key_idx)
    if not success:
        raise HTTPException(status_code=404, detail=f"API key {key_idx} not found")
    return ResponseEnvelope.ok(content={"deleted": True})


@router.get("/functions/{prefix}", response_model=ResponseEnvelope)
@router.get("/authn/functions/{prefix}", response_model=ResponseEnvelope)
async def get_user_functions(
    prefix: str, sess: AppSession = Depends(get_n_session()), db: Session = Depends(get_db)
):
    """List functions the current user can execute."""
    from uniback.authorization.authr_filters import can_execute, effective_can_execute_rule

    functions = db.query(SystemFunction).filter(SystemFunction.name.startswith(prefix + "-")).all()

    content = []
    for f in functions:
        # Use the rule actually enforced by the route guards (stored as an
        # ACLExpression), not the (usually empty) can_execute_rule column.
        # Reading the column alone makes can_execute(None) return True and would
        # grant every menu permission to every user, including guests.
        rule = effective_can_execute_rule(db, f)
        allowed = can_execute(db, rule, sess.identity_id)
        content.append({"name": f.name, "permissions": ["read"] if allowed else []})

    return ResponseEnvelope.ok(content=content)


@router.get("/authr_explain", response_model=ResponseEnvelope)
async def authr_explain(
    object_uuid: Optional[uuid.UUID] = None,
    sess: AppSession = Depends(get_n_session()),
    db: Session = Depends(get_db),
):
    """Get explanation of authorization for an object."""
    from uniback.authorization.authr_filters import get_authr_explanation

    return ResponseEnvelope.ok(content=get_authr_explanation(db, sess.identity_id, object_uuid))


@router.get("/authr_ref_entities", response_model=ResponseEnvelope)
async def get_acl_reference_entities(
    sess: AppSession = Depends(get_n_session(can_execute_rule="role in ('sys-admin')")),
    db: Session = Depends(get_db),
):
    """List entities marked as authorization references."""
    from uniback.persistence.models.core import FunctionalObject, ObjectType

    q = db.query(FunctionalObject).filter(FunctionalObject.authr_reference == True).all()

    obj_types = {ot.id: ot.name for ot in db.query(ObjectType).all()}

    content = [
        {
            "id": f.id,
            "uuid": str(f.uuid),
            "name": f.name,
            "object_type": obj_types.get(f.obj_type_id, "unknown"),
            "creation_time": f.creation_time.isoformat() if f.creation_time else None,
        }
        for f in q
    ]
    return ResponseEnvelope.ok(content=content, count=len(content))
