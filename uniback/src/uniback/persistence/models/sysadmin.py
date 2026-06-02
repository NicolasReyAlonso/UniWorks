from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from uniback.persistence.base import GUID, JSONB, ORMBase, get_table_prefix
from uniback.persistence.models.core import ObjectType


def _tn(name: str) -> str:
    """Apply global table prefix to a table name."""

    return f"{get_table_prefix()}{name}"


# AUTHENTICATION / AUTHORIZATION
authorizable_type_id = {
    "identity": 1,
    "organization": 2,
    "group": 3,
    "role": 4,
}


class Authenticator(ORMBase):
    """List of valid authenticators."""

    __tablename__ = _tn("sa_auth_authenticators")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4)
    name: Mapped[str | None] = mapped_column(String(80))
    validation_endpoint: Mapped[str | None] = mapped_column(String(1024))


class Authorizable(ORMBase):
    """Authorizables. Permissions (ACLs) are assigned to Authorizables."""

    __versioned__ = {}
    __tablename__ = _tn("sa_auth_authorizables")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4)
    name: Mapped[str | None] = mapped_column(String(255))
    authorizable_type_id: Mapped[int] = mapped_column(Integer, nullable=False)

    __mapper_args__ = {
        "polymorphic_identity": "authorizable",
        "polymorphic_on": authorizable_type_id,
    }


class Identity(Authorizable):
    """Identities. Users can have one or more authenticators."""

    __versioned__ = {}
    __tablename__ = _tn("sa_auth_identities")
    __mapper_args__ = {
        "polymorphic_identity": authorizable_type_id["identity"],
    }

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_authorizables')}.id"), primary_key=True
    )
    email: Mapped[str | None] = mapped_column(String(255))
    can_login: Mapped[bool] = mapped_column(Boolean, default=False)
    creation_time: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    deactivation_time: Mapped[datetime | None] = mapped_column(DateTime)


class IdentityStoreEntry(ORMBase):
    """Store per-identity information chunks (JSON) by key."""

    __tablename__ = _tn("sa_auth_identity_store_entries")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    identity_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_identities')}.id"), nullable=False
    )
    identity: Mapped[Identity] = relationship(Identity)

    key: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[dict | None] = mapped_column(JSONB)
    update_time: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("identity_id", "key", name=__tablename__ + "_identity_key"),
    )


class IdentityAuthenticator(ORMBase):
    """Recognized identity authenticator."""

    __tablename__ = _tn("sa_auth_identities_authenticators")

    identity_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_identities')}.id"), nullable=False, primary_key=True
    )
    authenticator_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_authenticators')}.id"),
        nullable=False,
        primary_key=True,
    )
    identity: Mapped[Identity] = relationship(
        Identity, backref=backref("authenticators", cascade="all, delete-orphan")
    )
    authenticator: Mapped[Authenticator] = relationship(Authenticator)

    email: Mapped[str | None] = mapped_column(String(255))
    name: Mapped[str | None] = mapped_column(String(255))
    authenticator_info: Mapped[dict | None] = mapped_column(JSONB)
    last_login_time: Mapped[datetime | None] = mapped_column(DateTime)


Index(
    "index_IdentityAuthenticator_on_AuthenticatorInfo_gin",
    IdentityAuthenticator.authenticator_info,
    postgresql_using="gin",
)


class Organization(Authorizable):
    __tablename__ = _tn("sa_auth_organizations")
    __mapper_args__ = {
        "polymorphic_identity": authorizable_type_id["organization"],
    }

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_authorizables')}.id"), primary_key=True
    )


class OrganizationIdentity(ORMBase):
    __tablename__ = _tn("sa_auth_organizations_identities")

    organization_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_organizations')}.id"), nullable=False, primary_key=True
    )
    identity_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_identities')}.id"), nullable=False, primary_key=True
    )
    organization: Mapped[Organization] = relationship(
        Organization, backref=backref("identities", cascade="all, delete-orphan")
    )
    identity: Mapped[Identity] = relationship(
        Identity, backref=backref("organizations", cascade="all, delete-orphan")
    )


class Group(Authorizable):
    __tablename__ = _tn("sa_auth_groups")
    __mapper_args__ = {
        "polymorphic_identity": authorizable_type_id["group"],
    }

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_authorizables')}.id"), primary_key=True
    )


class GroupIdentity(ORMBase):
    __tablename__ = _tn("sa_auth_groups_identities")

    group_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_groups')}.id"), nullable=False, primary_key=True
    )
    identity_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_identities')}.id"), nullable=False, primary_key=True
    )
    group: Mapped[Group] = relationship(
        Group, backref=backref("identities", cascade="all, delete-orphan")
    )
    identity: Mapped[Identity] = relationship(
        Identity, backref=backref("groups", cascade="all, delete-orphan")
    )


class Role(Authorizable):
    __tablename__ = _tn("sa_auth_roles")
    __mapper_args__ = {
        "polymorphic_identity": authorizable_type_id["role"],
    }

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_authorizables')}.id"), primary_key=True
    )


class RoleIdentity(ORMBase):
    __tablename__ = _tn("sa_auth_roles_identities")

    role_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_roles')}.id"), nullable=False, primary_key=True
    )
    identity_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_identities')}.id"), nullable=False, primary_key=True
    )
    role: Mapped[Role] = relationship(
        Role, backref=backref("identities", cascade="all, delete-orphan")
    )
    identity: Mapped[Identity] = relationship(
        Identity, backref=backref("roles", cascade="all, delete-orphan")
    )


class SystemFunction(ORMBase):
    """Functions of the system for execution/display permissions."""

    __tablename__ = _tn("sa_auth_functions")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4)
    name: Mapped[str | None] = mapped_column(String(512))
    can_execute_rule: Mapped[str | None] = mapped_column(String(1024))
    acl_expression_id: Mapped[int | None] = mapped_column(Integer)


