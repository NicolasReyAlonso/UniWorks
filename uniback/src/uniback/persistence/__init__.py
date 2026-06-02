"""
Persistence layer for Uniback using SQLAlchemy 2.x.

Provides:
- ORM base class factory with custom mixin support
- GUID type for platform-independent UUID handling
- Session management utilities
- Pre-built models for common backend patterns
"""

from uniback.persistence.base import (
    GUID,
    BaseMixin,
    create_orm_base,
    ORMBase,
)
from uniback.persistence.session import (
    create_session_factory,
    create_engine_from_settings,
    get_session,
    SessionManager,
)

__all__ = [
    # Base
    "GUID",
    "BaseMixin",
    "create_orm_base",
    "ORMBase",
    # Session
    "create_session_factory",
    "create_engine_from_settings",
    "get_session",
    "SessionManager",
]
