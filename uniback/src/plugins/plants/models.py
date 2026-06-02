"""
Modelo de dominio del plugin de plantas.

``Plant`` hereda de ``FunctionalObject``, así que reaprovecha de forma gratuita:
  * ``id`` / ``uuid`` / ``name`` / ``attributes``
  * propiedad (``owner_id``) automática y ``creation_time``
  * borrado lógico (``is_deleted``) y full-text search (``ts_vector``)
  * polimorfismo por ``object_type_id``

El campo heredado ``name`` se usa como **nombre común** de la planta.
"""

from __future__ import annotations

import enum
from datetime import date

from sqlalchemy import BigInteger, Date, Float, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from uniback.persistence.base import get_table_prefix
from uniback.persistence.models.core import (
    FunctionalObject,
    class_to_object_type_id,
    data_object_type_id,
)

# ---------------------------------------------------------------------------
# Reservamos un object_type_id único para las plantas. El núcleo usa hasta el
# rango ~1000; elegimos 200 para no colisionar con los tipos del framework.
# El plugin siembra la fila ``ObjectType`` correspondiente en ``on_seed``.
# ---------------------------------------------------------------------------
data_object_type_id["plant"] = 200


class PlantHealth(str, enum.Enum):
    """Estado de salud de la planta. Se renderiza como ``select`` en el front
    porque el JSON Schema emite el ``enum`` con estas opciones."""
    healthy = "healthy"
    attention = "attention"
    sick = "sick"
    dead = "dead"


def _tn(name: str) -> str:
    """Aplica el prefijo de tablas global (``ub_``) al nombre de la tabla."""
    return f"{get_table_prefix()}plants_{name}"


class Plant(FunctionalObject):
    """Una planta colocada sobre el mapa.

    ``name`` (heredado) = nombre común; ``species`` = nombre científico.
    ``latitude``/``longitude`` son las coordenadas donde se marca en el mapa.
    """

    # Desactivamos el versionado nativo de Continuum para esta tabla:
    # - El trigger generado referenciaría ``ub_functional_objects_version``, tabla
    #   que puede no existir si la BD fue creada con una versión anterior de
    #   Continuum (comportamiento habitual en entornos de desarrollo).
    # - Para una demo no necesitamos histórico de auditoría en las plantas.
    __versioned__ = {"versioning": False}

    __tablename__ = _tn("plants")
    __mapper_args__ = {
        "polymorphic_identity": data_object_type_id["plant"],
    }

    id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{get_table_prefix()}functional_objects.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Nombre científico (Dracaena draco, Phoenix canariensis, ...).
    species: Mapped[str | None] = mapped_column(String(200))

    # Coordenadas geográficas (WGS84). El frontend las pinta en el mapa.
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    # Fecha de plantación → el schema la marca como ``date`` y el front la
    # renderiza con un datepicker.
    planted_on: Mapped[date | None] = mapped_column(Date)

    # Estado de salud. SAEnum ⇒ ``select`` con opciones en el front.
    # native_enum=False → almacena como VARCHAR; evita el CREATE TYPE de
    # PostgreSQL y la condición de carrera cuando varios contenedores arrancan
    # en paralelo e intentan crear el mismo tipo al mismo tiempo.
    health: Mapped[PlantHealth | None] = mapped_column(
        SAEnum(PlantHealth, name="plant_health", native_enum=False),
        default=PlantHealth.healthy,
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
    Plant: data_object_type_id["plant"],
})
