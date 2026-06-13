"""
Proveedores de modelo del asistente.

Dos implementaciones del contrato ``AssistantModelProvider``:

* ``AnthropicProvider`` — modelos Claude via el SDK oficial ``anthropic``
  (tool use + streaming). Es el camino recomendado para Claude.
* ``OpenAICompatibleProvider`` — adaptador genérico para endpoints
  OpenAI-compatible (Ollama, vLLM, LM Studio, o el gateway de una empresa):
  ``{base_url}/chat/completions`` con ``stream: true`` y tool calling estilo
  OpenAI. Es lo que el usuario configura con URL + API key para una IA local.

Ambos normalizan su salida a ``StreamEvent`` para que el bucle del asistente
(``service.py``) sea agnóstico del backend de IA. No se mezclan SDKs: el
proveedor Claude usa ``anthropic``; el genérico habla HTTP directo.

Nota de diseño: en esta versión NO se envía configuración de ``thinking`` a
Claude (se omite, lo que en Opus 4.8 equivale a "sin pensamiento extendido").
Así evitamos tener que reinyectar bloques de thinking en cada vuelta del bucle
de herramientas, que es la única forma admitida de continuarlos en el mismo
modelo. Si se quisiera activar adaptive thinking habría que propagar esos
bloques en el historial neutro.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Iterator, List, Mapping

from uniback.plugins.contracts import AssistantModelProvider, StreamEvent

log = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Claude (SDK anthropic)
# --------------------------------------------------------------------------- #
class AnthropicProvider(AssistantModelProvider):
    kind = "anthropic"

    def __init__(
        self,
        *,
        name: str,
        label: str,
        model_id: str,
        api_key: str,
        max_tokens: int = 8192,
        capabilities: Mapping[str, Any] | None = None,
    ) -> None:
        self.name = name
        self.label = label
        self.model_id = model_id
        self._api_key = api_key
        self._max_tokens = max_tokens
        self.capabilities = capabilities or {"streaming": True, "tools": True}

    def _client(self):
        import anthropic

        return anthropic.Anthropic(api_key=self._api_key)

    @staticmethod
    def _to_anthropic(messages: List[Mapping[str, Any]]) -> List[dict]:
        """Historial neutro -> formato Messages de Anthropic."""
        out: List[dict] = []
        for m in messages:
            role = m["role"]
            if role == "user":
                out.append({"role": "user", "content": [{"type": "text", "text": m.get("content", "")}]})
            elif role == "assistant":
                content: List[dict] = []
                if m.get("content"):
                    content.append({"type": "text", "text": m["content"]})
                for tc in m.get("tool_calls", []) or []:
                    content.append({
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc.get("input") or {},
                    })
                out.append({"role": "assistant", "content": content or [{"type": "text", "text": ""}]})
            elif role == "tool":
                out.append({"role": "user", "content": [{
                    "type": "tool_result",
                    "tool_use_id": m["tool_call_id"],
                    "content": m.get("content", ""),
                }]})
        return out

    def stream_turn(
        self,
        *,
        system: str,
        messages: List[Mapping[str, Any]],
        tools: List[Mapping[str, Any]],
    ) -> Iterator[StreamEvent]:
        client = self._client()
        kwargs: dict = {
            "model": self.model_id,
            "max_tokens": self._max_tokens,
            "messages": self._to_anthropic(messages),
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = [{
                "name": t["name"],
                "description": t.get("description", ""),
                "input_schema": t.get("input_schema") or {"type": "object", "properties": {}},
            } for t in tools]

        with client.messages.stream(**kwargs) as stream:
            for delta in stream.text_stream:
                if delta:
                    yield StreamEvent(type="text", text=delta)
            final = stream.get_final_message()

        for block in final.content:
            if getattr(block, "type", None) == "tool_use":
                yield StreamEvent(
                    type="tool_use",
                    tool_id=block.id,
                    tool_name=block.name,
                    tool_input=dict(block.input or {}),
                )
        yield StreamEvent(type="end", stop_reason=final.stop_reason)


# --------------------------------------------------------------------------- #
# OpenAI-compatible (modelos locales / empresa)
# --------------------------------------------------------------------------- #
class OpenAICompatibleProvider(AssistantModelProvider):
    kind = "openai_compatible"

    def __init__(
        self,
        *,
        name: str,
        label: str,
        model_id: str,
        base_url: str,
        api_key: str | None = None,
        max_tokens: int = 8192,
        capabilities: Mapping[str, Any] | None = None,
    ) -> None:
        self.name = name
        self.label = label
        self.model_id = model_id
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._max_tokens = max_tokens
        self.capabilities = capabilities or {"streaming": True, "tools": True}

    @staticmethod
    def _to_openai(messages: List[Mapping[str, Any]]) -> List[dict]:
        out: List[dict] = []
        for m in messages:
            role = m["role"]
            if role == "user":
                out.append({"role": "user", "content": m.get("content", "")})
            elif role == "assistant":
                msg: dict = {"role": "assistant", "content": m.get("content", "") or ""}
                tcs = m.get("tool_calls") or []
                if tcs:
                    msg["tool_calls"] = [{
                        "id": tc["id"],
                        "type": "function",
                        "function": {"name": tc["name"], "arguments": json.dumps(tc.get("input") or {})},
                    } for tc in tcs]
                out.append(msg)
            elif role == "tool":
                out.append({"role": "tool", "tool_call_id": m["tool_call_id"], "content": m.get("content", "")})
        return out

    def stream_turn(
        self,
        *,
        system: str,
        messages: List[Mapping[str, Any]],
        tools: List[Mapping[str, Any]],
    ) -> Iterator[StreamEvent]:
        import httpx

        oai_messages = self._to_openai(messages)
        if system:
            oai_messages = [{"role": "system", "content": system}] + oai_messages

        payload: dict = {
            "model": self.model_id,
            "max_tokens": self._max_tokens,
            "messages": oai_messages,
            "stream": True,
        }
        if tools:
            payload["tools"] = [{
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t.get("description", ""),
                    "parameters": t.get("input_schema") or {"type": "object", "properties": {}},
                },
            } for t in tools]

        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        # Acumuladores de tool calls por índice (la API los entrega troceados).
        tool_acc: dict[int, dict] = {}
        stop_reason = "end_turn"

        with httpx.Client(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
            with client.stream("POST", f"{self._base_url}/chat/completions",
                               json=payload, headers=headers) as resp:
                if resp.status_code >= 400:
                    # Surface the provider's real reason (LM Studio, vLLM... lo
                    # devuelven en el cuerpo), no un genérico "400 Bad Request".
                    resp.read()
                    detail = resp.text.strip()
                    try:
                        detail = json.loads(detail).get("error", {}).get("message", detail)
                    except (json.JSONDecodeError, AttributeError):
                        pass
                    raise RuntimeError(f"{self.label}: {detail or f'HTTP {resp.status_code}'}")
                for line in resp.iter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[len("data:"):].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    choice = (chunk.get("choices") or [{}])[0]
                    delta = choice.get("delta") or {}
                    if delta.get("content"):
                        yield StreamEvent(type="text", text=delta["content"])
                    for tc in delta.get("tool_calls") or []:
                        idx = tc.get("index", 0)
                        acc = tool_acc.setdefault(idx, {"id": None, "name": "", "args": ""})
                        if tc.get("id"):
                            acc["id"] = tc["id"]
                        fn = tc.get("function") or {}
                        if fn.get("name"):
                            acc["name"] += fn["name"]
                        if fn.get("arguments"):
                            acc["args"] += fn["arguments"]
                    if choice.get("finish_reason"):
                        stop_reason = "tool_use" if choice["finish_reason"] == "tool_calls" else choice["finish_reason"]

        for idx in sorted(tool_acc):
            acc = tool_acc[idx]
            if not acc["name"]:
                continue
            try:
                parsed = json.loads(acc["args"]) if acc["args"] else {}
            except json.JSONDecodeError:
                parsed = {}
            yield StreamEvent(
                type="tool_use",
                tool_id=acc["id"] or f"call_{idx}",
                tool_name=acc["name"],
                tool_input=parsed,
            )
        yield StreamEvent(type="end", stop_reason=stop_reason)


def build_providers_from_settings(assistant_settings: Any) -> List[AssistantModelProvider]:
    """Construye los proveedores de serie a partir de ``AssistantSettings``.

    * Claude Opus/Sonnet/Haiku si hay ``anthropic_api_key``.
    * Un proveedor OpenAI-compatible por cada entrada de ``extra_providers``.
    """
    providers: List[AssistantModelProvider] = []

    key = getattr(assistant_settings, "anthropic_api_key", None)
    max_tokens = getattr(assistant_settings, "max_tokens", 8192)
    if key:
        claude_models = [
            ("claude-opus-4-8", "Claude Opus 4.8"),
            ("claude-sonnet-4-6", "Claude Sonnet 4.6"),
            ("claude-haiku-4-5", "Claude Haiku 4.5"),
        ]
        for model_id, label in claude_models:
            providers.append(AnthropicProvider(
                name=model_id, label=label, model_id=model_id,
                api_key=key, max_tokens=max_tokens,
            ))
    else:
        log.warning("[assistant] Sin UNIBACK_ASSISTANT_ANTHROPIC_API_KEY: no se registran modelos Claude")

    for entry in getattr(assistant_settings, "extra_providers", []) or []:
        try:
            providers.append(OpenAICompatibleProvider(
                name=entry["name"],
                label=entry.get("label", entry["name"]),
                model_id=entry["model_id"],
                base_url=entry["base_url"],
                api_key=entry.get("api_key"),
                max_tokens=max_tokens,
            ))
        except (KeyError, TypeError) as e:
            log.warning("[assistant] extra_provider mal configurado (%r): %s", entry, e)

    return providers
