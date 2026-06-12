"""
Plugin de serie del CRUD de GUI: pantallas, menus, app flavors, vistas,
dashboards y etiquetas i18n, mas la semilla bootstrap de pantallas/menus.

OJO: el SERVICIO de GUI (agregacion de /gui/navigation y pantallas
sinteticas) es del kernel (api/routers/gui.py), igual que los modelos
Screen/Menu/AppFlavor (los usa ese servicio y plugins externos como
seedbeds). Aqui solo vive el CRUD de administracion y el bootstrap.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter
from sqlalchemy.orm import Session

from uniback.plugins.base import UnibackPlugin


class GuiCrudPlugin(UnibackPlugin):
    name = "uniback.gui_crud"
    description = "CRUD de pantallas, menus, vistas, dashboards e i18n"
    version = "1.0.0"

    node_types = {"core"}
    # Los menus bootstrap referencian pantallas de todos los dominios:
    # sembrar al final.
    seed_priority = 90
    # "Screens, Menus and App Flavors" lo declara ya el kernel (gui.py).
    openapi_tags = [
        {"name": "Views", "description": "User views"},
        {"name": "Dashboards", "description": "User dashboards"},
        {"name": "Internationalization", "description": "Labels and translations"},
    ]

    def get_model_modules(self) -> List[str]:
        return ["uniback.contrib.gui_crud.models"]

    def get_routers(self) -> List[APIRouter]:
        from uniback.contrib.gui_crud.routers import (
            router_app_flavors,
            router_dashboards,
            router_entity_labels,
            router_menus,
            router_screens,
            router_viewz,
        )

        return [
            router_viewz, router_dashboards, router_screens,
            router_app_flavors, router_menus, router_entity_labels,
        ]

    def on_seed(self, db: Session) -> None:
        from uniback.contrib.gui_crud.seed import seed_gui

        seed_gui(db)
