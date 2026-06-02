from __future__ import annotations

import bcrypt
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, Request
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

try:
    from firebase_admin import auth as firebase_auth
except ImportError:
    firebase_auth = None

from uniback.persistence.models.sysadmin import (
    Authenticator,
    Identity,
    IdentityAuthenticator,
    Role,
    RoleIdentity,
)

TM_DEFAULT_ROLES = {
    "sys-admin": "c79b4ff7-9576-45f6-a439-551ac23c563b",
    "guest": "feb13f20-4223-4602-a195-a3ea14615982",
}

TM_DEFAULT_USERS = {
    "0fc2b361-847c-4b2e-8fbd-533092133eef": "admin",
    "74d20b2c-5b49-462c-8d19-8a72f47b5d1b": "_anonymous",
    "91c8008e-97d5-440c-b3fc-f5a409a44768": "test_user",
    "1c8b0500-32d2-40ce-8da0-4fc772f4c3a3": "celery_user",
}


class AuthService:
    @staticmethod
    def authenticate_request(
        request: Request, db: Session
    ) -> Tuple[IdentityAuthenticator, List[str]]:
        """
        Authenticate a request based on headers or query parameters.
        Returns the IdentityAuthenticator and list of roles.
        """
        # 1. Extract credentials
        tok_dict: Dict[str, Any] = {}
        if "Authorization" in request.headers:
            # Firebase token
            auth_token = request.headers["Authorization"].split(" ")[1]
            if firebase_auth:
                try:
                    tok_dict = firebase_auth.verify_id_token(auth_token)
                    tok_dict["auth_method"] = "firebase"
                except Exception as e:
                    print(f"DEBUG AUTH 401 Firebase: {str(e)}", flush=True)
                    raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {str(e)}")
            else:
                # Fallback or placeholder if firebase_admin is not installed
                tok_dict = {"firebase": {"token": auth_token}, "auth_method": "firebase"}
        elif "X-API-Key" in request.headers:
            user = request.query_params.get("user")
            tok_dict = {
                "api_key": request.headers["X-API-Key"],
                "auth_method": "local-api-key",
                "user": user,
            }
        elif "user" in request.query_params:
            tok_dict = {"user": request.query_params.get("user"), "auth_method": "local"}

        if not tok_dict:
            print("DEBUG AUTH 401 NO INFO PROVIDED", flush=True)
            raise HTTPException(status_code=401, detail="No authentication information provided")

        return AuthService.prepare_identity(tok_dict, db)

    @staticmethod
    def prepare_identity(
        tok_dict: Dict[str, Any], db: Session
    ) -> Tuple[IdentityAuthenticator, List[str]]:
        def initialize_identity_roles(identity: Identity, db: Session):
            # Role initialization applies to non-system users
            if str(identity.uuid) not in TM_DEFAULT_USERS:
                # if "sys-admin" role is empty (of normal identities),
                # add current identity if it is a normal identity, add identity to sys-admin
                sys_admin_uuid = TM_DEFAULT_ROLES["sys-admin"]
                sys_admin_role = db.query(Role).filter(Role.uuid == sys_admin_uuid).first()
                if sys_admin_role:
                    found = False
                    for rol_ident in sys_admin_role.identities:
                        if str(rol_ident.identity.uuid) not in TM_DEFAULT_USERS:
                            found = True
                            break
                    if not found:
                        db.add(RoleIdentity(identity_id=identity.id, role_id=sys_admin_role.id))

                # if current identity does not have a role, add it to guest
                if len(identity.roles) == 0:
                    guest_uuid = TM_DEFAULT_ROLES["guest"]
                    guest_role = db.query(Role).filter(Role.uuid == guest_uuid).first()
                    if guest_role:
                        db.add(RoleIdentity(identity_id=identity.id, role_id=guest_role.id))

        auth_method = tok_dict.get("auth_method")
        identity: Optional[Identity] = None
        ident_auth: Optional[IdentityAuthenticator] = None
        roles: List[str] = []
        name = tok_dict.get("user")
        email = tok_dict.get("email")

        if auth_method == "local-api-key":
            authenticator = (
                db.query(Authenticator).filter(Authenticator.name == "local-api-key").first()
            )
            identity = db.query(Identity).filter(Identity.name == name).first()
            if identity:
                ident_auth = (
                    db.query(IdentityAuthenticator)
                    .filter(
                        and_(
                            IdentityAuthenticator.identity_id == identity.id,
                            IdentityAuthenticator.authenticator_id == authenticator.id,
                        )
                    )
                    .first()
                )
                if ident_auth:
                    found = False
                    # authenticator_info is a list of API keys in bcs-backend
                    for d in ident_auth.authenticator_info or []:
                        if bcrypt.checkpw(
                            tok_dict["api_key"].encode("utf-8"), d["hash"].encode("utf-8")
                        ):
                            now = datetime.now(timezone.utc)
                            valid_from = d.get("valid_from")
                            valid_until = d.get("valid_until")

                            is_valid = True
                            if valid_from and datetime.fromisoformat(valid_from) > now:
                                is_valid = False
                            if valid_until and datetime.fromisoformat(valid_until) < now:
                                is_valid = False

                            if is_valid:
                                roles = d.get("roles", [])
                                found = True
                                break
                    if not found:
                        raise HTTPException(status_code=401, detail="Invalid API Key or expired")
            if not ident_auth:
                raise HTTPException(status_code=401, detail="Authentication failed")

        elif auth_method == "local":
            authenticator = db.query(Authenticator).filter(Authenticator.name == "local").first()
            if not authenticator:
                authenticator = Authenticator(name="local")
                db.add(authenticator)
                db.flush()

            identity = db.query(Identity).filter(Identity.name == name).first()
            if not identity:
                # Create default identity if it doesn't exist for local (as in bcs-backend)
                identity = Identity(name=name, can_login=True)
                db.add(identity)
                db.flush()

            ident_auth = (
                db.query(IdentityAuthenticator)
                .filter(
                    and_(
                        IdentityAuthenticator.identity_id == identity.id,
                        IdentityAuthenticator.authenticator_id == authenticator.id,
                    )
                )
                .first()
            )
            if not ident_auth:
                ident_auth = IdentityAuthenticator(
                    identity_id=identity.id, authenticator_id=authenticator.id, name=name
                )
                db.add(ident_auth)

        elif auth_method == "firebase":
            authenticator = db.query(Authenticator).filter(Authenticator.name == "firebase").first()
            if not authenticator:
                authenticator = Authenticator(name="firebase")
                db.add(authenticator)
                db.flush()

            if tok_dict.get("sign_in_provider") == "anonymous":
                name = "_anonymous"
            else:
                email = tok_dict.get("email")
                name = tok_dict.get("name") or email or tok_dict.get("uid")

            if not identity and name:
                identity = db.query(Identity).filter(Identity.name == name).first()
            if not identity and email:
                identity = db.query(Identity).filter(Identity.email == email).first()

            if not identity:
                identity = Identity(name=name, email=email, can_login=True)
                db.add(identity)
                db.flush()

            ident_auth = (
                db.query(IdentityAuthenticator)
                .filter(
                    and_(
                        IdentityAuthenticator.identity_id == identity.id,
                        IdentityAuthenticator.authenticator_id == authenticator.id,
                    )
                )
                .first()
            )
            if not ident_auth:
                ident_auth = IdentityAuthenticator(
                    identity_id=identity.id,
                    authenticator_id=authenticator.id,
                    name=name,
                    email=email,
                    authenticator_info=tok_dict,
                )
                db.add(ident_auth)

        if not ident_auth:
            raise HTTPException(status_code=401, detail="Authentication failed")

        # Update last login
        ident_auth.last_login_time = datetime.now(timezone.utc)

        # Roles initialization
        initialize_identity_roles(identity, db)

        db.commit()
        return ident_auth, roles


