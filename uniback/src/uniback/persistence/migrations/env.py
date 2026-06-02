from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlalchemy.orm import configure_mappers
from sqlalchemy_continuum import make_versioned

from uniback.persistence.base import ORMBase, set_table_prefix

# Initialize versioning
make_versioned(user_cls=None, options={"native_versioning": True})


# this is the Alembic Config object, which provides access to the values
# within the .ini file in use.
config = context.config


# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def _configure_prefix() -> None:
    """Apply table prefix from environment if provided."""

    prefix = os.getenv("UNIBACK_TABLE_PREFIX")
    if prefix:
        set_table_prefix(prefix)


def _load_models() -> None:
    """Import models after ensuring the prefix is configured."""

    _configure_prefix()
    import uniback.persistence.models  # noqa: F401
    # Configure mappers after models are loaded for Continuum
    configure_mappers()


def get_database_url() -> str:
    """Resolve database URL from environment or Alembic config."""

    env_url = os.getenv("UNIBACK_DB_URL")
    if env_url:
        return env_url

    cfg_url = config.get_main_option("sqlalchemy.url")
    if cfg_url:
        return cfg_url

    return "sqlite:///./uniback.db"


# Ensure models are imported so metadata is populated
_load_models()

# add your model's MetaData object here for 'autogenerate' support
target_metadata = ORMBase.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""

    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def include_object(object, name, type_, reflected, compare_to):
    # Exclude the Continuum transaction table
    if type_ == "table" and name in ["transaction", "ub_transaction"]:
        return False
    return True


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
