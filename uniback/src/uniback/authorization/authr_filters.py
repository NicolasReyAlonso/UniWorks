from __future__ import annotations
import traceback
from datetime import datetime, timezone
from typing import Any, List, Optional, Union, Dict

from sqlalchemy import and_, or_, literal, select, union, ColumnElement
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from uniback.authorization import ast_evaluator, authr_expression, string_to_ast
from uniback.config.settings import get_cached_settings
from uniback.persistence.models.sysadmin import (
    ACL,
    ACLDetail,
    Authorizable,
    GroupIdentity,
    Identity,
    OrganizationIdentity,
    PermissionType,
    Role,
    RoleIdentity,
)
from uniback.persistence.models.core import FunctionalObject

# Collection and CollectionDetail are required for full biobarcoding compatibility.
# If they are not yet migrated to uniback, they should be added to persistence/models/core.py
try:
    from uniback.persistence.models.core import Collection, CollectionDetail
except ImportError:
    Collection = None
    CollectionDetail = None


def can_execute(db: Session, rule: str | None, identity_id: Optional[int] = None) -> bool:
    """Check if the identity can execute based on the rule."""
    if rule and rule.lower() != "true":
        try:
            # Load the identity object as ast_evaluator requires it for attribute access (role, group, etc.)
            if identity_id is None:
                identity_id = -1
            ident = db.get(Identity, identity_id)
            if not ident:
                return False
            ast = string_to_ast(authr_expression, rule)
            return ast_evaluator(ast, ident)
        except Exception:
            traceback.print_exc()
            return False
    return True


