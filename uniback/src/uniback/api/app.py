from __future__ import annotations

from fastapi import FastAPI

from uniback.api.middleware import add_middlewares
from uniback.api.routers import health_router, files_router, auth_router, router_file_stores, gui_router
from uniback.config.settings import APISettings
from uniback.persistence.session import SessionManager


def create_app(
    api_settings: APISettings | None = None,
    session_manager: SessionManager | None = None,
    node_type: str | None = None,
) -> FastAPI:
    """Create and configure the FastAPI application."""

    settings = api_settings or APISettings()

    import os
    if node_type is None:
        node_type = os.getenv("UNIBACK_NODE_TYPE", "monolith")

    from uniback.plugins import plugin_manager

    tags_metadata = [
        {"name": "Authentication", "description": "Authentication, session management and access explanation"},
        {"name": "Identities, Roles, Organizations and Groups", "description": "Management of identities, roles, organizations and groups"},
        {"name": "Identity Stores", "description": "Convenience for GUI to have a per-user (key, value) storage"},
        {"name": "System Functions", "description": "System-wide executable functions"},
        {"name": "ACLs", "description": "Access Control Lists and Expressions"},
        {"name": "Files and File stores", "description": "File system and storage backend configurations"},
        {"name": "Annotations", "description": "Annotation templates and instances"},
        {"name": "Browser Filters", "description": "System browser filters"},
        {"name": "Functional Objects", "description": "Core functional objects"},
        {"name": "System", "description": "General system endpoints"},
        {"name": "Collections", "description": "Collections and objects in them"},
        {"name": "Case Studies", "description": "Case studies and objects associated with them"},
        {"name": "Hierarchies", "description": "Hierarchy nodes and navigation"},
        {"name": "Views", "description": "User views"},
        {"name": "Dashboards", "description": "User dashboards"},
        {"name": "Screens, Menus and App Flavors", "description": "Screen definitions, Menus and App variants for UI"},
        {"name": "Internationalization", "description": "Labels and translations"},
    ]
    tags_metadata = tags_metadata + plugin_manager.get_openapi_tags_for_node(node_type)

    app = FastAPI(
        title=settings.title,
        version=settings.version,
        description=settings.description,
        debug=settings.debug,
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        openapi_tags=tags_metadata,
    )

    # Store session manager for consumers that may need it
    if session_manager:
        app.state.session_manager = session_manager

    add_middlewares(app, settings)

    # Routers
    prefix = "/api"
    from uniback.api.routers import gui_router
    from uniback.api.routers import (
        annotations_router, sys_router, discovery_router, generic_import_router,
        acl_router, identity_store_router, hierarchies_router, collections_router,
        router_collection_items,
        router_functional_objects, router_identities, router_identities_authenticators,
        router_roles, router_identities_roles, router_groups, router_organizations,
        router_system_functions, router_acl_expressions, router_hierarchy_nodes,
        router_viewz, router_dashboards, router_case_study_items, router_case_studies,
        router_screens, router_app_flavors, router_menus, router_entity_labels
    )
    
    app.include_router(health_router, prefix=prefix)
    app.include_router(gui_router, prefix=prefix)

    if node_type in ["monolith", "auth"]:
        app.include_router(auth_router, prefix=prefix)
        app.include_router(router_identities, prefix=prefix)
        app.include_router(router_identities_authenticators, prefix=prefix)
        app.include_router(router_roles, prefix=prefix)
        app.include_router(router_identities_roles, prefix=prefix)
        app.include_router(router_groups, prefix=prefix)
        app.include_router(router_organizations, prefix=prefix)
        app.include_router(identity_store_router, prefix=prefix)
        app.include_router(acl_router, prefix=prefix)
        app.include_router(router_acl_expressions, prefix=prefix)
        
    if node_type in ["monolith", "core"]:
        app.include_router(sys_router, prefix=prefix)
        app.include_router(discovery_router, prefix=prefix)
        app.include_router(generic_import_router, prefix=prefix)
        app.include_router(hierarchies_router, prefix=prefix)
        app.include_router(collections_router, prefix=prefix)
        app.include_router(router_collection_items, prefix=prefix)
        app.include_router(router_functional_objects, prefix=prefix)
        app.include_router(router_system_functions, prefix=prefix)
        app.include_router(router_hierarchy_nodes, prefix=prefix)
        app.include_router(router_viewz, prefix=prefix)
        app.include_router(router_dashboards, prefix=prefix)
        app.include_router(router_case_study_items, prefix=prefix)
        app.include_router(router_case_studies, prefix=prefix)
        app.include_router(router_screens, prefix=prefix)
        app.include_router(router_app_flavors, prefix=prefix)
        app.include_router(router_menus, prefix=prefix)
        app.include_router(router_entity_labels, prefix=prefix)



    if node_type in ["monolith", "files"]:
        app.include_router(files_router, prefix=prefix)
        app.include_router(router_file_stores, prefix=prefix)

    if node_type in ["monolith", "annotations"]:
        app.include_router(annotations_router, prefix=prefix)

    for router in plugin_manager.get_routers_for_node(node_type):
        app.include_router(router, prefix=prefix)

    @app.get("/", tags=["System"])
    async def root() -> dict[str, str]:
        return {"status": "ok"}

    # Set up socket.io wrapper. The AsyncRedisManager attaches every node to a
    # shared Redis channel, so an emit from ANY node (e.g. a hot-plugged one)
    # reaches the browsers connected to this node (the core, per Traefik).
    try:
        import socketio
        from uniback.utils.realtime import redis_url, start_presence_watcher

        try:
            client_manager = socketio.AsyncRedisManager(redis_url())
        except Exception as e:
            print(f"[Socket.IO] Redis manager unavailable ({e}); running standalone.")
            client_manager = None
        sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*',
                                   client_manager=client_manager)
        socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

        # The core serves /gui/navigation: it watches node presence and emits
        # navigation_changed when a node appears or dies, so sidebars refresh
        # live without a page reload.
        if node_type in ("monolith", "core"):
            start_presence_watcher()

        @sio.event
        async def connect(sid, environ):
            print(f"[Socket.IO] Client connected: {sid}")

        @sio.event
        async def disconnect(sid):
            print(f"[Socket.IO] Client disconnected: {sid}")

        return socket_app
    except ImportError:
        print("python-socketio not installed, running without WebSocket support.")

    return app
