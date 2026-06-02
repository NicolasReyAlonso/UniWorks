"""
Base ORM classes and utilities for SQLAlchemy 2.x.

Provides:
- GUID: Platform-independent UUID type
- BaseMixin: Common functionality for all models
- create_orm_base: Factory function to create ORM base with custom mixin
"""

import uuid
from datetime import datetime
from copy import deepcopy
from typing import Any, Type

from sqlalchemy import String, TypeDecorator, inspect, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
from sqlalchemy.dialects.postgresql import TSVECTOR as PG_TSVECTOR
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import DeclarativeBase, declared_attr


@compiles(PG_TSVECTOR, "sqlite")
@compiles(PG_TSVECTOR, "mysql")
def _compile_tsvector_as_text(element: Any, compiler: Any, **kw: Any) -> str:
    """
    Render PostgreSQL ``TSVECTOR`` as ``TEXT`` on dialects without full-text
    search columns. Keeps the schema creatable on SQLite/MySQL (used by the
    in-memory test database) without affecting native PostgreSQL behaviour.
    """
    return "TEXT"


class GUID(TypeDecorator):
    """
    Platform-independent GUID type.

    Uses PostgreSQL's UUID type when available, otherwise uses
    CHAR(32), storing as stringified hex values.

    This is compatible with SQLAlchemy 2.x and provides consistent
    UUID handling across different database backends.
    """

    impl = String(32)
    cache_ok = True

    def load_dialect_impl(self, dialect: Any) -> Any:
        """Load the appropriate type for the dialect."""
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(32))

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        """Process the value before binding to the database."""
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return str(value) if isinstance(value, uuid.UUID) else value
        else:
            if isinstance(value, uuid.UUID):
                return "%.32x" % value.int
            elif isinstance(value, str):
                return "%.32x" % uuid.UUID(value).int
            return value

    def process_result_value(self, value: Any, dialect: Any) -> uuid.UUID | None:
        """Process the value after retrieving from the database."""
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class JSONB(TypeDecorator):
    """
    Platform-independent JSONB type.

    Uses PostgreSQL's JSONB type when available, otherwise uses
    SQLAlchemy's standard JSON type.
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect: Any) -> Any:
        """Load the appropriate type for the dialect."""
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_JSONB())
        else:
            return dialect.type_descriptor(JSON())


class BaseMixin:
    """
    Base mixin providing common functionality for all ORM models.

    This mixin can be extended by the calling backend to add
    custom functionality to all models.
    """

    @declared_attr.directive
    @classmethod
    def __tablename__(cls) -> str:
        """
        Generate table name from class name.

        Override this in subclasses to customize table naming.
        """
        # Convert CamelCase to snake_case
        name = cls.__name__
        result = []
        for i, char in enumerate(name):
            if char.isupper() and i > 0:
                result.append("_")
            result.append(char.lower())
        return "".join(result)

    def to_dict(self, exclude: set[str] | None = None) -> dict[str, Any]:
        """
        Convert model instance to dictionary.

        Args:
            exclude: Set of column names to exclude

        Returns:
            Dictionary representation of the model
        """
        exclude = exclude or set()
        result = {}
        mapper = inspect(self.__class__)
        for column in mapper.columns:
            if column.key not in exclude:
                value = getattr(self, column.key)
                if isinstance(value, (uuid.UUID, datetime)):
                    from uniback.utils.common import _json_serializer
                    value = _json_serializer(value)
                result[column.key] = value
        
        # Include hybrid properties
        from sqlalchemy.ext.hybrid import hybrid_property
        for name, descriptor in mapper.all_orm_descriptors.items():
            if isinstance(descriptor, hybrid_property):
                if name not in exclude:
                    value = getattr(self, name)
                    if isinstance(value, (uuid.UUID, datetime)):
                        from uniback.utils.common import _json_serializer
                        value = _json_serializer(value)
                    result[name] = value

        return result

    def update_from_dict(self, data: dict[str, Any], exclude: set[str] | None = None) -> None:
        """
        Update model instance from dictionary.

        Args:
            data: Dictionary with values to update
            exclude: Set of column names to exclude from update
        """
        exclude = exclude or {"id", "uuid", "created_at"}
        mapper = inspect(self.__class__)
        column_names = {c.key for c in mapper.columns}

        for key, value in data.items():
            if key in column_names and key not in exclude:
                setattr(self, key, value)

    def __deepcopy__(self, memo: dict) -> "BaseMixin":
        """
        Create a deep copy of the model instance.

        This is useful for creating copies of entities without
        copying the SQLAlchemy instance state.
        """
        cls = self.__class__
        result = cls.__new__(cls)
        memo[id(self)] = result

        mapper = inspect(cls)
        for prop in mapper.iterate_properties:
            if hasattr(prop, "columns"):
                # Column property
                name = prop.key
                value = getattr(self, name, None)
                if value is not None:
                    setattr(result, name, deepcopy(value, memo))

        return result

    def __repr__(self) -> str:
        """String representation of the model."""
        cls_name = self.__class__.__name__
        mapper = inspect(self.__class__)

        # Try to get id or uuid for representation
        pk_cols = [c.key for c in mapper.primary_key]
        pk_values = []
        for col in pk_cols:
            value = getattr(self, col, None)
            if isinstance(value, uuid.UUID):
                value = str(value)[:8] + "..."
            pk_values.append(f"{col}={value}")

        return f"<{cls_name}({', '.join(pk_values)})>"


class ORMBase(DeclarativeBase, BaseMixin):
    """
    Default ORM base class combining DeclarativeBase with BaseMixin.

    Use this directly or use create_orm_base() to create a custom
    base with additional mixins.
    """

    pass


def create_orm_base(mixin_class: Type | None = None) -> Type[DeclarativeBase]:
    """
    Factory function to create an ORM base class with a custom mixin.

    This allows the calling backend to inject custom functionality
    into all ORM models by providing a mixin class.

    Args:
        mixin_class: Optional mixin class to incorporate into the base.
                    If None, only BaseMixin is used.

    Returns:
        A new DeclarativeBase class incorporating the mixins.

    Example:
        ```python
        class MyMixin:
            def custom_method(self):
                return "custom"

        ORMBase = create_orm_base(MyMixin)

        class MyModel(ORMBase):
            __tablename__ = "my_models"
            id = mapped_column(Integer, primary_key=True)
        ```
    """
    if mixin_class is None:
        # Return the default ORMBase
        return ORMBase

    # Create a new base class with the custom mixin
    class CustomORMBase(DeclarativeBase, BaseMixin, mixin_class):
        pass

    return CustomORMBase


# Type alias for table prefix configuration
TablePrefix = str

# Global table prefix (can be set during initialization)
_table_prefix: TablePrefix = "ub_"


def set_table_prefix(prefix: str) -> None:
    """Set the global table prefix for all models."""
    global _table_prefix
    _table_prefix = prefix


def get_table_prefix() -> str:
    """Get the current global table prefix."""
    return _table_prefix


def prefixed_tablename(name: str) -> str:
    """
    Get a table name with the global prefix applied.

    Args:
        name: Base table name

    Returns:
        Prefixed table name
    """
    return f"{_table_prefix}{name}"
