from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from uniback.api.crud_factory import make_simple_rest_crud
from uniback.api.dependencies import AppSession
from uniback.persistence.query import filter_parse

# Models
from uniback.persistence.models.core import CollectionDetail, FunctionalObject, CaseStudy2FunctionalObject
from uniback.persistence.models.sysadmin import (
    Identity, IdentityAuthenticator, Role, RoleIdentity, Group, Organization, 
    SystemFunction, ACLExpression, ACL
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

def get_sf(session: Session, sf_id: Any, sess: Optional[AppSession] = None):
    if sf_id is None:
        sfs = session.query(SystemFunction).all()
        acls = session.query(ACL).filter(ACL.object_uuid.in_([sf.uuid for sf in sfs if hasattr(sf, 'uuid')])).all()
        if acls:
            exprs = session.query(ACLExpression).filter(ACLExpression.acl_id.in_([acl.id for acl in acls])).all()
            uuid_sf = {sf.uuid: sf for sf in sfs if hasattr(sf, 'uuid')}
            acl_sf = {acl.id: acl.object_uuid for acl in acls}
            for expr in exprs:
                if expr.acl_id in acl_sf:
                    sf_uuid = acl_sf[expr.acl_id]
                    if sf_uuid in uuid_sf:
                        o = uuid_sf[sf_uuid]
                        o.can_execute_rule = expr.expression
                        o.acl_expression_id = expr.id
            return sfs
    return None

# --- Custom Functions: Collections ---

def custom_functional_object_filter(_filter, session=None):
    clauses = []
    if _filter.get('case_study_id'):
        _ids = session.query(CaseStudy2FunctionalObject.functional_object_id) \
            .filter(filter_parse(CaseStudy2FunctionalObject, {'case_study_id': _filter.get('case_study_id')}, session=session)).subquery()
        clauses.append(FunctionalObject.id.in_(_ids))
    if _filter.get('collection_id'):
        _ids = session.query(CollectionDetail.functional_object_uuid) \
            .filter(filter_parse(CollectionDetail, {'collection_id': _filter.get('collection_id')}, session=session)).subquery()
        clauses.append(FunctionalObject.uuid.in_(_ids))
    return clauses

# --- Router Instances ---

router_functional_objects = make_simple_rest_crud(
    FunctionalObject, "functional_objects",
    aux_filter=custom_functional_object_filter,
    tags=["Functional Objects"]
)

router_identities = make_simple_rest_crud(Identity, "identities", alt_methods=dict(get=get_current_identity),
    aux_filter=custom_identities_filter, default_filter={'-': {}}, tags=["Identities, Roles, Organizations and Groups"])

router_identities_authenticators = make_simple_rest_crud(IdentityAuthenticator, "identities_authenticators", tags=["Identities, Roles, Organizations and Groups"])
router_roles = make_simple_rest_crud(Role, "roles", tags=["Identities, Roles, Organizations and Groups"])
router_identities_roles = make_simple_rest_crud(RoleIdentity, "identities_roles", alt_methods=dict(get=get_identity_roles), tags=["Identities, Roles, Organizations and Groups"])
router_groups = make_simple_rest_crud(Group, "groups", tags=["Identities, Roles, Organizations and Groups"])
router_organizations = make_simple_rest_crud(Organization, "organizations", tags=["Identities, Roles, Organizations and Groups"])
router_system_functions = make_simple_rest_crud(SystemFunction, "system_functions", alt_methods=dict(get=get_sf), tags=["System Functions"])
router_acl_expressions = make_simple_rest_crud(ACLExpression, "acl_expressions", disabled_methods={'list', 'create', 'get', 'delete'}, tags=["ACLs"])
