"""
Plugin de serie de jerarquias: arboles de nodos y code-lists reutilizables
(temas, fuentes, CRS, mapas base) que otros dominios referencian.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter
from sqlalchemy.orm import Session

from uniback.plugins.base import UnibackPlugin


class HierarchiesPlugin(UnibackPlugin):
    name = "uniback.hierarchies"
    description = "Jerarquias, nodos y code-lists"
    version = "1.0.0"

    node_types = {"core"}
    # Otros dominios pueden referenciar los code-lists: sembrar pronto.
    seed_priority = 10
    openapi_tags = [
        {"name": "Hierarchies", "description": "Hierarchy nodes and navigation"},
    ]

    def get_model_modules(self) -> List[str]:
        return ["uniback.contrib.hierarchies.models"]

    def get_routers(self) -> List[APIRouter]:
        from uniback.contrib.hierarchies.routers import router, router_hierarchy_nodes

        return [router, router_hierarchy_nodes]

    def on_seed(self, db: Session) -> None:
        from uniback.contrib.hierarchies.seed import seed_hierarchies

        seed_hierarchies(db)
