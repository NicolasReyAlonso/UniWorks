from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from uniback.persistence.base import GUID, ORMBase, get_table_prefix
from uniback.persistence.models.core import FunctionalObject, data_object_type_id, class_to_object_type_id

def _tn(name: str) -> str:
    """Apply global table prefix to a table name."""
    return f"{get_table_prefix()}gui_{name}"

class View(FunctionalObject):
    __tablename__ = _tn("views")
    __mapper_args__ = {
        'polymorphic_identity': data_object_type_id['view'],
    }
    id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{get_table_prefix()}functional_objects.id", ondelete='CASCADE'), primary_key=True)

class Dashboard(FunctionalObject):
    __tablename__ = _tn("dashboards")
    __mapper_args__ = {
        'polymorphic_identity': data_object_type_id['dashboard'],
    }
    id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{get_table_prefix()}functional_objects.id", ondelete='CASCADE'), primary_key=True)

# Register object type mappings
class_to_object_type_id.update({
    View: data_object_type_id['view'],
    Dashboard: data_object_type_id['dashboard'],
})


__all__ = ["View", "Dashboard"]
