from typing import Any, Optional

from sqlalchemy.orm import Session

from uniback.api.crud_factory import make_simple_rest_crud
from uniback.api.dependencies import AppSession
from uniback.persistence.models.sysadmin import (
    ACLExpression,
    Group,
    Identity,
    IdentityAuthenticator,
    Organization,
    Role,
    RoleIdentity,
)
from uniback.persistence.seeding import tm_default_users

# --- Custom Functions: Identities ---

def custom_identities_filter(_filter, session=None):
    return [Identity.uuid.notin_(list(tm_default_users.keys()))]

def get_current_identity(session: Session, identity_id: Any, sess: Optional[AppSession] = None):
    if identity_id is not None:
        try:
            val = int(identity_id)
            if val == 0 and sess:
                identity_id = sess.identity_id
            return session.query(Identity).filter(Identity.id == identity_id).first()
        except (ValueError, TypeError):
            pass
    return None

def get_identity_roles(session: Session, identity_id: Any, sess: Optional[AppSession] = None):
    if identity_id is not None:
        try:
            val = int(identity_id)
            if val == 0 and sess:
                identity_id = sess.identity_id
            return session.query(Role).join(RoleIdentity).filter(RoleIdentity.identity_id == identity_id).all()
        except (ValueError, TypeError):
            pass
    return None


# --- Router Instances ---

router_identities = make_simple_rest_crud(Identity, "identities", alt_methods=dict(get=get_current_identity),
    aux_filter=custom_identities_filter, default_filter={'-': {}}, tags=["Identities, Roles, Organizations and Groups"])

router_identities_authenticators = make_simple_rest_crud(IdentityAuthenticator, "identities_authenticators", tags=["Identities, Roles, Organizations and Groups"])
router_roles = make_simple_rest_crud(Role, "roles", tags=["Identities, Roles, Organizations and Groups"])
router_identities_roles = make_simple_rest_crud(RoleIdentity, "identities_roles", alt_methods=dict(get=get_identity_roles), tags=["Identities, Roles, Organizations and Groups"])
router_groups = make_simple_rest_crud(Group, "groups", tags=["Identities, Roles, Organizations and Groups"])
router_organizations = make_simple_rest_crud(Organization, "organizations", tags=["Identities, Roles, Organizations and Groups"])
router_acl_expressions = make_simple_rest_crud(ACLExpression, "acl_expressions", disabled_methods={'list', 'create', 'get', 'delete'}, tags=["ACLs"])
