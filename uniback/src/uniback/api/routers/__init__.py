"""API routers exposed by Uniback."""

from uniback.api.routers.gui import router as gui_router
from uniback.api.routers.health import router as health_router
from uniback.api.routers.auth import router as auth_router
from uniback.api.routers.sys import router as sys_router
from uniback.api.routers.discovery import router as discovery_router
from uniback.api.routers.generic_import import router as generic_import_router
from uniback.api.routers.acl import router as acl_router
from uniback.api.routers.identity_store import router as identity_store_router
from uniback.api.routers.collections import router as collections_router
from uniback.api.routers.gui import router as gui_router
from uniback.api.routers.simple_routers import (
    router_collection_items, router_functional_objects,
    router_identities, router_identities_authenticators, router_roles,
    router_identities_roles, router_groups, router_organizations,
    router_system_functions, router_acl_expressions,
    router_viewz, router_dashboards, router_case_study_items, router_case_studies,
    router_screens, router_app_flavors, router_menus, router_entity_labels
)

__all__ = [
    "gui_router", "health_router", "auth_router", "sys_router", "discovery_router",
    "acl_router", "identity_store_router", "collections_router",
    "generic_import_router",
    "router_collection_items", "router_functional_objects",
    "router_identities", "router_identities_authenticators", "router_roles",
    "router_identities_roles", "router_groups", "router_organizations",
    "router_system_functions", "router_acl_expressions",
    "router_viewz", "router_dashboards", "router_case_study_items", "router_case_studies",
    "router_screens", "router_app_flavors", "router_menus", "router_entity_labels"
]