class SystemFunctionRelation(ORMBase):
    """Relation between system functions."""

    __tablename__ = _tn("sa_auth_functions_rels")

    source_id: Mapped[int] = mapped_column(
        ForeignKey(SystemFunction.id), nullable=False, primary_key=True
    )
    target_id: Mapped[int] = mapped_column(
        ForeignKey(SystemFunction.id), nullable=False, primary_key=True
    )
    relation_type: Mapped[str] = mapped_column(String(20), nullable=False, primary_key=True)

    source: Mapped[SystemFunction] = relationship(
        SystemFunction,
        foreign_keys=[source_id],
        backref=backref("related_to", cascade="all, delete-orphan"),
    )
    target: Mapped[SystemFunction] = relationship(
        SystemFunction,
        foreign_keys=[target_id],
        backref=backref("related_from", cascade="all, delete-orphan"),
    )


class PermissionType(ORMBase):
    __tablename__ = _tn("sa_auth_permission_types")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, default=uuid.uuid4, nullable=False)
    name: Mapped[str | None] = mapped_column(String(80))
    rank: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class ObjectTypePermissionType(ORMBase):
    __tablename__ = _tn("sa_auth_obj_types_perm_types")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    object_type_id: Mapped[int] = mapped_column(
        ForeignKey(ObjectType.id), nullable=False
    )
    permission_type_id: Mapped[int] = mapped_column(
        ForeignKey(PermissionType.id), nullable=False
    )
    object_type: Mapped[ObjectType] = relationship(
        ObjectType, backref=backref("permission_types", cascade="all, delete-orphan")
    )
    permission_type: Mapped[PermissionType] = relationship(
        PermissionType, backref=backref("object_types", cascade="all, delete-orphan")
    )

    __table_args__ = (
        UniqueConstraint("object_type_id", "permission_type_id", name=__tablename__ + "_c1"),
    )


class ACL(ORMBase):
    """List of permissions on an object."""

    __tablename__ = _tn("sa_auth_permissions")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, default=uuid.uuid4, nullable=False)
    object_type: Mapped[int] = mapped_column(ForeignKey(ObjectType.id), nullable=False)
    object_uuid: Mapped[uuid.UUID | None] = mapped_column(GUID, nullable=True)

    __table_args__ = (
        UniqueConstraint("object_uuid", "object_type", name=__tablename__ + "_c1"),
    )


class ACLExpression(ORMBase):
    """Authorization in the form of an expression."""

    __tablename__ = _tn("sa_auth_permissions_expression")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    acl_id: Mapped[int | None] = mapped_column(ForeignKey(ACL.id))
    acl: Mapped[ACL | None] = relationship(
        ACL, backref=backref("expression", cascade="all, delete-orphan")
    )

    expression: Mapped[str | None] = mapped_column(String(500))
    validity_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    validity_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ACLDetail(ORMBase):
    """Detail can be directly specified or generated by an ACLExpression."""

    __tablename__ = _tn("sa_auth_permissions_detail")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    acl_id: Mapped[int] = mapped_column(ForeignKey(ACL.id), nullable=False)
    acl: Mapped[ACL] = relationship(
        ACL, backref=backref("details", cascade="all, delete-orphan")
    )

    acl_expression_id: Mapped[int | None] = mapped_column(
        ForeignKey(ACLExpression.id), nullable=True
    )
    acl_expression: Mapped[ACLExpression | None] = relationship(
        ACLExpression, backref=backref("compiled", cascade="all, delete-orphan")
    )

    authorizable_id: Mapped[int] = mapped_column(
        ForeignKey(Authorizable.id, ondelete="CASCADE"), nullable=False
    )
    authorizable: Mapped[Authorizable] = relationship(Authorizable)

    permission_id: Mapped[int] = mapped_column(
        ForeignKey(PermissionType.id), nullable=False
    )
    permission: Mapped[PermissionType] = relationship(PermissionType)

    validity_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    validity_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


# TASKS
class TaskStatus(ORMBase):
    __tablename__ = _tn("sa_task_statuses")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, default=uuid.uuid4, nullable=False)
    name: Mapped[str | None] = mapped_column(String(80))


class SystemProcess(ORMBase):
    """System processes, executed directly by backend workers."""

    __tablename__ = _tn("sa_task_system_processes")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, default=uuid.uuid4, nullable=False)
    description: Mapped[str | None] = mapped_column(String(80))
    params: Mapped[dict | None] = mapped_column(JSONB)
    is_singleton: Mapped[bool | None] = mapped_column(Boolean)
    is_running: Mapped[bool | None] = mapped_column(Boolean)


class SystemProcessRuns(ORMBase):
    """Submitted task status, log, result, start/end time."""

    __tablename__ = _tn("sa_task_instances")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, default=uuid.uuid4, nullable=False)
    params: Mapped[dict | None] = mapped_column(JSONB)
    creation_time: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    finalization_time: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[int | None] = mapped_column(ForeignKey(TaskStatus.id))
    log: Mapped[str | None] = mapped_column(Text)


# BROWSER FILTER
class BrowserFilter(ORMBase):
    __tablename__ = _tn("sa_browser_filters")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    object_type: Mapped[str] = mapped_column(String(80), nullable=False)
    value: Mapped[dict | None] = mapped_column(JSONB)
    user_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_auth_identities')}.id", ondelete="CASCADE"),
        nullable=False,
    )
    user: Mapped[Identity] = relationship(Identity)

    __table_args__ = (
        UniqueConstraint("name", "object_type", "user_id", name=__tablename__ + "_c1"),
    )