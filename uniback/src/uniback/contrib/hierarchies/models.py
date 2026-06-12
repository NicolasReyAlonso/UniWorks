from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from uniback.persistence.base import GUID, JSONB, ORMBase, get_table_prefix

def _tn(name: str) -> str:
    """Apply global table prefix to a table name."""
    return f"{get_table_prefix()}{name}"

class HierarchyType(ORMBase):
    __tablename__ = _tn("hierarchy_types")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4)
    name: Mapped[str | None] = mapped_column(String(80))

class Hierarchy(ORMBase):
    __tablename__ = _tn("hierarchies")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4)
    name: Mapped[str | None] = mapped_column(String(80))
    h_type_id: Mapped[int | None] = mapped_column(Integer, ForeignKey(f"{_tn('hierarchy_types')}.id"))
    h_type: Mapped[HierarchyType | None] = relationship(HierarchyType)
    attributes: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

class HierarchyLevel(ORMBase):
    __tablename__ = _tn("hierarchy_levels")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str | None] = mapped_column(String(128))
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4)

    hierarchy_id: Mapped[int] = mapped_column(Integer, ForeignKey(f"{_tn('hierarchies')}.id"), nullable=False)
    hierarchy: Mapped[Hierarchy] = relationship(Hierarchy, backref=backref("levels", cascade="all, delete-orphan"))
    attributes: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

class HierarchyNode(ORMBase):
    __tablename__ = _tn("hierarchy_nodes")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str | None] = mapped_column(String(128))
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4)

    hierarchy_id: Mapped[int] = mapped_column(Integer, ForeignKey(f"{_tn('hierarchies')}.id"), nullable=False)
    hierarchy: Mapped[Hierarchy] = relationship(Hierarchy)

    parent_node_id: Mapped[int | None] = mapped_column(Integer, ForeignKey(f"{_tn('hierarchy_nodes')}.id"), nullable=True)
    parent_node: Mapped[HierarchyNode | None] = relationship("HierarchyNode", foreign_keys=[parent_node_id], remote_side=[id])

    level_id: Mapped[int | None] = mapped_column(Integer, ForeignKey(f"{_tn('hierarchy_levels')}.id"), nullable=True)
    level: Mapped[HierarchyLevel | None] = relationship(HierarchyLevel)

    reference_node_id: Mapped[int | None] = mapped_column(Integer, ForeignKey(f"{_tn('hierarchy_nodes')}.id"), nullable=True)
    reference_node: Mapped[HierarchyNode | None] = relationship("HierarchyNode", foreign_keys=[reference_node_id], remote_side=[id])

    attributes: Mapped[dict[str, Any] | None] = mapped_column(JSONB)


__all__ = [
    "HierarchyType",
    "Hierarchy",
    "HierarchyLevel",
    "HierarchyNode",
]
