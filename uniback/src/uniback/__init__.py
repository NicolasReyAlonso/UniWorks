"""
Uniback - A framework for quickly developing standardized backend components.

This package provides:
- Persistence layer using SQLAlchemy 2.x with pre-built models
- REST API layer using FastAPI with pre-configured endpoints
- Flexible initialization through configuration dictionaries
"""

__version__ = "0.1.0"
__author__ = "NextGenDem Team"

from uniback.initializer import initialize

# Persistence exports
from uniback.persistence.base import GUID, BaseMixin, create_orm_base
from uniback.persistence.session import create_session_factory, get_session

# API exports
from uniback.api.app import create_app

# Config exports
from uniback.config.settings import Settings, DatabaseSettings, APISettings, AuthSettings

__all__ = [
    # Version
    "__version__",
    # Main initializer
    "initialize",
    # Persistence
    "GUID",
    "BaseMixin",
    "create_orm_base",
    "create_session_factory",
    "get_session",
    # API
    "create_app",
    # Config
    "Settings",
    "DatabaseSettings",
    "APISettings",
    "AuthSettings",
]
