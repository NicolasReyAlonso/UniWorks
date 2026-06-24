"""
Persistencia e historial de conversaciones del asistente.

* Helper ``upsert_conversation`` — crea o actualiza la conversación de un usuario
  con el historial de mensajes (lo usa el flujo de ``/assistant/chat`` al cerrar
  el turno, con su propia sesión de BD).
* Router ``/assistant/conversations`` — listar / leer / renombrar / borrar, todo
  acotado SIEMPRE a la identidad de la sesión para no filtrar conversaciones de
  otros usuarios.
"""

from __future__ import annotations

import uuid as uuidlib
from typing import Any, List, Mapping, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from uniback.api.dependencies import AppSession, get_n_session
from uniback.contrib.assistant.models import AssistantConversation

router = APIRouter(prefix="/assistant/conversations", tags=["Assistant"])

_TITLE_MAX = 60


def _derive_title(messages: List[Mapping[str, Any]]) -> str:
    """Título a partir del primer mensaje del usuario (truncado)."""
    for m in messages:
        if m.get("role") == "user":
            text = (m.get("content") or "").strip().replace("\n", " ")
            if text:
                return text[:_TITLE_MAX] + ("…" if len(text) > _TITLE_MAX else "")
    return "Nueva conversación"


def upsert_conversation(
    db: Session,
    *,
    identity_id: int,
    conversation_uuid: Optional[str],
    messages: List[Mapping[str, Any]],
    model: Optional[str] = None,
) -> AssistantConversation:
    """Crea o actualiza la conversación del usuario y devuelve la fila.

    El ``commit`` lo gestiona el llamante. Si ``conversation_uuid`` apunta a una
    conversación de OTRO usuario (o inexistente), se crea una nueva: nunca se
    sobrescribe la de otra identidad.
    """
    normalized = [
        {"role": m.get("role"), "content": m.get("content") or ""}
        for m in messages
        if m.get("role") in ("user", "assistant")
    ]

    conv: Optional[AssistantConversation] = None
    if conversation_uuid:
        try:
            parsed = uuidlib.UUID(str(conversation_uuid))
        except (ValueError, TypeError):
            parsed = None
        if parsed is not None:
            conv = db.scalar(
                select(AssistantConversation).where(
                    AssistantConversation.uuid == parsed,
                    AssistantConversation.identity_id == identity_id,
                )
            )

    if conv is None:
        conv = AssistantConversation(
            identity_id=identity_id,
            title=_derive_title(normalized),
            model=model,
            messages=normalized,
        )
        db.add(conv)
    else:
        conv.messages = normalized
        if model:
            conv.model = model
        if not conv.title:
            conv.title = _derive_title(normalized)

    db.flush()
    return conv


# ---------------------------------------------------------------------------
# Endpoints (siempre acotados a sess.identity_id)
# ---------------------------------------------------------------------------


def _owned_or_404(db: Session, identity_id: int, conv_uuid: str) -> AssistantConversation:
    try:
        parsed = uuidlib.UUID(str(conv_uuid))
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    conv = db.scalar(
        select(AssistantConversation).where(
            AssistantConversation.uuid == parsed,
            AssistantConversation.identity_id == identity_id,
        )
    )
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return conv


@router.get("")
async def list_conversations(
    sess: AppSession = Depends(get_n_session(read_only=True)),
) -> dict:
    db: Session = sess.db_session
    rows = db.scalars(
        select(AssistantConversation)
        .where(AssistantConversation.identity_id == sess.identity_id)
        .order_by(AssistantConversation.updated_at.desc())
    ).all()
    return {"content": [c.summary_dict() for c in rows]}


@router.get("/{conv_uuid}")
async def get_conversation(
    conv_uuid: str,
    sess: AppSession = Depends(get_n_session(read_only=True)),
) -> dict:
    db: Session = sess.db_session
    conv = _owned_or_404(db, sess.identity_id, conv_uuid)
    return {"content": conv.full_dict()}


@router.patch("/{conv_uuid}")
async def rename_conversation(
    conv_uuid: str,
    request: Request,
    sess: AppSession = Depends(get_n_session()),
) -> dict:
    db: Session = sess.db_session
    conv = _owned_or_404(db, sess.identity_id, conv_uuid)
    body = await request.json()
    title = (body.get("title") or "").strip()
    if title:
        conv.title = title[:200]
    db.flush()
    return {"content": conv.summary_dict()}


@router.delete("/{conv_uuid}")
async def delete_conversation(
    conv_uuid: str,
    sess: AppSession = Depends(get_n_session()),
) -> dict:
    db: Session = sess.db_session
    conv = _owned_or_404(db, sess.identity_id, conv_uuid)
    db.delete(conv)
    db.flush()
    return {"content": {"deleted": conv_uuid}}
