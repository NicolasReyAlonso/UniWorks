"""
Session management for SQLAlchemy 2.x.

Provides:
- Engine creation from settings
- Session factory creation
- Context managers for session handling
- Dependency injection support for FastAPI
"""

from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Generator, Optional, TYPE_CHECKING

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from uniback.config.settings import DatabaseSettings, Settings

if TYPE_CHECKING:
    from uniback.api.dependencies import AppSession

# Global context for the current session
current_session_ctx: ContextVar[Optional["AppSession"]] = ContextVar(
    "current_session_ctx", default=None
)


class SessionManager:
    """
    Manages database engine and session factory.

    This class provides a centralized way to manage database connections
    and sessions throughout the application lifecycle.
    """

    def __init__(
        self,
        database_url: str | None = None,
        settings: DatabaseSettings | None = None,
        **engine_kwargs: Any,
    ):
        """
        Initialize the session manager.

        Args:
            database_url: Database connection URL (takes precedence over settings)
            settings: DatabaseSettings instance
            **engine_kwargs: Additional arguments passed to create_engine
        """
        self._engine: Engine | None = None
        self._session_factory: sessionmaker[Session] | None = None

        if database_url:
            self._database_url = database_url
            self._settings = None
        elif settings:
            self._database_url = settings.url
            self._settings = settings
        else:
            self._database_url = "sqlite:///./uniback.db"
            self._settings = None

        self._engine_kwargs = engine_kwargs

    @property
    def engine(self) -> Engine:
        """Get or create the database engine."""
        if self._engine is None:
            self._engine = self._create_engine()
        return self._engine

    @property
    def session_factory(self) -> sessionmaker[Session]:
        """Get or create the session factory."""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                bind=self.engine,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False,
            )
        return self._session_factory

    def _create_engine(self) -> Engine:
        """Create the database engine with appropriate settings."""
        kwargs: dict[str, Any] = {}

        if self._settings:
            kwargs["echo"] = self._settings.echo

            # Pool settings (not applicable for SQLite)
            if not self._database_url.startswith("sqlite"):
                kwargs["pool_size"] = self._settings.pool_size
                kwargs["max_overflow"] = self._settings.max_overflow
                kwargs["pool_timeout"] = self._settings.pool_timeout
                kwargs["pool_recycle"] = self._settings.pool_recycle
            elif ":memory:" in self._database_url:
                from sqlalchemy.pool import StaticPool

                kwargs["poolclass"] = StaticPool

        # Override with any explicit kwargs
        kwargs.update(self._engine_kwargs)

        return create_engine(self._database_url, **kwargs)

    def get_session(self) -> Session:
        """
        Create a new session.

        Returns:
            A new Session instance
        """
        return self.session_factory()

    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """
        Provide a transactional scope around a series of operations.

        Usage:
            ```python
            with session_manager.session_scope() as session:
                session.add(entity)
                # Commits automatically on success, rolls back on exception
            ```

        Yields:
            Session instance
        """
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def create_tables(self, base: Any) -> None:
        """
        Create all tables defined in the ORM base.

        Args:
            base: DeclarativeBase class with model definitions
        """
        base.metadata.create_all(bind=self.engine)

    def drop_tables(self, base: Any) -> None:
        """
        Drop all tables defined in the ORM base.

        Args:
            base: DeclarativeBase class with model definitions
        """
        base.metadata.drop_all(bind=self.engine)

    def dispose(self) -> None:
        """Dispose of the engine and release all connections."""
        if self._engine:
            self._engine.dispose()
            self._engine = None
            self._session_factory = None


# Global session manager instance
_session_manager: SessionManager | None = None


def get_session_manager() -> SessionManager:
    """
    Get the global session manager instance.

    Returns:
        SessionManager instance

    Raises:
        RuntimeError: If session manager has not been initialized
    """
    if _session_manager is None:
        raise RuntimeError(
            "Session manager not initialized. Call create_session_factory() first."
        )
    return _session_manager


def create_session_factory(
    database_url: str | None = None,
    settings: Settings | DatabaseSettings | None = None,
    **engine_kwargs: Any,
) -> SessionManager:
    """
    Create and configure the global session manager.

    Args:
        database_url: Database connection URL
        settings: Settings or DatabaseSettings instance
        **engine_kwargs: Additional arguments passed to create_engine

    Returns:
        Configured SessionManager instance
    """
    global _session_manager

    db_settings: DatabaseSettings | None = None
    if isinstance(settings, Settings):
        db_settings = settings.database
    elif isinstance(settings, DatabaseSettings):
        db_settings = settings

    _session_manager = SessionManager(
        database_url=database_url,
        settings=db_settings,
        **engine_kwargs,
    )

    return _session_manager


def create_engine_from_settings(settings: DatabaseSettings) -> Engine:
    """
    Create a database engine from settings.

    Args:
        settings: DatabaseSettings instance

    Returns:
        SQLAlchemy Engine instance
    """
    kwargs: dict[str, Any] = {
        "echo": settings.echo,
    }

    # Pool settings (not applicable for SQLite)
    if not settings.url.startswith("sqlite"):
        kwargs["pool_size"] = settings.pool_size
        kwargs["max_overflow"] = settings.max_overflow
        kwargs["pool_timeout"] = settings.pool_timeout
        kwargs["pool_recycle"] = settings.pool_recycle

    return create_engine(settings.url, **kwargs)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency injection function for FastAPI.

    Usage in FastAPI:
        ```python
        @app.get("/items")
        def get_items(session: Session = Depends(get_session)):
            return session.query(Item).all()
        ```

    Yields:
        Session instance
    """
    session_manager = get_session_manager()
    session = session_manager.get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def reset_session_manager() -> None:
    """
    Reset the global session manager.

    This is useful for testing or when reconfiguring the database connection.
    """
    global _session_manager
    if _session_manager:
        _session_manager.dispose()
    _session_manager = None
