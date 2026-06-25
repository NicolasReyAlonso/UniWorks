"""
Settings management for Uniback using Pydantic.

Provides typed configuration classes that can be initialized from:
- Configuration dictionaries
- Environment variables
- .env files
"""

from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    """Database connection settings."""

    model_config = SettingsConfigDict(env_prefix="UNIBACK_DB_")

    url: str = Field(
        default="postgresql://postgres:pg_passwd@localhost:5433/ub_db",
        description="Database connection URL",
    )
    echo: bool = Field(
        default=False,
        description="Echo SQL statements to stdout",
    )
    pool_size: int = Field(
        default=5,
        description="Connection pool size",
    )
    max_overflow: int = Field(
        default=10,
        description="Maximum overflow connections beyond pool_size",
    )
    pool_timeout: int = Field(
        default=30,
        description="Pool timeout in seconds",
    )
    pool_recycle: int = Field(
        default=3600,
        description="Connection recycle time in seconds",
    )
    create_tables: bool = Field(
        default=True,
        description="Automatically create tables on initialization",
    )
    auto_seed: bool = Field(
        default=True,
        description="Automatically seed the database with initial data",
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate database URL format."""
        if not v:
            raise ValueError("Database URL cannot be empty")
        return v


class APISettings(BaseSettings):
    """FastAPI application settings."""

    model_config = SettingsConfigDict(env_prefix="UNIBACK_API_")

    title: str = Field(
        default="Uniback API",
        description="API title shown in documentation",
    )
    description: str = Field(
        default="A standardized backend API powered by Uniback",
        description="API description shown in documentation",
    )
    version: str = Field(
        default="0.1.0",
        description="API version",
    )
    debug: bool = Field(
        default=False,
        description="Enable debug mode",
    )
    docs_url: str | None = Field(
        default="/docs",
        description="Swagger UI documentation URL (None to disable)",
    )
    redoc_url: str | None = Field(
        default="/redoc",
        description="ReDoc documentation URL (None to disable)",
    )
    openapi_url: str | None = Field(
        default="/openapi.json",
        description="OpenAPI schema URL (None to disable)",
    )
    cors_origins: list[str] = Field(
        default=["http://localhost:4200", "http://127.0.0.1:4200"],
        description="CORS allowed origins",
    )
    cors_allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS requests",
    )
    cors_allow_methods: list[str] = Field(
        default=["*"],
        description="CORS allowed methods",
    )
    cors_allow_headers: list[str] = Field(
        default=["*"],
        description="CORS allowed headers",
    )
    root_path: str = Field(
        default="",
        description="Root path for the API (useful for reverse proxies)",
    )


class AuthSettings(BaseSettings):
    """Authentication and authorization settings."""

    model_config = SettingsConfigDict(env_prefix="UNIBACK_AUTH_")

    secret_key: str = Field(
        default="change-me-in-production-use-a-secure-random-key",
        description="Secret key for JWT token signing",
    )
    algorithm: str = Field(
        default="HS256",
        description="JWT signing algorithm",
    )
    access_token_expire_minutes: int = Field(
        default=30,
        description="Access token expiration time in minutes",
    )
    refresh_token_expire_days: int = Field(
        default=7,
        description="Refresh token expiration time in days",
    )
    password_min_length: int = Field(
        default=8,
        description="Minimum password length",
    )
    enabled: bool = Field(
        default=True,
        description="Enable authentication endpoints",
    )
    basic_auth_enabled: bool = Field(
        default=True,
        description="Enable the built-in username/password (basic) auth provider",
    )
    firebase_credentials_path: str | None = Field(
        default=None,
        description="Path to the Firebase service account JSON file",
    )
    session_store: str = Field(
        default="redis",
        description="Session storage type: 'cookie' or 'redis'",
    )
    session_expire_seconds: int = Field(
        default=3600,
        description="Session expiration time in seconds (for Redis store)",
    )


class RedisSettings(BaseSettings):
    """General Redis connection settings."""

    model_config = SettingsConfigDict(env_prefix="UNIBACK_REDIS_")

    host: str = Field(
        default="localhost",
        description="Redis host",
    )
    port: int = Field(
        default=6379,
        description="Redis port",
    )
    db: int = Field(
        default=0,
        description="Redis database number",
    )
    password: str | None = Field(
        default=None,
        description="Redis password",
    )
    decode_responses: bool = Field(
        default=True,
        description="Decode Redis responses to strings",
    )


class WorkerSettings(BaseSettings):
    """Celery and Redis settings."""

    model_config = SettingsConfigDict(env_prefix="UNIBACK_WORKER_")

    broker_url: str = Field(
        default="redis://localhost:6379/0",
        description="Celery broker URL",
    )
    backend_url: str = Field(
        default="redis://localhost:6379/0",
        description="Celery result backend URL",
    )
    enabled: bool = Field(
        default=False,
        description="Enable Celery worker integration",
    )


class AssistantSettings(BaseSettings):
    """LLM assistant settings.

    Los proveedores Claude se construyen a partir de ``anthropic_api_key``.
    Para modelos locales/empresa, ``extra_providers`` admite una lista JSON de
    objetos ``{name, label, base_url, api_key, model_id}`` (formato
    OpenAI-compatible), p.ej.::

        UNIBACK_ASSISTANT_EXTRA_PROVIDERS='[{"name":"local-llama",
          "label":"Llama 3 (local)","base_url":"http://ollama:11434/v1",
          "api_key":"-","model_id":"llama3.1"}]'
    """

    model_config = SettingsConfigDict(env_prefix="UNIBACK_ASSISTANT_")

    enabled: bool = Field(
        default=True,
        description="Enable the LLM assistant plugin endpoints",
    )
    anthropic_api_key: str | None = Field(
        default=None,
        description="API key for Anthropic (Claude) models; backend-only",
    )
    default_model: str = Field(
        default="claude-opus-4-8",
        description="Provider name selected by default in the UI",
    )
    max_tokens: int = Field(
        default=8192,
        description="Max output tokens per assistant turn",
    )
    max_tool_iterations: int = Field(
        default=8,
        description="Safety cap on tool-use loop iterations per message",
    )
    extra_providers: list[dict[str, Any]] = Field(
        default_factory=list,
        description="OpenAI-compatible custom/local model providers (URL + key)",
    )


class Settings(BaseSettings):
    """Main settings class combining all configuration sections."""

    model_config = SettingsConfigDict(
        env_prefix="UNIBACK_",
        env_nested_delimiter="__",
    )

    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    api: APISettings = Field(default_factory=APISettings)
    auth: AuthSettings = Field(default_factory=AuthSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    worker: WorkerSettings = Field(default_factory=WorkerSettings)
    assistant: AssistantSettings = Field(default_factory=AssistantSettings)

    # Application-level settings
    app_name: str = Field(
        default="uniback",
        description="Application name used for table prefixes",
    )
    table_prefix: str = Field(
        default="ub_",
        description="Prefix for database table names",
    )

    @classmethod
    def from_dict(cls, config: dict[str, Any]) -> "Settings":
        """
        Create Settings from a configuration dictionary.

        Args:
            config: Configuration dictionary with optional keys:
                   'database', 'api', 'auth', 'app_name', 'table_prefix'

        Returns:
            Settings instance
        """
        db_config = config.get("database", {})
        api_config = config.get("api", {})
        auth_config = config.get("auth", {})
        redis_config = config.get("redis", {})
        worker_config = config.get("worker", {})
        assistant_config = config.get("assistant", {})

        return cls(
            database=DatabaseSettings(**db_config),
            api=APISettings(**api_config),
            auth=AuthSettings(**auth_config),
            redis=RedisSettings(**redis_config),
            worker=WorkerSettings(**worker_config),
            assistant=AssistantSettings(**assistant_config),
            app_name=config.get("app_name", "uniback"),
            table_prefix=config.get("table_prefix", "ub_"),
        )


# Global settings instance (cached)
_settings: Settings | None = None


def get_settings(config: dict[str, Any] | None = None) -> Settings:
    """
    Get or create the global settings instance.

    Args:
        config: Optional configuration dictionary. If provided on first call,
               it will be used to initialize settings. Subsequent calls
               ignore this parameter.

    Returns:
        Settings instance
    """
    global _settings
    if _settings is None:
        if config:
            _settings = Settings.from_dict(config)
        else:
            _settings = Settings()
    return _settings


def reset_settings() -> None:
    """Reset the global settings instance. Useful for testing."""
    global _settings
    _settings = None


@lru_cache
def get_cached_settings() -> Settings:
    """
    Get cached settings instance.

    This is useful for FastAPI dependency injection where settings
    should be loaded once and reused.

    Returns:
        Settings instance
    """
    return get_settings()
