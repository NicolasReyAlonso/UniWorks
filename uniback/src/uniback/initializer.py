"""
Initialization entrypoint for the Uniback framework.

Provides a single `initialize` function that prepares the ORM base,
database session manager, and FastAPI application using the provided
configuration.
"""

from __future__ import annotations

import importlib
import os
from typing import Any

from fastapi import FastAPI
from sqlalchemy.orm import DeclarativeBase, configure_mappers
from sqlalchemy_continuum import make_versioned

from uniback.api.app import create_app
from uniback.config.settings import Settings, AuthSettings, WorkerSettings
from uniback.persistence.base import create_orm_base, set_table_prefix
from uniback.persistence.session import SessionManager, create_session_factory


def _native_versioning_enabled() -> bool:
    """Native versioning emits PostgreSQL trigger DDL, so it must be disabled
    for other dialects (e.g. the SQLite database used by the test suite)."""
    override = os.getenv("UNIBACK_NATIVE_VERSIONING")
    if override is not None:
        return override.lower() in ("1", "true", "yes")
    return not os.getenv("UNIBACK_DB_URL", "postgresql://").startswith("sqlite")


# Orden de carga DELIBERADO (comportamiento historico del framework):
# los modulos de modelos de serie se importan ANTES de make_versioned, de modo
# que SQLAlchemy-Continuum no los instrumenta (su listener 'instrument_class'
# solo recoge clases definidas DESPUES de make_versioned). Antes del
# micronucleo este orden lo provocaba una cadena de imports accidental via
# api.app -> routers -> seeding; ahora se declara explicitamente. Cambiarlo
# requiere arreglar la incompatibilidad de Continuum con polymorphic_on en
# estilo SQLAlchemy 2.0 (MappedColumn) y migrar las tablas *_version.
import uniback.persistence.models  # noqa: E402,F401

# Initialize SQLAlchemy-Continuum (after the built-in models, see above).
make_versioned(user_cls=None, options={"native_versioning": _native_versioning_enabled()})


def _load_settings(config: dict[str, Any] | Settings) -> Settings:
    """Normalize configuration into a Settings instance."""

    if isinstance(config, Settings):
        return config
    return Settings.model_validate(config)


def initialize_worker(settings: WorkerSettings) -> None:
    """Initialize Celery worker if enabled."""
    if not settings.enabled:
        return

    # The actual Celery application is typically defined in uniback.worker
    # to avoid circular dependencies. This function can be used for
    # additional worker-related setup if needed.
    pass


def initialize_redis(settings: Settings) -> None:
    """Initialize Redis manager."""
    from uniback.utils.redis import get_redis_manager

    get_redis_manager(settings)


def initialize_firebase(settings: AuthSettings) -> None:
    """Initialize Firebase Admin SDK if credentials path is provided."""
    if not settings.firebase_credentials_path:
        return

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.firebase_credentials_path)
            firebase_admin.initialize_app(cred)
    except ImportError:
        # firebase-admin not installed, skip initialization
        pass
    except Exception as e:
        # Log or handle initialization error
        print(f"Failed to initialize Firebase: {e}")


def initialize(
    config: dict[str, Any] | Settings,
    base_mixin: type | None = None,
    table_prefix: str | None = None, external_model_modules: list[str] | None = None,
) -> tuple[type[DeclarativeBase], SessionManager, FastAPI]:
    """
    Initialize Uniback and return the key components.

    Args:
        config: Configuration dictionary or Settings instance.
        base_mixin: Optional mixin class to include in the ORM base.
        table_prefix: Optional table prefix to apply to all models.

    Returns:
        A tuple of (ORMBase, SessionManager, FastAPI app).
    """

    settings = _load_settings(config)

    # Node type decides which plugins activate their routers/seeding on this
    # process; "monolith" activates everything.
    node_type = os.getenv("UNIBACK_NODE_TYPE", "monolith")

    # Discover and initialize plugins early. Contrib (de serie) primero, asi
    # un plugin externo puede sobreescribir extensiones registrando otras con
    # el mismo ``name``.
    from uniback.plugins import plugin_manager
    plugin_manager.discover_internal()
    # Default plugin directory: src/plugins, one level up from uniback
    # Depending on structure, it could be configurable. For now we use the env var or default path
    plugin_dir = os.getenv("UNIBACK_PLUGINS_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "plugins"))
    plugin_manager.discover_plugins(plugin_dir)
    plugin_manager.emit_on_init(settings)
    # Registramos los importers/resolvers del nucleo antes de los plugins, asi
    # un plugin puede sobreescribir uno por defecto registrando otro con el
    # mismo ``name``.
    from uniback.plugins.defaults import register_core_defaults
    register_core_defaults()
    # Tras on_init, los plugins ya han podido configurarse: volcamos sus
    # extensiones (importers, source adapters, widgets...) en los registros
    # globales para que esten disponibles antes de construir la app.
    plugin_manager.populate_registries()

    # Initialize external services
    initialize_redis(settings)
    initialize_worker(settings.worker)
    initialize_firebase(settings.auth)

    if table_prefix:
        set_table_prefix(table_prefix)

    orm_base: type[DeclarativeBase] = create_orm_base(base_mixin)

    # Modelos del KERNEL (core, sysadmin, screens). Los de dominio llegan via
    # get_model_modules() de cada plugin contrib/externo, mas abajo. La
    # fachada uniback.persistence.models ya se importo a nivel de modulo
    # (ver nota sobre make_versioned), esto solo lo hace explicito.
    from uniback.persistence.models import core, screens, sysadmin  # noqa: F401

    # Import external models if provided
    if external_model_modules is None:
        external_model_modules = []
        
    # Append plugin models
    external_model_modules.extend(plugin_manager.get_all_model_modules())

    if external_model_modules:
        for module_name in external_model_modules:
            try:
                importlib.import_module(module_name)
            except ImportError as e:
                print(f"Warning: Failed to import external model module {module_name}: {e}")

    # Important for SQLAlchemy-Continuum: configure all mappers
    configure_mappers()

    session_manager = create_session_factory(settings=settings)

    if settings.database.create_tables:
        session_manager.create_tables(orm_base)

    if settings.database.auto_seed:
        with session_manager.session_scope() as db:
            from uniback.persistence.seeding import initialize_kernel_data

            # Kernel primero (identidades, permisos, object types base...),
            # asi los plugins pueden referenciar esos datos en su on_seed.
            initialize_kernel_data(db)
            plugin_manager.emit_on_seed(db, node_type)

    app = create_app(settings.api, session_manager, node_type=node_type)

    # Let plugins configure the app directly
    plugin_manager.emit_on_app_ready(app, node_type)

    return orm_base, session_manager, app