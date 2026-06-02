"""
Contratos (Protocols / ABCs) para las extensiones inyectables del framework.

Cada plugin puede declarar implementaciones de estos contratos a traves de los
getters opcionales de ``UnibackPlugin``. Los contratos viven aqui para que el
resto del framework pueda depender de ellos sin acoplarse al ``PluginManager``.

Ningun contrato impone dependencias concretas (FastAPI, SQLAlchemy) en su firma
publica salvo cuando es estrictamente necesario, para que un mismo objeto pueda
ser usado por mas de un subsistema (importer, exporter, ingesta CLI, etc.).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, BinaryIO, Iterable, List, Mapping, Optional, Protocol, Type


@dataclass
class ImportRowResult:
    """Resultado de procesar una fila durante una importacion."""
    index: int
    ok: bool
    pk: Optional[Any] = None
    error: Optional[str] = None
    raw: Optional[Mapping[str, Any]] = None


class SourceAdapter(ABC):
    """
    Lee bytes desde un origen externo (fichero local, S3, URL, BD externa...).

    El framework no asume el formato del contenido: el ``Importer`` se encarga
    de parsearlo. Un mismo ``SourceAdapter`` puede servir a varios importers.
    """
    name: str = "base"
    schemes: tuple[str, ...] = ()

    @abstractmethod
    def open(self, uri: str, **opts: Any) -> BinaryIO:
        """Devuelve un stream binario legible para ``uri``."""

    def matches(self, uri: str) -> bool:
        if not self.schemes:
            return False
        return any(uri.startswith(f"{s}:") or uri.startswith(f"{s}://") for s in self.schemes)


class Importer(ABC):
    """
    Convierte un stream en una secuencia de dicts ``{columna: valor}`` listos
    para el insertador generico.
    """
    name: str = "base"
    formats: tuple[str, ...] = ()  # ej. ("json",), ("csv",), ("xlsx",)
    content_types: tuple[str, ...] = ()

    @abstractmethod
    def parse(
        self,
        stream: BinaryIO,
        *,
        entity_name: Optional[str] = None,
        schema: Optional[Mapping[str, Any]] = None,
        options: Optional[Mapping[str, Any]] = None,
    ) -> Iterable[Mapping[str, Any]]:
        """Itera filas como dicts. ``schema`` es el JSON Schema enriquecido."""

    def matches(self, *, filename: Optional[str] = None, content_type: Optional[str] = None) -> bool:
        if filename:
            for fmt in self.formats:
                if filename.lower().endswith(f".{fmt}"):
                    return True
        if content_type and content_type in self.content_types:
            return True
        return False


class Exporter(ABC):
    """Serializa filas hacia un formato concreto (simetrico a ``Importer``)."""
    name: str = "base"
    formats: tuple[str, ...] = ()
    content_types: tuple[str, ...] = ()

    @abstractmethod
    def dump(
        self,
        rows: Iterable[Mapping[str, Any]],
        stream: BinaryIO,
        *,
        entity_name: Optional[str] = None,
        schema: Optional[Mapping[str, Any]] = None,
        options: Optional[Mapping[str, Any]] = None,
    ) -> None: ...


class FieldWidget(Protocol):
    """
    Anade pistas de UI (Formly, JSON Forms...) al JSON Schema generado.

    El framework recorre todos los widgets registrados por cada propiedad del
    schema y deja que cada uno decida si la enriquece. Permite que un plugin
    introduzca tipos custom (mapas, editor de codigo, file picker...) sin tocar
    nada del nucleo.
    """
    name: str

    def matches(self, column_name: str, column_schema: Mapping[str, Any], column_info: Mapping[str, Any]) -> bool: ...

    def enrich(self, column_name: str, column_schema: Mapping[str, Any], column_info: Mapping[str, Any]) -> Mapping[str, Any]: ...


class FKResolver(ABC):
    """
    Resuelve una referencia FK declarada como objeto ``{"by": campo, "value": ...}``
    en el payload del importer. El resolver por defecto buscara por la PK; los
    plugins pueden registrar resolvers por entidad o campo concreto.
    """
    name: str = "base"

    @abstractmethod
    def resolve(self, db: Any, target_class: Type, lookup: Mapping[str, Any]) -> Optional[Any]:
        """Devuelve el valor PK al que apunta ``lookup`` o ``None`` si no existe."""

    def matches(self, target_class: Type, lookup: Mapping[str, Any]) -> bool:
        return True


__all__ = [
    "ImportRowResult",
    "SourceAdapter",
    "Importer",
    "Exporter",
    "FieldWidget",
    "FKResolver",
]
