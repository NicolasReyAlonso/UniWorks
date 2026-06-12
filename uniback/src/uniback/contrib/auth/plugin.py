"""
Plugin de serie del dominio de autenticacion/autorizacion: login (/authn),
api keys, CRUD de identidades/roles/grupos/organizaciones, identity store y
gestion de ACLs.

Caso especial simetrico a collections: NO aporta modelos ni semilla. Los
modelos (sysadmin.py) y la semilla de identidades/permisos/system functions
son del KERNEL, porque cualquier nodo necesita autenticar y autorizar
peticiones (get_n_session). Aqui vive solo la API publica del dominio.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter

from uniback.plugins.base import UnibackPlugin


class AuthPlugin(UnibackPlugin):
    name = "uniback.auth"
    description = "API de autenticacion, identidades y ACLs"
    version = "1.0.0"

    node_types = {"auth"}
    openapi_tags = [
        {"name": "Authentication", "description": "Authentication, session management and access explanation"},
        {"name": "Identities, Roles, Organizations and Groups", "description": "Management of identities, roles, organizations and groups"},
        {"name": "Identity Stores", "description": "Convenience for GUI to have a per-user (key, value) storage"},
        {"name": "ACLs", "description": "Access Control Lists and Expressions"},
    ]

    def get_routers(self) -> List[APIRouter]:
        from uniback.contrib.auth.acl import router as acl_router
        from uniback.contrib.auth.identities import (
            router_acl_expressions,
            router_groups,
            router_identities,
            router_identities_authenticators,
            router_identities_roles,
            router_organizations,
            router_roles,
        )
        from uniback.contrib.auth.identity_store import router as identity_store_router
        from uniback.contrib.auth.routers import router as auth_router

        return [
            auth_router,
            router_identities, router_identities_authenticators,
            router_roles, router_identities_roles,
            router_groups, router_organizations,
            identity_store_router,
            acl_router, router_acl_expressions,
        ]
