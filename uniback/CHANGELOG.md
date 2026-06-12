# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed — Arquitectura de micronúcleo
- El paquete `uniback` queda reducido al núcleo: app factory, plugin manager,
  persistencia (base/sesión/query), modelos de sistema (`core`, `sysadmin`,
  `screens`), autenticación/autorización (`get_n_session`), `crud_factory`,
  `schema_registry`, seeding del kernel y los servicios de sistema
  (health, gui/navigation + pantallas sintéticas, sys, discovery,
  generic_import, functional_objects, system_functions).
- Cada dominio funcional es ahora un plugin de serie en `uniback.contrib.*`:
  `auth`, `files`, `annotations`, `species`, `hierarchies`, `collections`,
  `gui_crud` y `geographics`. Cada uno declara sus modelos
  (`get_model_modules`), routers (`get_routers`) y semilla (`on_seed`).
- Activación por nodo: `UnibackPlugin.node_types` + `UNIBACK_NODE_TYPE`.
  Todos los nodos cargan todos los modelos (requisito del polimorfismo
  joined-table) y registran el catálogo completo de entidades en el
  `schema_registry` (para `/sys/schemas`), pero solo montan los routers de
  sus plugins activos. `monolith` activa todo.
- Orden de siembra: kernel primero (`initialize_kernel_data`), después los
  plugins activos ordenados por `seed_priority`.
- `crudie.py` pasa de cadenas `if/elif` hardcodeadas a un registro extensible
  (`register_crudie_entity`) que kernel y plugins pueblan con loaders
  perezosos.
- Shims de retrocompatibilidad en `uniback.persistence.models.*` (files,
  annotations, hierarchies, species, geographics, views_dashboards): los
  imports antiguos siguen funcionando y `migrations/env.py` no cambia.
- Sin cambios en la API REST, en los labels de Traefik/docker-compose ni en
  el frontend.

### Fixed
- La suite de tests vuelve a ejecutar al completo: el `native_versioning` de
  Continuum se desactiva automáticamente en dialectos sin soporte de
  triggers PostgreSQL (SQLite en tests) vía `UNIBACK_NATIVE_VERSIONING`.
- El descubrimiento de plugins es idempotente por clase (antes se acumulaban
  instancias duplicadas al llamar `initialize()` varias veces por proceso).

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
