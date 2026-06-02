import importlib
import inspect
import logging
import os
import sys
from typing import List, Type, Any
from fastapi import FastAPI
from sqlalchemy.orm import Session

from uniback.plugins.base import UnibackPlugin
from uniback.plugins.registries import (
    exporter_registry,
    field_widget_registry,
    fk_resolver_registry,
    importer_registry,
    source_adapter_registry,
)


log = logging.getLogger(__name__)

class PluginManager:
    """
    Discovers, loads, and manages lifecycle events for Uniback plugins.
    """
    def __init__(self):
        self.plugins: List[UnibackPlugin] = []

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

                # Look for classes inheriting from UnibackPlugin
                for name, obj in inspect.getmembers(module):
                    if inspect.isclass(obj) and issubclass(obj, UnibackPlugin) and obj is not UnibackPlugin:
                        # Instantiate the plugin
                        plugin_instance = obj()
                        self.plugins.append(plugin_instance)
                        print(f"[*] Loaded plugin: {plugin_instance.name} (v{plugin_instance.version})")

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

    def get_all_routers(self) -> List:
        routers = []
        for plugin in self.plugins:
            routers.extend(plugin.get_routers())
        return routers

    def emit_on_seed(self, db: Session) -> None:
        for plugin in self.plugins:
            plugin.on_seed(db)

    def emit_on_app_ready(self, app: FastAPI) -> None:
        for plugin in self.plugins:
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