def authr_filter(
    db: Session,
    orm: Any = None,
    permission_types_ids: Union[int, List[int]] = None,
    object_types_ids: Optional[List[int]] = None,
    identity_id: Optional[int] = None,
    object_uuids: Optional[List[Any]] = None,
    time: Optional[datetime] = None,
    permission_flag: bool = False,
    authorizable_flag: bool = False,
    reference_entity: Union[int, str] = -1,
    explanation: Optional[List[str]] = None,
) -> Union[ColumnElement[bool], bool, Dict[str, Any]]:
    """
    Revised ACL filter for Uniback, matching biobarcoding functionality with SQLAlchemy 2.0 syntax.
    """

    def related_authr_ids(ident_id: int) -> List[int]:
        """Get the organizations, groups, and roles associated to an identity."""
        if ident_id == -1:
            return []
        stmt = select(Authorizable.id).outerjoin(
            OrganizationIdentity, OrganizationIdentity.organization_id == Authorizable.id
        ).outerjoin(
            GroupIdentity, GroupIdentity.group_id == Authorizable.id
        ).outerjoin(
            RoleIdentity, RoleIdentity.role_id == Authorizable.id
        ).where(
            or_(
                Authorizable.id == ident_id,
                OrganizationIdentity.identity_id == ident_id,
                GroupIdentity.identity_id == ident_id,
                RoleIdentity.identity_id == ident_id
            )
        )
        return list(db.execute(stmt).scalars().all())

    def related_perm_ids(perm_id: int) -> List[int]:
        """Get the permissions that also allow perm_id (equal or superior rank)."""
        rank_subquery = select(PermissionType.rank).where(PermissionType.id == perm_id).scalar_subquery()
        stmt = select(PermissionType.id).where(
            or_(PermissionType.id == perm_id, PermissionType.rank >= rank_subquery)
        )
        return list(db.execute(stmt).scalars().all())

    def default_reference_entity(clazz, ident_id: int | None):
        if not clazz or not hasattr(clazz, 'authr_reference'):
            return None
        stmt = select(clazz.uuid).where(clazz.authr_reference == True).limit(1)
        return db.execute(stmt).scalar()

    # 1. Check if ACL use is enabled
    settings = get_cached_settings()
    if not settings.auth.enabled:
        if explanation is not None:
            explanation.append('Access open to every object (ACL disabled in config)')
        return True

    # 2. Resolve identity_id and Authorizables
    if identity_id is None:
        # Default to -1 (any identity) if not provided, as uniback avoids global session state
        identity_id = -1

    sys_admin_role_stmt = select(Role.id).where(Role.name == 'sys-admin')
    sys_admin_role_id = db.execute(sys_admin_role_stmt).scalar()

    authorizable_ids = []
    is_sys_admin = False
    
    if identity_id != -1:
        authorizable_ids = related_authr_ids(identity_id)
        if explanation is not None:
            explanation.append(f"Identity {identity_id} is member of: {authorizable_ids}")
        
        if not authorizable_ids and explanation is None:
            raise ValueError(f"A valid identity must be provided when obtaining entities (identity_id={identity_id} not found)")
            
        is_sys_admin = sys_admin_role_id in authorizable_ids if sys_admin_role_id else False

    if is_sys_admin:
        if explanation is not None:
            explanation.append('User is sys-admin. Has access to everything.')
        return True

    # 3. Resolve ORM Class
    if orm is None and object_uuids:
        stmt = select(FunctionalObject).where(FunctionalObject.uuid == object_uuids[0])
        tmp = db.execute(stmt).scalar_one_or_none()
        orm = tmp.__class__ if tmp else FunctionalObject
    elif orm is None:
        orm = FunctionalObject

    # 4. Reference Entity Recursion
    exp_queries = {}
    if reference_entity is not None:
        if reference_entity == -1:
            reference_entity = default_reference_entity(orm, identity_id)

        if reference_entity:
            ref_check = authr_filter(
                db, orm, permission_types_ids, object_types_ids, 
                identity_id=identity_id, object_uuids=[reference_entity], 
                time=time, reference_entity=None, explanation=explanation
            )
            if explanation is None:
                # Verify if reference entity itself passes the filter.
                stmt = select(orm.uuid).where(ref_check).where(orm.uuid == reference_entity)
                if db.execute(stmt).first():
                    return True
            else:
                if isinstance(ref_check, dict) and "direct" in ref_check:
                    exp_queries["reference"] = ref_check["direct"]

    # 5. Construct Filter Clauses
    filter_clause = {}
    if object_types_ids:
        filter_clause["object_types"] = ACL.object_type.in_(object_types_ids)
    
    if object_uuids:
        filter_clause["object_uuids"] = ACL.object_uuid.in_(object_uuids)

    curr_time = time or datetime.now(timezone.utc)
    filter_clause["start_time"] = or_(ACLDetail.validity_start == None, ACLDetail.validity_start <= curr_time)
    filter_clause["end_time"] = or_(ACLDetail.validity_end == None, ACLDetail.validity_end >= curr_time)

    if identity_id != -1:
        filter_clause["authorizables"] = ACLDetail.authorizable_id.in_(authorizable_ids)

    if isinstance(permission_types_ids, int):
        filter_clause["permission_types"] = ACLDetail.permission_id.in_(related_perm_ids(permission_types_ids))
    elif permission_types_ids:
        filter_clause["permission_types"] = ACLDetail.permission_id.in_(permission_types_ids)

    # 6. Uncollected vs Collected
    uncollected_stmt = select(ACL.object_uuid).join(ACLDetail).where(and_(*filter_clause.values()))
    
    collected_stmt = None
    if Collection and CollectionDetail:
        coll_filter = [filter_clause[k] for k in ('start_time', 'end_time', 'authorizables', 'permission_types') if k in filter_clause]
        if object_uuids:
            coll_filter.append(CollectionDetail.functional_object_uuid.in_(object_uuids))
        
        collected_stmt = (
            select(CollectionDetail.functional_object_uuid)
            .join(Collection, CollectionDetail.collection_id == Collection.id)
            .join(ACL, Collection.uuid == ACL.object_uuid)
            .join(ACLDetail)
            .where(and_(*coll_filter))
        )

    # 7. Return Logic
    if permission_flag or authorizable_flag or explanation is not None:
        entities = []
        if explanation is not None:
            entities.extend([
                ACL.id, ACL.object_uuid, ACLDetail.id, 
                ACLDetail.authorizable_id, ACLDetail.permission_id,
                ACLDetail.validity_start, ACLDetail.validity_end
            ])
        if permission_flag: entities.append(ACLDetail.permission)
        if authorizable_flag: entities.append(ACLDetail.authorizable)
        
        q_uncoll = select(*entities, literal("0")).select_from(ACL).join(ACLDetail).where(ACL.object_uuid.in_(uncollected_stmt))
        if collected_stmt is not None:
            q_coll = select(*entities, literal("1")).select_from(ACL).join(ACLDetail).where(ACL.object_uuid.in_(collected_stmt))
            exp_queries["direct"] = union(q_uncoll, q_coll)
        else:
            exp_queries["direct"] = q_uncoll
        return exp_queries
    else:
        final_uuids_stmt = union(uncollected_stmt, collected_stmt) if collected_stmt is not None else uncollected_stmt
        clause = orm.uuid.in_(final_uuids_stmt)
        # Also allow access if the user is the owner
        if hasattr(orm, "owner_id") and identity_id != -1:
            clause = or_(clause, orm.owner_id == identity_id)
        return clause


def get_authr_explanation(
    db: Session,
    identity_id: Optional[int] = None,
    object_uuid: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Get human-readable explanation of why an identity has (or hasn't) access to an object.
    """
    explanation = []
    exp_q = authr_filter(
        db,
        orm=None,
        permission_types_ids=None,
        object_types_ids=None,
        identity_id=identity_id,
        object_uuids=[object_uuid] if object_uuid else None,
        time=None,
        permission_flag=False,
        authorizable_flag=False,
        reference_entity=-1,
        explanation=explanation,
    )

    columns = [
        "ACL ID",
        "ACL UUID",
        "ACL Detail ID",
        "Authorizable ID",
        "Permission ID",
        "Validity Start",
        "Validity End",
        "Collection?",
    ]
    rules = [columns]
    rule_count = 0

    if isinstance(exp_q, dict):
        for _k, q in exp_q.items():
            results = db.execute(q).all()
            rule_count += len(results)
            rules.extend([list(r) for r in results])

    return {"explanation": explanation, "rules": rules, "count": rule_count}
