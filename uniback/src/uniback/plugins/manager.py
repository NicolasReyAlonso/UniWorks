import importlib
import inspect
import logging
import os
import pkgutil
import sys
from typing import Any, Dict, List, Type
from fastapi import FastAPI
from sqlalchemy.orm import Session

from uniback.plugins.base import UnibackPlugin
from uniback.plugins.registries import (
    assistant_tool_registry,
    exporter_registry,
    field_widget_registry,
    fk_resolver_registry,
    importer_registry,
    model_provider_registry,
    source_adapter_registry,
)


log = logging.getLogger(__name__)

class PluginManager:
    """
    Discovers, loads, and manages lifecycle events for Uniback plugins.

    Hay dos familias de plugins:
      * De serie ("contrib"): viven en ``uniback.contrib.<dominio>`` y
        contienen los dominios funcionales del framework (auth, files,
        annotations...). Se descubren siempre con ``discover_internal``.
      * Externos: paquetes sueltos en ``UNIBACK_PLUGINS_PATH`` (por defecto
        ``src/plugins``), descubiertos con ``discover_plugins``.

    Contrato importante: el ``plugin.py`` NO debe importar sus modelos a nivel
    de modulo (el descubrimiento ocurre antes de ``create_orm_base``); los
    imports de modelos/routers van diferidos dentro de ``get_routers`` /
    ``on_seed``, como hace ``src/plugins/seedbeds``.
    """
    def __init__(self):
        self.plugins: List[UnibackPlugin] = []
        # Cache de routers por plugin: get_routers() construye los routers y,
        # como efecto, registra sus entidades en el schema_registry; cachear
        # evita construir/registrar dos veces.
        self._router_cache: Dict[int, List] = {}

    def _load_from_module(self, module) -> None:
        """Instancia y registra las subclases de UnibackPlugin de un modulo.

        Idempotente por clase: ``initialize()`` puede llamarse varias veces en
        un mismo proceso (p.ej. la suite de tests) sin duplicar plugins.
        """
        for name, obj in inspect.getmembers(module):
            if inspect.isclass(obj) and issubclass(obj, UnibackPlugin) and obj is not UnibackPlugin:
                if any(type(p) is obj for p in self.plugins):
                    continue
                plugin_instance = obj()
                self.plugins.append(plugin_instance)
                print(f"[*] Loaded plugin: {plugin_instance.name} (v{plugin_instance.version})")

    def discover_internal(self, package: str = "uniback.contrib") -> None:
        """
        Descubre los plugins de serie del framework: cada subpaquete de
        ``uniback.contrib`` con un modulo ``plugin`` que defina una subclase
        de UnibackPlugin.
        """
        try:
            pkg = importlib.import_module(package)
        except ImportError:
            return

        for mod_info in pkgutil.iter_modules(pkg.__path__):
            if not mod_info.ispkg:
                continue
            module_name = f"{package}.{mod_info.name}.plugin"
            try:
                module = importlib.import_module(module_name)
                self._load_from_module(module)
            except Exception as e:
                print(f"[!] Error loading contrib plugin '{module_name}': {e}")

    def discover_plugins(self, plugins_package_path: str = None) -> None:
        """
        Scan a directory or package for plugin classes inheriting from UnibackPlugin.
        """
        if not plugins_package_path or not os.path.exists(plugins_package_path):
            return

        # Ensure the plugins directory is in the Python path
        if plugins_package_path not in sys.path:
            sys.path.insert(0, plugins_package_path)

        for item in os.listdir(plugins_package_path):
            item_path = os.path.join(plugins_package_path, item)
            # Check if it's a python module or package
            if os.path.isdir(item_path) and os.path.isfile(os.path.join(item_path, "__init__.py")):
                module_name = item
            elif os.path.isfile(item_path) and item.endswith(".py") and item != "__init__.py":
                module_name = item[:-3]
            else:
                continue

            try:
                # Try importing the specific "plugin" submodule if it's a package, or the module itself
                try:
                    module = importlib.import_module(f"{module_name}.plugin")
                except ImportError:
                    module = importlib.import_module(module_name)

                self._load_from_module(module)

            except Exception as e:
                print(f"[!] Error loading plugin module '{module_name}': {e}")

    def emit_on_init(self, settings: Any) -> None:
        for plugin in self.plugins:
            plugin.on_init(settings)

    def get_all_model_modules(self) -> List[str]:
        modules = []
        for plugin in self.plugins:
            modules.extend(plugin.get_model_modules())
        return modules

    def _routers_of(self, plugin: UnibackPlugin) -> List:
        key = id(plugin)
        if key not in self._router_cache:
            self._router_cache[key] = list(plugin.get_routers() or [])
        return self._router_cache[key]

    def get_routers_for_node(self, node_type: str) -> List:
        """
        Devuelve los routers a MONTAR en este nodo.

        Construye los routers de TODOS los plugins (asi cada nodo registra el
        catalogo completo de entidades en el schema_registry y /sys/schemas
        sirve el bundle integro), pero solo devuelve para montaje los de
        plugins activos en ``node_type``.
        """
        routers = []
        for plugin in self.plugins:
            built = self._routers_of(plugin)
            if plugin.is_active(node_type):
                routers.extend(built)
        return routers

    def get_all_routers(self) -> List:
        """Deprecado: equivale a ``get_routers_for_node('monolith')``."""
        return self.get_routers_for_node("monolith")

    def get_openapi_tags_for_node(self, node_type: str) -> List[dict]:
        tags: List[dict] = []
        for plugin in self.plugins:
            if plugin.is_active(node_type):
                tags.extend(plugin.openapi_tags)
        return tags

    def emit_on_seed(self, db: Session, node_type: str = "monolith") -> None:
        """Siembra de plugins activos, en orden de ``seed_priority``."""
        for plugin in sorted(self.plugins, key=lambda p: p.seed_priority):
            if plugin.is_active(node_type):
                plugin.on_seed(db)

    def emit_on_app_ready(self, app: FastAPI, node_type: str = "monolith") -> None:
        for plugin in self.plugins:
            if plugin.is_active(node_type):
                plugin.on_app_ready(app)

    # ------------------------------------------------------------------ #
    # Volcado al registro global de extensiones inyectables.
    # ------------------------------------------------------------------ #
    _EXTENSION_GETTERS = (
        ("get_source_adapters", source_adapter_registry, "source adapter"),
        ("get_importers", importer_registry, "importer"),
        ("get_exporters", exporter_registry, "exporter"),
        ("get_field_widgets", field_widget_registry, "field widget"),
        ("get_fk_resolvers", fk_resolver_registry, "fk resolver"),
        ("get_model_providers", model_provider_registry, "model provider"),
        ("get_assistant_tools", assistant_tool_registry, "assistant tool"),
    )

    def populate_registries(self) -> None:
        """Recoge las extensiones declaradas por los plugins y las inscribe."""
        for plugin in self.plugins:
            for getter_name, registry, label in self._EXTENSION_GETTERS:
                getter = getattr(plugin, getter_name, None)
                if not callable(getter):
                    continue
                try:
                    items = getter() or []
                except Exception as e:
                    log.warning("Plugin '%s' fallo en %s(): %s", plugin.name, getter_name, e)
                    continue
                for item in items:
                    try:
                        registry.register(item)
                        log.info("Registrado %s '%s' del plugin '%s'",
                                 label, getattr(item, "name", item.__class__.__name__), plugin.name)
                    except Exception as e:
                        log.warning("No se pudo registrar %s de '%s': %s", label, plugin.name, e)


# Global singleton
plugin_manager = PluginManager()
