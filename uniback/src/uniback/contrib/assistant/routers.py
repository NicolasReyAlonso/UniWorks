"""
API del asistente.

* ``GET  /assistant/models`` — modelos seleccionables (del registro).
* ``GET  /assistant/tools``  — herramientas integradas (del registro).
* ``POST /assistant/chat``   — chat con streaming SSE, bajo la sesión del
  usuario (``get_n_session``), de modo que las herramientas de datos respetan
  el ACL.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from uniback.api.dependencies import AppSession, get_n_session
from uniback.config.settings import get_settings
from uniback.contrib.assistant.service import run_chat_stream
from uniback.plugins.registries import assistant_tool_registry, model_provider_registry

router = APIRouter(prefix="/assistant", tags=["Assistant"])


@router.get("/models")
async def list_models() -> dict:
    return {
        "content": model_provider_registry.describe_all(),
        "default": get_settings().assistant.default_model,
    }


@router.get("/tools")
async def list_tools() -> dict:
    return {"content": assistant_tool_registry.describe_all()}


@router.post("/chat")
async def chat(
    request: Request,
    sess: AppSession = Depends(get_n_session(read_only=True)),
) -> StreamingResponse:
    body = await request.json()
    settings = get_settings().assistant

    generator = run_chat_stream(
        session=sess,
        model=body.get("model"),
        enabled_tool_names=body.get("enabled_tools"),
        messages=body.get("messages") or [],
        current_context=body.get("current_context") or {},
        default_model=settings.default_model,
        max_iterations=settings.max_tool_iterations,
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
