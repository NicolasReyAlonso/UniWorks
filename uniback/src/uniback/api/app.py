from __future__ import annotations

from fastapi import FastAPI

from uniback.api.middleware import add_middlewares
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

    # Tags del kernel; los de dominio los aportan los plugins activos.
    tags_metadata = [
        {"name": "System", "description": "General system endpoints"},
        {"name": "System Functions", "description": "System-wide executable functions"},
        {"name": "Functional Objects", "description": "Core functional objects"},
        {"name": "Browser Filters", "description": "System browser filters"},
        {"name": "Screens, Menus and App Flavors", "description": "Screen definitions, Menus and App variants for UI"},
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

    # Routers del kernel. Los de dominio los montan los plugins activos.
    prefix = "/api"
    from uniback.api.routers import (
        discovery_router,
        generic_import_router,
        gui_router,
        health_router,
        router_functional_objects,
        router_system_functions,
        sys_router,
    )

    # Servicios de sistema presentes en TODOS los nodos.
    app.include_router(health_router, prefix=prefix)
    app.include_router(gui_router, prefix=prefix)

    # Servicios de sistema que sirve el nodo core (agregacion/descubrimiento).
    if node_type in ["monolith", "core"]:
        app.include_router(sys_router, prefix=prefix)
        app.include_router(discovery_router, prefix=prefix)
        app.include_router(generic_import_router, prefix=prefix)
        app.include_router(router_functional_objects, prefix=prefix)
        app.include_router(router_system_functions, prefix=prefix)

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
