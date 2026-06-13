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
from typing import Any, BinaryIO, Dict, Iterable, Iterator, List, Mapping, Optional, Protocol, Type


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


# --------------------------------------------------------------------------- #
# Asistente LLM: proveedores de modelo y herramientas inyectables.
#
# Igual que importers/exporters/widgets, los modelos y las herramientas del
# asistente son extensiones que los plugins aportan y el front descubre. Un
# proveedor envuelve a un LLM concreto (Claude via SDK anthropic, o un modelo
# local OpenAI-compatible) y normaliza su salida a eventos de streaming, de
# modo que el bucle agentico del asistente sea agnostico del backend de IA.
# --------------------------------------------------------------------------- #


@dataclass
class StreamEvent:
    """Evento normalizado emitido por un proveedor durante un turno.

    ``type``:
      * ``"text"``      -> ``text`` lleva el delta de texto del asistente.
      * ``"tool_use"``  -> el modelo pide ejecutar una herramienta
                           (``tool_id``, ``tool_name``, ``tool_input``).
      * ``"end"``       -> fin del turno; ``stop_reason`` informa del motivo
                           (``"end_turn"``, ``"tool_use"``, ``"refusal"``...).
    """
    type: str
    text: str = ""
    tool_id: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[Mapping[str, Any]] = None
    stop_reason: Optional[str] = None


class AssistantModelProvider(ABC):
    """Un modelo LLM seleccionable por el usuario.

    Cada proveedor es una entrada del selector del front. Implementaciones de
    serie: Claude (Opus/Sonnet/Haiku) via SDK ``anthropic`` y un adaptador
    OpenAI-compatible para modelos locales/empresa (URL + API key).
    """
    name: str = "base"            # identificador estable (clave de registro/seleccion)
    label: str = "Base model"     # etiqueta legible para el selector del front
    kind: str = "base"            # "anthropic" | "openai_compatible" | ...
    model_id: str = ""            # id del modelo en el proveedor subyacente

    #: pistas para el front (p.ej. {"streaming": True, "tools": True}).
    capabilities: Mapping[str, Any] = {}

    def describe(self) -> Dict[str, Any]:
        """Resumen serializable para ``GET /assistant/models``."""
        return {
            "name": self.name,
            "label": self.label,
            "kind": self.kind,
            "model_id": self.model_id,
            "capabilities": dict(self.capabilities or {}),
        }

    @abstractmethod
    def stream_turn(
        self,
        *,
        system: str,
        messages: List[Mapping[str, Any]],
        tools: List[Mapping[str, Any]],
    ) -> Iterator[StreamEvent]:
        """Ejecuta UN turno del modelo y emite ``StreamEvent`` en streaming.

        ``messages`` es el historial en formato neutro
        ``{"role": "user"|"assistant"|"tool", ...}``; ``tools`` son los JSON
        Schema de las herramientas habilitadas. El proveedor traduce a/desde su
        formato nativo. No ejecuta herramientas: solo las solicita via
        ``tool_use`` y el bucle del asistente le devuelve el resultado en el
        siguiente turno.
        """


class AssistantTool(ABC):
    """Una herramienta que el asistente puede invocar.

    Dos lados (``side``):
      * ``"server"`` -> se ejecuta en el backend dentro de la sesion del
        usuario (``execute``); el ACL del kernel se aplica solo.
      * ``"ui"``     -> accion terminal que ejecuta el overlay del navegador
        (navegar, proponer filas...). El backend no la ejecuta: la emite al
        cliente y devuelve un acuse al modelo.
    """
    name: str = "base"
    description: str = ""
    side: str = "server"          # "server" | "ui"
    input_schema: Mapping[str, Any] = {}

    def describe(self) -> Dict[str, Any]:
        """Resumen serializable para ``GET /assistant/tools`` y para el LLM."""
        return {
            "name": self.name,
            "description": self.description,
            "side": self.side,
            "input_schema": dict(self.input_schema or {}),
        }

    def execute(self, session: Any, **tool_input: Any) -> Any:
        """Ejecuta una herramienta de servidor. ``session`` es el AppSession del
        usuario (trae db_session + identidad), de modo que toda lectura/consulta
        respeta el ACL. Las herramientas de UI no la implementan."""
        raise NotImplementedError(f"Tool '{self.name}' no es de servidor")


__all__ = [
    "ImportRowResult",
    "SourceAdapter",
    "Importer",
    "Exporter",
    "FieldWidget",
    "FKResolver",
    "StreamEvent",
    "AssistantModelProvider",
    "AssistantTool",
]
