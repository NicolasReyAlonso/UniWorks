# Uniback

A Python framework for quickly developing standardized backend components with persistence (SQLAlchemy 2.x) and REST API (FastAPI).

## Features

- **Persistence Layer**: SQLAlchemy 2.x based ORM with pre-built models for:
  - Core functional objects with UUID, ownership, timestamps, and attributes
  - Authentication & Authorization (Identity, Organization, Group, Role, ACL)
  - Annotation system (Templates, Fields, Text annotations)
  - Task management (System processes, status tracking)

- **REST API Layer**: FastAPI-based REST server with:
  - Pre-configured authentication endpoints
  - CRUD operations for core entities
  - Dependency injection for database sessions
  - Middleware for logging, CORS, and error handling

- **Flexible Initialization**: Configure and initialize the framework with a simple config dictionary

## Installation

```bash
# Basic installation
pip install uniback

# With PostgreSQL support
pip install uniback[postgres]

# With development dependencies
pip install uniback[dev]

# From source
git clone https://github.com/nextgendem/uniback.git
cd uniback
pip install -e ".[dev]"
```

## Quick Start

```python
from uniback import initialize

# Configuration dictionary
config = {
    "database": {
        "url": "postgresql://user:password@localhost/mydb",
        "echo": False,
        "pool_size": 5,
    },
    "api": {
        "title": "My Backend API",
        "version": "1.0.0",
        "debug": True,
        "cors_origins": ["http://localhost:3000"],
    },
    "auth": {
        "secret_key": "your-secret-key",
        "algorithm": "HS256",
        "access_token_expire_minutes": 30,
    }
}

# Initialize uniback
orm_base, session_factory, app = initialize(config)

# Now you can:
# 1. Create your own models inheriting from orm_base
# 2. Use session_factory to get database sessions
# 3. Add your own routes to the FastAPI app

# Example: Add a custom model
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

class MyCustomEntity(orm_base):
    __tablename__ = "my_custom_entities"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))

# Example: Add a custom route
@app.get("/my-endpoint")
async def my_endpoint():
    return {"message": "Hello from my custom endpoint"}

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Using Custom Base Mixin

You can provide your own base mixin class to add custom functionality to all ORM models:

```python
from uniback import initialize

class MyBaseMixin:
    """Custom mixin with additional functionality"""
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id})>"

config = {
    "database": {"url": "sqlite:///./test.db"},
    "api": {"title": "My API"},
}

orm_base, session_factory, app = initialize(config, base_mixin=MyBaseMixin)
```

## Infrastructure and Development Services

The project includes a `docker-compose.yml` file to quickly start the necessary infrastructure (PostgreSQL and Redis) and a template for Celery workers.

```bash
# Start all services in the background
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Services Details:
- **PostgreSQL (`ub_pg`)**: Accessible at `localhost:5433` (internal port 5432). Database: `ub_db`, User: `postgres`, Password: `pg_passwd`.
- **Redis**: Accessible at `localhost:6379`. Used for session storage and Celery broker/backend.
- **Celery**: A worker container set up with the Uniback source code.

## Database Migrations

Uniback uses Alembic for database migrations. The migration scripts are located in `src/uniback/persistence/migrations`.

### Configuration
The `alembic.ini` file is configured to use the local PostgreSQL instance by default. You can override the database URL using the `UNIBACK_DB_URL` environment variable:

```bash
export UNIBACK_DB_URL=postgresql://postgres:pg_passwd@localhost:5433/ub_db
```

### Common Commands

```bash
# Upgrade to the latest version
alembic upgrade head

# Create a new migration script
alembic revision --autogenerate -m "description of changes"

# Revert the last migration
alembic downgrade -1

# View migration history
alembic history
```

### Updating Existing Migrations
If you need to update the initial migration (e.g., when resetting the database in development):

1. Reset the database (drop and recreate the database or schema).
2. Modify the migration file in `src/uniback/persistence/migrations/versions/`.
3. Run `alembic upgrade head` to apply the modified migration.

## Pre-built Models

### Core Models

- **ObjectType**: Type codes for different object categories
- **FunctionalObject**: Base class for all functional entities with:
  - UUID identifier
  - Owner reference
  - Creation timestamp
  - Name and attributes (JSONB)
  - Full-text search support

### Authentication & Authorization

- **Authenticator**: External authentication providers
- **Identity**: User identities with email and login status
- **Organization**, **Group**, **Role**: Authorization groupings
- **ACL**, **ACLDetail**, **ACLExpression**: Fine-grained permissions

### Annotations

- **AnnotationFormItem**, **AnnotationFormField**, **AnnotationFormTemplate**: Form definitions
- **AnnotationItem**, **AnnotationText**, **AnnotationTemplate**, **AnnotationField**: Annotation instances
- **AnnotationRelationship**: Relationships between annotated objects

### Task Management

- **TaskStatus**: Task status codes
- **SystemProcess**: System process definitions
- **SystemProcessRuns**: Process execution history

## Configuration Reference

```python
config = {
    "database": {
        "url": str,              # Database connection URL (required)
        "echo": bool,            # Echo SQL statements (default: False)
        "pool_size": int,        # Connection pool size (default: 5)
        "max_overflow": int,     # Max overflow connections (default: 10)
        "pool_timeout": int,     # Pool timeout in seconds (default: 30)
    },
    "api": {
        "title": str,            # API title (default: "Uniback API")
        "version": str,          # API version (default: "0.1.0")
        "description": str,      # API description
        "debug": bool,           # Debug mode (default: False)
        "cors_origins": list,    # CORS allowed origins (default: ["*"])
        "docs_url": str,         # Swagger docs URL (default: "/docs")
        "redoc_url": str,        # ReDoc URL (default: "/redoc")
    },
    "auth": {
        "secret_key": str,       # JWT secret key (required for auth)
        "algorithm": str,        # JWT algorithm (default: "HS256")
        "access_token_expire_minutes": int,  # Token expiry (default: 30)
    }
}
```

## Development

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run tests with coverage
pytest --cov=uniback --cov-report=html

# Format code
black src tests

# Lint code
ruff check src tests

# Type checking
mypy src
```

## Project Structure

```
uniback/
├── src/uniback/
│   ├── __init__.py          # Package initialization
│   ├── initializer.py       # Main entry point
│   ├── persistence/         # SQLAlchemy persistence layer
│   │   ├── base.py          # ORM base, GUID type, mixins
│   │   ├── session.py       # Session management
│   │   └── models/          # Pre-built models
│   │       ├── core.py      # FunctionalObject
│   │       ├── sysadmin.py  # Auth/Authz models
│   │       └── annotations.py
│   ├── api/                 # FastAPI REST layer
│   │   ├── app.py           # App factory
│   │   ├── dependencies.py  # DI components
│   │   ├── middleware.py    # Middleware
│   │   └── routers/         # API routers
│   ├── config/              # Configuration
│   └── utils/               # Utilities
├── tests/                   # Test suite
├── docs/                    # Documentation
└── pyproject.toml           # Package configuration
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
