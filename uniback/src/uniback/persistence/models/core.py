"""
Core ORM models for Uniback.

Provides:
- ObjectType: Type codes for different object categories
- FunctionalObject: Base class for all functional entities
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    event,
    func,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from uniback.persistence.base import GUID, JSONB, ORMBase, get_table_prefix
from uniback.persistence.session import current_session_ctx

if TYPE_CHECKING:
    from uniback.persistence.models.sysadmin import Identity


# Object type ID mapping - can be extended by calling backends
data_object_type_id: dict[str, int | list[int]] = {
    "dataset": 0,
    "geolayer": 1,
    "dataframe": 2,
    "grid": 3,
    # Annotations
    "annotation_item": 20,
    "annotation_template": 21,
    "annotation_field": 22,
    "annotation_text": 23,
    # GUI
    "app_flavor": 30,
    "menu": 31,
    "screen": 32,
    # File system
    "file_system_object": 50,
    "folder": 51,
    "file": 52,
    # System
    "case_study": 103,
    "view": 104,
    "dashboard": 105,
    "collection": 106,
    "sys-function": 1000,
    "none": 1000001,
}

# Mapping from model classes to object type IDs
class_to_object_type_id: dict[type, int] = {}


def _get_tablename(name: str) -> str:
    """Get prefixed table name."""
    return f"{get_table_prefix()}{name}"


class ObjectType(ORMBase):
    """
    Object type codes.

    Defines the types of objects in the system (Sequence, Alignment,
    Phylogenetic Tree, Functions, etc.)
    """

    __tablename__ = _get_tablename("object_types")

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[uuid.UUID] = mapped_column(
        GUID, unique=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)

    def __repr__(self) -> str:
        return f"<ObjectType(id={self.id}, name='{self.name}')>"


class EntityLabel(ORMBase):
    """
    Entity labels for internationalization.
    """
    __tablename__ = _get_tablename("entity_labels")

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    language_id: Mapped[str] = mapped_column(String(5), nullable=False)  # "es", "en", etc.
    entity_type: Mapped[str] = mapped_column(String(8), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(128), nullable=False)
    label: Mapped[str] = mapped_column(String(512), nullable=False)

    def __repr__(self) -> str:
        return f"<EntityLabel(language_id='{self.language_id}', entity_type='{self.entity_type}', entity_id='{self.entity_id}')>"


class FunctionalObject(ORMBase):
    """
    Base class for all functional entities.

    Provides common fields for all domain objects including:
    - UUID identifier
    - Owner reference
    - Creation timestamp
    - Name and attributes (JSON)
    - Soft delete support
    - Polymorphic identity for inheritance
    """

    __versioned__ = {}
    __tablename__ = _get_tablename("functional_objects")
    __disc_field__ = "object_type_id"

    # Primary key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # UUID for external references
    uuid: Mapped[uuid.UUID] = mapped_column(
        GUID, unique=True, default=uuid.uuid4, index=True
    )

    # Object type for polymorphism
    object_type_id: Mapped[int | None] = mapped_column(
        __disc_field__,
        Integer,
        ForeignKey(ObjectType.id),
        nullable=True,
    )

    # Native ID reference (for linking to external systems)
    native_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    native_table: Mapped[str | None] = mapped_column(String(80), nullable=True)

    # Ownership
    owner_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(f"{get_table_prefix()}sa_auth_identities.id"),
        nullable=True,
    )

    # Timestamps
    creation_time: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    entity_update_time: Mapped[datetime | None] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    ts_vector_update_time: Mapped[datetime | None] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Search
    ts_vector: Mapped[Any | None] = mapped_column(TSVECTOR, nullable=True)

    # Basic fields
    name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    attributes: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # Flags
    authr_reference: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # Relationships (defined with string reference to avoid circular imports)
    rl_owner: Mapped["Identity | None"] = relationship(
        "Identity",
        foreign_keys=[owner_id],
        lazy="joined",
    )

    __table_args__ = (
        UniqueConstraint(object_type_id, native_id, name=__tablename__ + "_c1"),
        UniqueConstraint(native_table, native_id, name=__tablename__ + "_c2"),
        Index(__tablename__ + "_idx_name", name),
        Index(__tablename__ + "_idx_owner", owner_id),
        Index(
            "ix_fobj__ts_vector__",
            ts_vector,
            postgresql_using="gin",
        ),
    )

    __mapper_args__ = {
        "polymorphic_identity": "functional_object",
        "polymorphic_on": object_type_id,
    }

    @property
    def owner(self) -> str | None:
        """Get owner name or email."""
        if self.rl_owner:
            return self.rl_owner.name or self.rl_owner.email
        return None

    def soft_delete(self) -> None:
        """Mark the object as deleted without removing from database."""
        self.is_deleted = True

    def restore(self) -> None:
        """Restore a soft-deleted object."""
        self.is_deleted = False

    def set_attribute(self, key: str, value: Any) -> None:
        """
        Set an attribute in the JSON attributes field.

        Args:
            key: Attribute key
            value: Attribute value
        """
        if self.attributes is None:
            self.attributes = {}
        self.attributes[key] = value

    def get_attribute(self, key: str, default: Any = None) -> Any:
        """
        Get an attribute from the JSON attributes field.

        Args:
            key: Attribute key
            default: Default value if key not found

        Returns:
            Attribute value or default
        """
        if self.attributes is None:
            return default
        return self.attributes.get(key, default)

    def __repr__(self) -> str:
        return (
            f"<{self.__class__.__name__}("
            f"id={self.id}, "
            f"uuid={str(self.uuid)[:8]}..., "
            f"name='{self.name}'"
            f")>"
        )


class Collection(FunctionalObject):
    """List of objects."""

    __tablename__ = _get_tablename("collections")
    __mapper_args__ = {
        "polymorphic_identity": data_object_type_id["collection"],
    }

    id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{_get_tablename('functional_objects')}.id"),
        primary_key=True,
    )

    @property
    def size(self) -> int:
        return len(self.fos)


class CollectionDetail(ORMBase):
    """Many to Many table to relate Collections and FunctionalObjects."""

    __tablename__ = _get_tablename("collections_functional_objects")

    collection_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(_get_tablename("collections") + ".id"), primary_key=True
    )
    functional_object_uuid: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey(_get_tablename("functional_objects") + ".uuid"),
        primary_key=True,
    )

    collection: Mapped[Collection] = relationship(
        Collection,
        foreign_keys=[collection_id],
        backref=backref("fos", cascade="all, delete-orphan"),
    )
    functional_object: Mapped[FunctionalObject] = relationship(
        FunctionalObject,
        foreign_keys=[functional_object_uuid],
        backref=backref("collections", cascade="all, delete-orphan"),
    )


class CaseStudy(FunctionalObject):
    """
    A case study is a set of Functional Objects.
    """

    __tablename__ = _get_tablename("case_studies")
    __mapper_args__ = {
        "polymorphic_identity": data_object_type_id["case_study"],
    }

    id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{_get_tablename('functional_objects')}.id"),
        primary_key=True,
    )

    @property
    def size(self) -> int:
        return len(self.fos)


class CaseStudy2FunctionalObject(ORMBase):
    """Many to Many table to relate Case Studies and FunctionalObjects."""

    __tablename__ = _get_tablename("case_studies_functional_objects")

    case_study_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(_get_tablename("case_studies") + ".id"), primary_key=True
    )
    functional_object_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(_get_tablename("functional_objects") + ".id"), primary_key=True
    )
    case_study: Mapped[CaseStudy] = relationship(
        CaseStudy,
        foreign_keys=[case_study_id],
        backref=backref("fos", cascade="all, delete-orphan"),
    )
    functional_object: Mapped[FunctionalObject] = relationship(
        FunctionalObject,
        foreign_keys=[functional_object_id],
        backref=backref("case_studies", cascade="all, delete-orphan"),
    )


class Dataset(FunctionalObject):
    """
    Root of the dataset hierarchy.
    """

    __tablename__ = _get_tablename("datasets")
    __mapper_args__ = {
        "polymorphic_identity": data_object_type_id["dataset"],
    }
    id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{_get_tablename('functional_objects')}.id"), primary_key=True
    )
    structure: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    provenance: Mapped[dict[str, Any] | None] = mapped_column(JSONB)


# Register object type mappings
class_to_object_type_id.update({
    Collection: data_object_type_id["collection"],
    CaseStudy: data_object_type_id["case_study"],
    Dataset: data_object_type_id["dataset"],
})


def set_functional_object_tsvector(entity: FunctionalObject, connection=None):
    """
    Prepare and set the tsvector for the entity.

    ``to_tsvector`` is PostgreSQL-only. On other dialects (e.g. the SQLite
    in-memory test database) the aggregated search text is stored as-is, since
    ``TSVECTOR`` is rendered as ``TEXT`` there.
    """
    from uniback.utils.common import generate_json

    # Name
    lst_parts = []
    if entity.name:
        lst_parts.extend(re.split(r"\s|(?<!\d)[,.](?!\d)", entity.name))

    # ID
    if entity.id:
        lst_parts.append(str(entity.id))

    # Attributes
    if entity.attributes:
        lst_parts.append(generate_json(entity.attributes))

    # Dataset specific
    if isinstance(entity, Dataset):
        if entity.structure:
            lst_parts.append(generate_json(entity.structure))
        if entity.provenance:
            lst_parts.append(generate_json(entity.provenance))

    # Search text aggregation
    search_text = " ".join([str(p) for p in lst_parts if p])
    dialect_name = getattr(getattr(connection, "dialect", None), "name", None)
    if dialect_name == "postgresql":
        entity.ts_vector = func.to_tsvector("english", search_text)
    else:
        entity.ts_vector = search_text
    entity.ts_vector_update_time = datetime.now(timezone.utc)


def before_insert_listener(mapper, connection, target: FunctionalObject):
    """Logic executed before a new FunctionalObject is inserted."""
    # 1. Automatic Ownership (if not already set)
    app_sess = current_session_ctx.get()
    if app_sess and target.owner_id is None:
        target.owner_id = app_sess.identity_id

    # 2. Update Search Vector
    set_functional_object_tsvector(target, connection)


def before_update_listener(mapper, connection, target: FunctionalObject):
    """Logic executed before an existing FunctionalObject is updated."""
    # Update Search Vector
    set_functional_object_tsvector(target, connection)


# Register the listeners
event.listen(FunctionalObject, "before_insert", before_insert_listener, propagate=True)
event.listen(FunctionalObject, "before_update", before_update_listener, propagate=True)
