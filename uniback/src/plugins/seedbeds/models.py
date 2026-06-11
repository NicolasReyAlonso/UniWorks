"""
Modelo de dominio del plugin de semillero.

``SeedBatch`` (lote de semillero) hereda de ``FunctionalObject``, así que
reaprovecha de forma gratuita:
  * ``id`` / ``uuid`` / ``name`` / ``attributes``
  * propiedad (``owner_id``) automática y ``creation_time``
  * borrado lógico (``is_deleted``) y full-text search (``ts_vector``)
  * polimorfismo por ``object_type_id``

El campo heredado ``name`` se usa como **código del lote** (p. ej. "TOM-2026-A").
"""

from __future__ import annotations

import enum
from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from uniback.persistence.base import get_table_prefix
from uniback.persistence.models.core import (
    FunctionalObject,
    class_to_object_type_id,
    data_object_type_id,
)

# ---------------------------------------------------------------------------
# Reservamos un object_type_id único para los lotes de semillero. El núcleo usa
# ids bajos (<200) y el plugin de plantas usa el 200; elegimos 210 para no
# colisionar. El plugin siembra la fila ``ObjectType`` correspondiente en
# ``on_seed``.
# ---------------------------------------------------------------------------
data_object_type_id["seed_batch"] = 210


class SeedBatchStatus(str, enum.Enum):
    """Estado del lote dentro del semillero. Se renderiza como ``select`` en el
    front porque el JSON Schema emite el ``enum`` con estas opciones."""
    sembrado = "sembrado"
    germinando = "germinando"
    listo_para_trasplante = "listo_para_trasplante"
    trasplantado = "trasplantado"
    descartado = "descartado"


class Substrate(str, enum.Enum):
    """Sustrato empleado en la bandeja."""
    turba = "turba"
    fibra_de_coco = "fibra_de_coco"
    perlita = "perlita"
    vermiculita = "vermiculita"
    mezcla = "mezcla"


def _tn(name: str) -> str:
    """Aplica el prefijo de tablas global (``ub_``) al nombre de la tabla."""
    return f"{get_table_prefix()}seedbeds_{name}"


class SeedBatch(FunctionalObject):
    """Un lote de siembra dentro del semillero.

    ``name`` (heredado) = código del lote; ``species`` = especie sembrada.
    Las fechas y los contadores permiten seguir la germinación del lote.
    """

    # Desactivamos el versionado nativo de Continuum para esta tabla:
    # - El trigger generado referenciaría ``ub_functional_objects_version``,
    #   tabla que puede no existir si la BD fue creada con una versión anterior
    #   de Continuum (comportamiento habitual en entornos de desarrollo).
    # - Para una demo no necesitamos histórico de auditoría en los lotes.
    __versioned__ = {"versioning": False}

    __tablename__ = _tn("seed_batches")
    __mapper_args__ = {
        "polymorphic_identity": data_object_type_id["seed_batch"],
    }

    id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{get_table_prefix()}functional_objects.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Especie sembrada (nombre común o científico).
    species: Mapped[str | None] = mapped_column(String(200))

    # Código de la bandeja física donde está el lote (p. ej. "B-03").
    tray_code: Mapped[str | None] = mapped_column(String(50))

    # Contadores de seguimiento de la germinación.
    sown_count: Mapped[int | None] = mapped_column(Integer)
    germinated_count: Mapped[int | None] = mapped_column(Integer)

    # Fecha de siembra → el schema la marca como ``date`` y el front la
    # renderiza con un datepicker.
    sowing_date: Mapped[date | None] = mapped_column(Date)

    # Sustrato y estado. SAEnum ⇒ ``select`` con opciones en el front.
    # native_enum=False → almacena como VARCHAR; evita el CREATE TYPE de
    # PostgreSQL y la condición de carrera cuando varios contenedores arrancan
    # en paralelo e intentan crear el mismo tipo al mismo tiempo.
    substrate: Mapped[Substrate | None] = mapped_column(
        SAEnum(Substrate, name="seedbed_substrate", native_enum=False),
        default=Substrate.turba,
    )
    status: Mapped[SeedBatchStatus | None] = mapped_column(
        SAEnum(SeedBatchStatus, name="seed_batch_status", native_enum=False),
        default=SeedBatchStatus.sembrado,
    )

    # Notas libres. ``info["ui"]`` aplana hints ``x-*`` al schema: aquí forzamos
    # un textarea de 4 filas para demostrar el override manual por columna.
    notes: Mapped[str | None] = mapped_column(
        String(2000),
        info={"ui": {"ui-widget": "textarea", "formly-props": {"rows": 4}}},
    )


# Registramos el mapeo clase → object_type_id (lo usa el núcleo para ACL,
# polimorfismo y serialización).
class_to_object_type_id.update({
    SeedBatch: data_object_type_id["seed_batch"],
})
