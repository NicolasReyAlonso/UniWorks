"""API routers del kernel de Uniback.

Los routers de dominio (auth, files, annotations, species, hierarchies,
collections, gui_crud...) viven en sus plugins de ``uniback.contrib``.
"""

from uniback.api.routers.gui import router as gui_router
from uniback.api.routers.health import router as health_router
from uniback.api.routers.sys import router as sys_router
from uniback.api.routers.discovery import router as discovery_router
from uniback.api.routers.generic_import import router as generic_import_router
from uniback.api.routers.simple_routers import (
    router_functional_objects,
    router_system_functions,
)

__all__ = [
    "gui_router", "health_router", "sys_router", "discovery_router",
    "generic_import_router",
    "router_functional_objects", "router_system_functions",
]
