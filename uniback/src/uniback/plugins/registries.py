"""
Registros globales para las extensiones aportadas por plugins.

Los singletons que viven aqui son la API publica que el resto del framework
consulta sin acoplarse al ``PluginManager``. El nucleo registra implementaciones
por defecto durante la inicializacion; los plugins anaden las suyas via
``UnibackPlugin.get_*``.

Politica de seleccion: el ultimo registrado para un mismo ``name`` gana,
permitiendo que un plugin sobreescriba un comportamiento por defecto. Los
metodos ``find_*`` recorren los registros en orden inverso de insercion.
"""

from __future__ import annotations

import logging
from threading import RLock
from typing import Any, Dict, Generic, Iterable, List, Optional, TypeVar

from uniback.plugins.contracts import (
    AssistantModelProvider,
    AssistantTool,
    Exporter,
    FieldWidget,
    FKResolver,
    Importer,
    SourceAdapter,
)


log = logging.getLogger(__name__)

T = TypeVar("T")


class Registry(Generic[T]):
    """Registro thread-safe ordenado por insercion. Idempotente por ``name``."""

    def __init__(self, label: str) -> None:
        self._label = label
        self._items: Dict[str, T] = {}
        self._order: List[str] = []
        self._lock = RLock()

    def register(self, item: T, *, name: Optional[str] = None, replace: bool = True) -> None:
        key = name or getattr(item, "name", None) or item.__class__.__name__
        with self._lock:
            if key in self._items and not replace:
                log.debug("%s: '%s' ya registrado, ignorado", self._label, key)
                return
            if key in self._items:
                log.debug("%s: sustituyendo '%s'", self._label, key)
                self._order.remove(key)
            self._items[key] = item
            self._order.append(key)

    def unregister(self, name: str) -> None:
        with self._lock:
            self._items.pop(name, None)
            if name in self._order:
                self._order.remove(name)

    def get(self, name: str) -> Optional[T]:
        return self._items.get(name)

    def all(self) -> List[T]:
        return [self._items[k] for k in self._order]

    def reversed(self) -> Iterable[T]:
        for k in reversed(self._order):
            yield self._items[k]

    def names(self) -> List[str]:
        return list(self._order)

    def clear(self) -> None:
        with self._lock:
            self._items.clear()
            self._order.clear()

    def __contains__(self, name: str) -> bool:
        return name in self._items

    def __len__(self) -> int:
        return len(self._items)


class SourceAdapterRegistry(Registry[SourceAdapter]):
    def find_for_uri(self, uri: str) -> Optional[SourceAdapter]:
        for adapter in self.reversed():
            try:
                if adapter.matches(uri):
                    return adapter
            except Exception:
                log.exception("SourceAdapter %s fallo en matches()", adapter.name)
        return None


class ImporterRegistry(Registry[Importer]):
    def find(self, *, filename: Optional[str] = None, content_type: Optional[str] = None,
             name: Optional[str] = None) -> Optional[Importer]:
        if name:
            return self.get(name)
        for imp in self.reversed():
            try:
                if imp.matches(filename=filename, content_type=content_type):
                    return imp
            except Exception:
                log.exception("Importer %s fallo en matches()", imp.name)
        return None


class ExporterRegistry(Registry[Exporter]):
    def find(self, *, filename: Optional[str] = None, content_type: Optional[str] = None,
             name: Optional[str] = None) -> Optional[Exporter]:
        if name:
            return self.get(name)
        for exp in self.reversed():
            fmt_match = filename and any(filename.lower().endswith(f".{f}") for f in exp.formats)
            ct_match = content_type and content_type in exp.content_types
            if fmt_match or ct_match:
                return exp
        return None


class FieldWidgetRegistry(Registry[FieldWidget]):
    def enrichments_for(self, column_name: str, column_schema: dict, column_info: dict) -> List[dict]:
        out: List[dict] = []
        for widget in self.all():
            try:
                if widget.matches(column_name, column_schema, column_info):
                    extra = widget.enrich(column_name, column_schema, column_info) or {}
                    if extra:
                        out.append(dict(extra))
            except Exception:
                log.exception("FieldWidget %s fallo enriqueciendo %s", getattr(widget, "name", "?"), column_name)
        return out


class FKResolverRegistry(Registry[FKResolver]):
    def resolve(self, db: Any, target_class: type, lookup: dict) -> Optional[Any]:
        for resolver in self.reversed():
            try:
                if resolver.matches(target_class, lookup):
                    result = resolver.resolve(db, target_class, lookup)
                    if result is not None:
                        return result
            except Exception:
                log.exception("FKResolver %s fallo resolviendo %r", resolver.name, lookup)
        return None


class ModelProviderRegistry(Registry[AssistantModelProvider]):
    """Modelos LLM seleccionables. Cada entrada = una opcion del selector."""

    def describe_all(self) -> List[dict]:
        return [p.describe() for p in self.all()]


class AssistantToolRegistry(Registry[AssistantTool]):
    """Herramientas del asistente (de servidor y de UI)."""

    def describe_all(self) -> List[dict]:
        return [t.describe() for t in self.all()]

    def server_tools(self) -> List[AssistantTool]:
        return [t for t in self.all() if t.side == "server"]

    def ui_tools(self) -> List[AssistantTool]:
        return [t for t in self.all() if t.side == "ui"]


source_adapter_registry = SourceAdapterRegistry("SourceAdapterRegistry")
importer_registry = ImporterRegistry("ImporterRegistry")
exporter_registry = ExporterRegistry("ExporterRegistry")
field_widget_registry = FieldWidgetRegistry("FieldWidgetRegistry")
fk_resolver_registry = FKResolverRegistry("FKResolverRegistry")
model_provider_registry = ModelProviderRegistry("ModelProviderRegistry")
assistant_tool_registry = AssistantToolRegistry("AssistantToolRegistry")


__all__ = [
    "Registry",
    "SourceAdapterRegistry",
    "ImporterRegistry",
    "ExporterRegistry",
    "FieldWidgetRegistry",
    "FKResolverRegistry",
    "ModelProviderRegistry",
    "AssistantToolRegistry",
    "source_adapter_registry",
    "importer_registry",
    "exporter_registry",
    "field_widget_registry",
    "fk_resolver_registry",
    "model_provider_registry",
    "assistant_tool_registry",
]
