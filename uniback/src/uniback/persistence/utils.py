from __future__ import annotations

from typing import List, Tuple, Union, Any, Type
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

def create_or_update_entity(session: Session, clazz: Type, attributes: List[str], t: Union[List, Tuple], id_attr="uuid", update=False):
    """Ported and adapted from biobarcoding.common.pg_helpers.create_or_update_entity"""
    uuid_idx = attributes.index(id_attr)
    if t[uuid_idx] is not None:
        stmt = select(clazz).where(getattr(clazz, id_attr) == t[uuid_idx])
        i = session.scalar(stmt)
    else:
        i = None
        
    modify_attributes = update
    if not i:
        entity = clazz()
        add_to_session = True
        modify_attributes = True
    else:
        entity = i
        add_to_session = False

    if modify_attributes:
        for idx, f in enumerate(t):
            v = f
            attr = attributes[idx]
            if isinstance(attr, tuple):
                # attr format: (foreign_clazz, foreign_filter_field, foreign_refer_field, target_attr_name)
                foreign_clazz = attr[0]
                foreign_filter_field = attr[1]
                foreign_refer_field = attr[2]
                target_attr = attr[3]
                stmt2 = select(foreign_clazz).where(getattr(foreign_clazz, foreign_filter_field) == v)
                i2 = session.scalar(stmt2)
                v = getattr(i2, foreign_refer_field) if i2 else None
                attr = target_attr
            else:
                if isinstance(f, dict):
                    old_v = getattr(entity, attr)
                    if old_v is not None and isinstance(old_v, dict):
                        v = {**old_v, **f}
            setattr(entity, attr, v)

    if add_to_session:
        session.add(entity)

    return entity

def load_table(session: Session, clazz: Type, d: dict):
    """Ported and adapted from biobarcoding.common.pg_helpers.load_table"""
    for k, v in d.items():
        stmt = select(clazz).where(clazz.uuid == k)
        i = session.scalar(stmt)
        if not i:
            ins = clazz()
            ins.uuid = k
            ins.name = v
            session.add(ins)
        else:
            i.name = v

def load_table_extended(session: Session, clazz: Type, attributes: List[str], values: List[Tuple], update=False):
    """Ported and adapted from biobarcoding.common.pg_helpers.load_table_extended"""
    for t in values:
        create_or_update_entity(session, clazz, attributes, t, update=update)

def load_many_to_many_table(session: Session, clazz: Type, lclazz: Type, rclazz: Type, attributes: List[str], values: List[Tuple]):
    """Ported and adapted from biobarcoding.common.pg_helpers.load_many_to_many_table"""
    for t in values:
        # Find id of left and right sides
        left = session.scalar(select(lclazz).where(lclazz.name == t[0]))
        right = session.scalar(select(rclazz).where(rclazz.name == t[1]))
        
        if left and right:
            stmt = select(clazz).where(and_(getattr(clazz, attributes[0]) == left.id, getattr(clazz, attributes[1]) == right.id))
            i = session.scalar(stmt)
            if not i:
                ins = clazz()
                setattr(ins, attributes[0], left.id)
                setattr(ins, attributes[1], right.id)
                session.add(ins)


def create_or_update_acl_reference_object(session: Session, clazz: Type, uuid_: str, permissions: List[Tuple]):
    """Ported and adapted from biobarcoding.common.pg_helpers.create_or_update_acl_reference_object"""
    from uniback.persistence.models.core import class_to_object_type_id
    from uniback.persistence.models.sysadmin import (
        ACL,
        ACLDetail,
        Group,
        Identity,
        Organization,
        ObjectTypePermissionType,
        PermissionType,
        Role,
    )

    object_type_id = class_to_object_type_id.get(clazz)
    if object_type_id is None:
        print(f"Warning: Object type not registered for class {clazz}")
        return

    session.autoflush = False

    # Check if the reference object exists, if not create it
    stmt = select(clazz).where(clazz.uuid == uuid_)
    i = session.scalar(stmt)

    stmt_acl = select(ACL).where(ACL.object_uuid == uuid_)
    i2 = session.scalar(stmt_acl)

    if not i:
        ins = clazz()
        ins.uuid = uuid_
    else:
        ins = i

    ins.authr_reference = True
    ins.is_deleted = True  # To avoid showing it in the UI or filters and search
    session.add(ins)

    add_acl_detail = True
    # Create or update associated ACL
    if not i2:
        acl = ACL()
        acl.object_type = object_type_id
        acl.object_uuid = uuid_
        session.add(acl)
    else:
        acl = i2
        if len(acl.details) > 0:
            add_acl_detail = False

    if add_acl_detail:
        for p in permissions:
            # Find authorizable from authorizable type and its name
            auth_class = (
                Role
                if p[0] == "role"
                else Identity
                if p[0] == "identity"
                else Group
                if p[0] == "group"
                else Organization
                if p[0] == "organization"
                else None
            )

            if auth_class:
                stmt_auth = select(auth_class).where(auth_class.name == p[1])
                authble = session.scalar(stmt_auth)
                if not authble:
                    print(f"Warning: Authorizable {p[1]} of type {p[0]} not found")
                    continue

                # Find permission type from its name
                stmt_perm = select(PermissionType).where(PermissionType.name == p[2])
                perm_type = session.scalar(stmt_perm)
                if not perm_type:
                    print(f"Warning: Permission type {p[2]} not found")
                    continue

                # Check if permission is allowed for object type
                stmt_obj_to_perm = select(ObjectTypePermissionType).where(
                    and_(
                        ObjectTypePermissionType.object_type_id == object_type_id,
                        ObjectTypePermissionType.permission_type_id == perm_type.id,
                    )
                )
                obj_to_perm = session.scalar(stmt_obj_to_perm)

                if not obj_to_perm:
                    print(
                        f"Warning: Permission type {p[2]} not allowed for object type {object_type_id} ({str(clazz)})"
                    )
                    continue

                acl_detail = ACLDetail()
                acl_detail.acl = acl
                acl_detail.authorizable_id = authble.id
                acl_detail.permission_id = perm_type.id
                session.add(acl_detail)
