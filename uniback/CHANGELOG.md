# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Integrated `SQLAlchemy-Continuum` (>=1.5.2) for history tracking.
- Configured Alembic to support Continuum versioning with `native_versioning` enabled.
- Enabled history tracking for core models (`FunctionalObject`, `Authorizable`, `Identity`, `FileSystemObject`, etc.).

### Changed
- Updated `sqlalchemy` to `>=2.0.45` for improved compatibility and performance.
- Updated `SQLAlchemy-Continuum` to `>=1.5.2` (latest compatible version with SQLAlchemy 2.x).

## [0.1.0] - 2024-12-17

### Added

- Initial release of Uniback framework
- **Persistence Layer** (SQLAlchemy 2.x):
  - `GUID` type decorator for platform-independent UUID handling
  - `BaseMixin` class with common functionality
  - `create_orm_base()` factory function for custom ORM base creation
  - Session management with `create_session_factory()`
  - Core models:
    - `ObjectType` - Object type codes
    - `FunctionalObject` - Base class for functional entities
  - Authentication/Authorization models:
    - `Authenticator` - External authentication providers
    - `Authorizable` - Base class for permission subjects
    - `Identity` - User identities
    - `IdentityStoreEntry` - Per-identity JSON storage
    - `IdentityAuthenticator` - Identity-authenticator mapping
    - `Organization`, `OrganizationIdentity`
    - `Group`, `GroupIdentity`
    - `Role`, `RoleIdentity`
    - `SystemFunction`, `SystemFunctionRelation`
    - `PermissionType`, `ObjectTypePermissionType`
    - `ACL`, `ACLExpression`, `ACLDetail`
  - Task management models:
    - `TaskStatus`
    - `SystemProcess`, `SystemProcessRuns`
  - Browser models:
    - `BrowserFilter`
  - Annotation models:
    - `AnnotationFormItem`, `AnnotationFormItemObjectType`
    - `AnnotationFormField`, `AnnotationFormTemplate`
    - `AnnotationFormTemplateField`
    - `AnnotationItem`, `AnnotationItemFunctionalObject`
    - `AnnotationText`, `AnnotationTemplate`, `AnnotationField`
    - `AnnotationRelationship`
- **REST API Layer** (FastAPI):
  - `create_app()` factory function
  - Authentication endpoints (`/auth/login`, `/auth/register`, `/auth/me`)
  - Base CRUD router for entities
  - Dependency injection for database sessions
  - CORS middleware configuration
  - Request logging middleware
  - Error handling middleware
- **Configuration**:
  - Pydantic-based settings management
  - Support for database, API, and auth configuration
- **Initializer**:
  - `initialize()` function as main entry point
  - Support for custom base mixin classes

### Dependencies

- SQLAlchemy >= 2.0
- FastAPI >= 0.100
- Pydantic >= 2.0
- Uvicorn >= 0.23
- Alembic >= 1.12

[Unreleased]: https://github.com/nextgendem/uniback/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nextgendem/uniback/releases/tag/v0.1.0