class ApiKeyService:
    @staticmethod
    def list_api_keys(db: Session, identity_id: int) -> List[Dict[str, Any]]:
        authenticator = db.query(Authenticator).filter(Authenticator.name == "local-api-key").first()
        if not authenticator:
            return []
        if identity_id is not None:
            ident_auth = (
                db.query(IdentityAuthenticator)
                .filter(
                    and_(
                        IdentityAuthenticator.identity_id == identity_id,
                        IdentityAuthenticator.authenticator_id == authenticator.id,
                    )
                )
                .first()
            )
            if not ident_auth or not ident_auth.authenticator_info:
                return []

            return [
                {
                    "roles": d["roles"],
                    "key_idx": d["key_idx"],
                    "valid_from": d.get("valid_from"),
                    "valid_until": d.get("valid_until"),
                }
                for d in ident_auth.authenticator_info
            ]
        else:
            # List all identities with API keys (compatible with bcs-backend)
            identities = (
                db.query(IdentityAuthenticator)
                .filter(IdentityAuthenticator.authenticator_id == authenticator.id)
                .all()
            )
            return identities

    @staticmethod
    def create_api_key(
        db: Session,
        identity_id: int,
        roles: List[str],
        valid_from: str = None,
        valid_until: str = None,
    ) -> Dict[str, Any]:
        authenticator = (
            db.query(Authenticator).filter(Authenticator.name == "local-api-key").first()
        )
        if not authenticator:
            raise HTTPException(status_code=500, detail="API Key Authenticator not configured")

        # Get identity name
        identity = db.get(Identity, identity_id)
        if not identity:
            raise HTTPException(status_code=404, detail="Identity not found")
        identity_name = identity.name

        # Validate roles
        db_roles = db.query(Role).filter(Role.name.in_(roles)).all()
        if len(db_roles) != len(roles):
            raise HTTPException(status_code=400, detail="One or more specified roles do not exist")

        ident_auth = (
            db.query(IdentityAuthenticator)
            .filter(
                and_(
                    IdentityAuthenticator.identity_id == identity_id,
                    IdentityAuthenticator.authenticator_id == authenticator.id,
                )
            )
            .first()
        )
        if not ident_auth:
            ident_auth = IdentityAuthenticator(
                identity_id=identity_id,
                authenticator_id=authenticator.id,
                authenticator_info=[],
            )
            db.add(ident_auth)

        # Generate new key
        api_key = uuid.uuid4().hex
        key_hash = bcrypt.hashpw(api_key.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        
        # Find next key_idx
        used_idxs = {d["key_idx"] for d in ident_auth.authenticator_info}
        key_idx = 1
        while key_idx in used_idxs:
            key_idx += 1

        new_key_data = {
            "key_idx": key_idx,
            "hash": key_hash,
            "roles": roles,
            "valid_from": valid_from or datetime.now(timezone.utc).isoformat(),
            "valid_until": valid_until,
        }
        
        # Update JSONB field (need to make a copy for SQLAlchemy to detect change if using mutable JSON)
        info = list(ident_auth.authenticator_info or [])
        info.append(new_key_data)
        ident_auth.authenticator_info = info
        db.commit()

        return {
            "api_key": api_key,
            "name": identity_name,
            "key_idx": key_idx,
            "roles": roles,
            "valid_from": new_key_data["valid_from"],
            "valid_until": valid_until,
        }

    @staticmethod
    def delete_api_key(db: Session, identity_id: int, key_idx: int) -> bool:
        authenticator = db.query(Authenticator).filter(Authenticator.name == "local-api-key").first()
        ident_auth = (
            db.query(IdentityAuthenticator)
            .filter(
                and_(
                    IdentityAuthenticator.identity_id == identity_id,
                    IdentityAuthenticator.authenticator_id == authenticator.id,
                )
            )
            .first()
        )
        if not ident_auth or not ident_auth.authenticator_info:
            return False
        
        original_len = len(ident_auth.authenticator_info)
        ident_auth.authenticator_info = [
            d for d in ident_auth.authenticator_info if d["key_idx"] != key_idx
        ]
        
        if len(ident_auth.authenticator_info) == original_len:
            return False
            
        if not ident_auth.authenticator_info:
            db.delete(ident_auth)
        
        db.commit()
        return True
