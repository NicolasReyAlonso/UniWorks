"""
Plugin de serie del dominio de especies (Darwin Core).

Modelo independiente (DwcTaxon no hereda de FunctionalObject) y un router
basico. Es el plugin contrib mas simple: sirve de plantilla del patron
kernel + contrib.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter

from uniback.plugins.base import UnibackPlugin


class SpeciesPlugin(UnibackPlugin):
    name = "uniback.species"
    description = "Catalogo de especies Darwin Core"
    version = "1.0.0"

    node_types = {"species"}
    openapi_tags = [
        {"name": "Species", "description": "Darwin Core species catalog"},
    ]

    def get_model_modules(self) -> List[str]:
        return ["uniback.contrib.species.models"]

    def get_routers(self) -> List[APIRouter]:
        from uniback.contrib.species.routers import router

        return [router]
