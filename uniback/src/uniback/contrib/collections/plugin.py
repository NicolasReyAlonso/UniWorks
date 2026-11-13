"""
Plugin de serie de colecciones y casos de estudio.

Caso especial: NO aporta modelos propios (Collection/CaseStudy/Dataset viven
en el kernel porque comparten fichero y mapa polimorfico con
FunctionalObject). Demuestra que el contrato de plugin no exige modelos:
solo routers, servicio CRUDIE y semilla de ACLs de referencia.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter
from sqlalchemy.orm import Session

from uniback.api.crudie import register_crudie_entity
from uniback.plugins.base import UnibackPlugin


def _register_crudie_entities() -> None:
    def _collection_orm():
        from uniback.persistence.models.core import Collection
        return Collection

    def _collection_service():
        from uniback.contrib.collections.service import Service
        return Service

    register_crudie_entity("collection", _collection_orm, _collection_service)


class CollectionsPlugin(UnibackPlugin):
    name = "uniback.collections"
    description = "Colecciones y casos de estudio"
    version = "1.0.0"

    node_types = {"core"}
    seed_priority = 50
    openapi_tags = [
        {"name": "Collections", "description": "Collections and objects in them"},
        {"name": "Case Studies", "description": "Case studies and objects associated with them"},
    ]

    def __init__(self) -> None:
        _register_crudie_entities()

    def get_routers(self) -> List[APIRouter]:
        from uniback.contrib.collections.routers import (
            router,
            router_case_studies,
            router_case_study_items,
            router_collection_items,
        )

        return [router, router_collection_items, router_case_studies, router_case_study_items]

    def get_global_scopes(self):
        from uniback.plugins.contracts import GlobalScope

        # Los casos de estudio agrupan objetos por tabla de pertenencia (N:M),
        # no por clave foránea: se declara la clave de filtro que el listado de
        # functional_objects ya interpreta. ``state_key`` mantiene vivas las
        # pantallas anteriores al contrato de ámbitos, que leen ``gbl_cs``.
        return [
            GlobalScope(
                name="case_study",
                entity="case_studies",
                label="MISC.BREADCRUMB.CASE_STUDIES",
                membership={"functional_objects": "case_study_id"},
                state_key="gbl_cs",
                order=50,
            )
        ]

    def on_seed(self, db: Session) -> None:
        from uniback.persistence.models.core import CaseStudy, Dataset
        from uniback.persistence.seeding import create_or_update_acl_reference_object

        refs = [
            (CaseStudy, "c2880b3b-65f1-44b1-940b-a3769eb16499", [("role", "sys-admin", "read")]),
            (Dataset, "95c9e713-092b-4068-af3a-d9ae2059c5d2", [("role", "sys-admin", "read")]),
        ]
        for model, uid, perms in refs:
            create_or_update_acl_reference_object(db, model, uid, perms)
