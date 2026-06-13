from typing import Any, List, Optional, Set

from fastapi import APIRouter, FastAPI
from sqlalchemy.orm import Session

from uniback.plugins.contracts import (
    AssistantModelProvider,
    AssistantTool,
    Exporter,
    FieldWidget,
    FKResolver,
    Importer,
    SourceAdapter,
)


class UnibackPlugin:
    """
    Base class for Uniback Plugins.
    Plugins should inherit from this class to hook into the framework's lifecycle.

    Todos los ``get_*`` devuelven listas vacias por defecto, asi un plugin solo
    sobreescribe lo que necesite. Cualquier nuevo tipo inyectable debe seguir
    este patron para mantener la retrocompatibilidad.
    """
    name: str = "BasePlugin"
    description: str = "Base plugin description"
    version: str = "0.1.0"

    # Nodos (UNIBACK_NODE_TYPE) en los que el plugin esta ACTIVO: monta sus
    # routers, siembra y arranca presencia. ``None`` = activo en todos los
    # nodos (comportamiento historico de los plugins externos tipo seedbeds).
    # OJO: ``get_model_modules`` y ``get_routers`` se invocan en TODOS los
    # nodos aunque el plugin no este activo: el ORM necesita todos los modelos
    # polimorficos y el schema_registry el bundle completo; solo el MONTAJE de
    # los routers se restringe a los nodos activos.
    node_types: Optional[Set[str]] = None

    # Orden de siembra entre plugins (menor = antes). El kernel siembra
    # siempre primero (identidades, permisos, object types base).
    seed_priority: int = 100

    # Tags OpenAPI que aporta el plugin (mismo formato que openapi_tags de
    # FastAPI). Solo se agregan en los nodos donde el plugin esta activo.
    openapi_tags: List[dict] = []

    def is_active(self, node_type: str) -> bool:
        """True si el plugin debe montar routers/sembrar en este nodo."""
        return (
            node_type == "monolith"
            or self.node_types is None
            or node_type in self.node_types
        )

    def on_init(self, settings: Any) -> None:
        """
        Called early during framework initialization.
        Good place to set up third-party services or check configuration.
        """
        pass

    def get_model_modules(self) -> List[str]:
        """
        Return a list of absolute module paths (e.g. 'my_plugin.models')
        that contain SQLAlchemy models to be registered before mappers are configured.
        """
        return []

    def get_routers(self) -> List[APIRouter]:
        """
        Return a list of FastAPI routers to be included in the main app.
        """
        return []

    def on_seed(self, db: Session) -> None:
        """
        Called during the database auto-seed phase.
        Use this to inject default rows required by the plugin.
        """
        pass

    def on_app_ready(self, app: FastAPI) -> None:
        """
        Called right after the FastAPI app is created.
        Can be used to add custom middlewares or static file mounts.
        """
        pass

    # ---------------------------------------------------------------- #
    # Extensiones inyectables (opcionales). Devolver instancias listas
    # para usar; el PluginManager las registrara en los singletons de
    # ``uniback.plugins.registries``.
    # ---------------------------------------------------------------- #

    def get_source_adapters(self) -> List[SourceAdapter]:
        """Adaptadores que abren streams desde origenes externos."""
        return []

    def get_importers(self) -> List[Importer]:
        """Parsers de formato para el insertador generico (JSON, CSV, ...)."""
        return []

    def get_exporters(self) -> List[Exporter]:
        """Serializadores para el exportador generico."""
        return []

    def get_field_widgets(self) -> List[FieldWidget]:
        """Pistas de UI que enriquecen el JSON Schema generado."""
        return []

    def get_fk_resolvers(self) -> List[FKResolver]:
        """Resolvers para lookups FK ``{by, value}`` en payloads de importacion."""
        return []

    def get_model_providers(self) -> List[AssistantModelProvider]:
        """Modelos LLM que este plugin pone a disposicion del asistente."""
        return []

    def get_assistant_tools(self) -> List[AssistantTool]:
        """Herramientas (de servidor o de UI) que el asistente puede usar."""
        return []
