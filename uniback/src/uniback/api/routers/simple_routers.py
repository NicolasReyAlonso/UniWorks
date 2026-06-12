from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from uniback.api.crud_factory import make_simple_rest_crud
from uniback.api.dependencies import AppSession
from uniback.persistence.query import filter_parse

# Models
from uniback.persistence.models.core import CollectionDetail, FunctionalObject, CaseStudy2FunctionalObject
from uniback.persistence.models.sysadmin import (
    SystemFunction, ACLExpression, ACL
)

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

router_system_functions = make_simple_rest_crud(SystemFunction, "system_functions", alt_methods=dict(get=get_sf), tags=["System Functions"])
