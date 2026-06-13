"""
Plugin de serie del asistente LLM multi-modelo.

Aporta al framework:
  * modelos seleccionables (``get_model_providers``) — Claude via SDK
    ``anthropic`` + proveedores OpenAI-compatible configurados por settings;
  * herramientas (``get_assistant_tools``) — datos (servidor, ACL) y UI;
  * el router ``/assistant`` (``get_routers``).

Corre en el nodo ``assistant`` (y en ``monolith``). Modelos y herramientas se
registran en TODOS los nodos vía ``populate_registries`` (no dependen de la
actividad del nodo), pero el router solo se monta donde el plugin está activo.
"""

from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter

from uniback.plugins.base import UnibackPlugin


class AssistantPlugin(UnibackPlugin):
    name = "uniback.assistant"
    description = "Asistente LLM multi-modelo con herramientas sobre la app"
    version = "1.0.0"

    node_types = {"assistant"}
    openapi_tags = [
        {"name": "Assistant", "description": "LLM assistant: models, tools and chat"},
    ]

    def get_model_providers(self) -> List[Any]:
        from uniback.config.settings import get_settings
        from uniback.contrib.assistant.providers import build_providers_from_settings

        return build_providers_from_settings(get_settings().assistant)

    def get_assistant_tools(self) -> List[Any]:
        from uniback.contrib.assistant.tools import build_builtin_tools

        return build_builtin_tools()

    def get_routers(self) -> List[APIRouter]:
        from uniback.contrib.assistant.routers import router

        return [router]
