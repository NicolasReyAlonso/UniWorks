"""
Modelo de persistencia del asistente.

``AssistantConversation`` guarda el historial de chat de un usuario para poder
listar conversaciones pasadas y reanudarlas. Como el endpoint ``/assistant/chat``
es sin estado (el frontend envía el historial completo en cada turno), reanudar
una conversación se reduce a recargar sus ``messages`` y seguir enviándolos.

La conversación es PRIVADA de su dueño: se referencia por ``identity_id`` y los
endpoints filtran siempre por la identidad de la sesión, sin exponer las de
otros usuarios.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from uniback.persistence.base import GUID, JSONB, ORMBase, get_table_prefix


def _tn(name: str) -> str:
    """Aplica el prefijo global de tablas (``ub_``)."""
    return f"{get_table_prefix()}{name}"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AssistantConversation(ORMBase):
    """Una conversación de chat persistida, propiedad de una identidad.

    ``messages`` es la lista de turnos visibles para el usuario en el formato
    neutro que entiende el backend: ``[{"role": "user"|"assistant", "content": str}]``.
    No se guardan las trazas internas de herramientas: se re-ejecutan en cada
    turno, así que no hacen falta para reanudar.
    """

    __tablename__ = _tn("assistant_conversations")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4, index=True)

    # Dueño de la conversación. Index para listar rápido las del usuario.
    identity_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(_tn("sa_auth_identities.id"), ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Título legible (se deriva del primer mensaje del usuario).
    title: Mapped[str | None] = mapped_column(String(200))

    # Nombre del proveedor/modelo usado en el último turno (informativo).
    model: Mapped[str | None] = mapped_column(String(120))

    # Historial de turnos visibles: [{"role", "content"}].
    messages: Mapped[list] = mapped_column(JSONB, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    def summary_dict(self) -> dict:
        """Vista ligera para el listado (sin los mensajes)."""
        return {
            "uuid": str(self.uuid),
            "title": self.title or "",
            "model": self.model,
            "message_count": len(self.messages or []),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def full_dict(self) -> dict:
        """Vista completa para reanudar (incluye los mensajes)."""
        data = self.summary_dict()
        data["messages"] = self.messages or []
        return data
