from __future__ import annotations

from typing import Any

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from uniback.persistence.base import JSONB, ORMBase, get_table_prefix
from uniback.persistence.models.core import Dataset, FunctionalObject, data_object_type_id, class_to_object_type_id

def _tn(name: str) -> str:
    """Apply global table prefix to a table name."""
    return f"{get_table_prefix()}geo_{name}"

class GeographicLayer(Dataset):
    __tablename__ = _tn("layers")
    __mapper_args__ = {
        'polymorphic_identity': data_object_type_id['geolayer'],
    }
    id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{get_table_prefix()}datasets.id", ondelete='CASCADE'), primary_key=True)
    layer_type: Mapped[str | None] = mapped_column(String(10)) # vector, raster
    properties: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

class Grid(FunctionalObject):
    __tablename__ = _tn("grids")
    __mapper_args__ = {
        'polymorphic_identity': data_object_type_id['grid'],
    }
    id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{get_table_prefix()}functional_objects.id", ondelete='CASCADE'), primary_key=True)

# Register object type mappings
class_to_object_type_id.update({
    GeographicLayer: data_object_type_id['geolayer'],
    Grid: data_object_type_id['grid'],
})


__all__ = ["GeographicLayer", "Grid"]
