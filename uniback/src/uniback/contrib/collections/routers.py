from typing import Dict

from fastapi import APIRouter
from sqlalchemy import and_
from sqlalchemy.orm import Session

from uniback.api.crud_factory import make_simple_rest_crud
from uniback.api.crudie import make_crudie_rest_crud
from uniback.persistence.models.core import (
    CaseStudy,
    CaseStudy2FunctionalObject,
    CollectionDetail,
    FunctionalObject,
)
from uniback.persistence.query import filter_parse

router = APIRouter()
router.include_router(make_crudie_rest_crud('collection', prefix='/collections', tags=["Collections"]))


# --- Custom Functions: Collections ---

def load_collection_item_to_delete(session: Session, item_id: str):
    parts = item_id.split(',')
    return session.query(CollectionDetail).filter(
        and_(CollectionDetail.collection_id == int(parts[0]), CollectionDetail.functional_object_uuid == parts[1])
    ).one()

def load_collection_item_for_post(session: Session, item: Dict):
    return session.query(CollectionDetail).filter(
        and_(CollectionDetail.collection_id == int(item["collection_id"]), CollectionDetail.functional_object_uuid == item["functional_object_uuid"])
    ).one_or_none()

# --- Custom Functions: Case Studies ---

def custom_case_studies_filter(_filter, session=None):
    clauses = []
    if _filter.get('object_id'):
        _ids = session.query(CaseStudy2FunctionalObject.case_study_id) \
            .filter(filter_parse(CaseStudy2FunctionalObject, {'functional_object_id': _filter.get('object_id')}, session=session)).subquery()
        clauses.append(CaseStudy.id.in_(_ids))
    if _filter.get('object_uuid'):
        _ids = session.query(CaseStudy2FunctionalObject.case_study_id) \
            .join(FunctionalObject, CaseStudy2FunctionalObject.functional_object_id == FunctionalObject.id) \
            .filter(filter_parse(FunctionalObject, {'uuid': _filter.get('object_uuid')}, session=session)).subquery()
        clauses.append(CaseStudy.id.in_(_ids))
    return clauses

def load_case_study_item_to_delete(session: Session, item_id: str):
    parts = item_id.split(',')
    return session.query(CaseStudy2FunctionalObject).filter(
        and_(CaseStudy2FunctionalObject.case_study_id == int(parts[0]), CaseStudy2FunctionalObject.functional_object_id == int(parts[1]))
    ).one()

def load_case_study_item_for_post(session: Session, item: Dict):
    return session.query(CaseStudy2FunctionalObject).filter(
        and_(CaseStudy2FunctionalObject.case_study_id == int(item["case_study_id"]), CaseStudy2FunctionalObject.functional_object_id == int(item["functional_object_id"]))
    ).one_or_none()


# --- Router Instances ---

router_collection_items = make_simple_rest_crud(
    CollectionDetail, "collection_items",
    alt_methods=dict(delete=load_collection_item_to_delete, post=load_collection_item_for_post),
    tags=["Collections"]
)

router_case_studies = make_simple_rest_crud(CaseStudy, "case_studies", aux_filter=custom_case_studies_filter, control_acl=True, tags=["Case Studies"])

router_case_study_items = make_simple_rest_crud(
    CaseStudy2FunctionalObject, "case_study_items",
    alt_methods=dict(delete=load_case_study_item_to_delete, post=load_case_study_item_for_post),
    tags=["Case Studies"]
)
