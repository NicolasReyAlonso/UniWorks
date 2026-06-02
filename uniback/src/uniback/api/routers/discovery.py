import re
import httpx
from collections import defaultdict
from fastapi import APIRouter, Request, Response
from fastapi.routing import APIRoute
from pydantic import BaseModel
from typing import List, Dict, Any

from ..schema_registry import build_schema_bundle, compute_etag
from ..schemas.responses import Issue, ResponseEnvelope

router = APIRouter(tags=["Discovery"])

@router.get("/sys/discovery", response_model=ResponseEnvelope)
async def discover_services():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://traefik:8080/api/http/routers", timeout=5.0)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        return ResponseEnvelope(
            content=None,
            count=0,
            issues=[Issue.error(message=str(e), code="DISCOVERY_UPSTREAM_ERROR")],
        )
    
    services = {}
    path_regex = re.compile(r"PathPrefix\(`([^`]+)`\)")
    
    for router_obj in data:
        name = router_obj.get("name", "")
        # Only process external docker routers, ignore internal Traefik ones
        if "docker" in router_obj.get("provider", "") and not name.startswith("core@"):
            clean_name = name.split("@")[0].capitalize()
            rule = router_obj.get("rule", "")
            
            paths = path_regex.findall(rule)
            if paths:
                if clean_name not in services:
                    services[clean_name] = []
                services[clean_name].extend(paths)
                
    content = []
    for s_name, paths in services.items():
        content.append({
            "name": s_name,
            "routes": list(set(paths))
        })
        
    return ResponseEnvelope(content=content, count=len(content))


_PK_PARAM = re.compile(r"\{([^}/]+)\}/?$")


@router.get("/sys/entities", response_model=ResponseEnvelope)
async def list_entities(request: Request):
    """
    List CRUD-style entity resources exposed by this app, derived from the
    registered routes. An entity is detected when a base path supports the
    list/create pattern (GET/POST on /<path>/) or an item pattern (GET/PUT/DELETE on /<path>/{id}).
    """
    app = request.app
    routes_by_base: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "methods": set(),
        "has_schema": False,
        "pk": "id",
        "tags": set(),
    })

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        path = route.path
        methods = route.methods or set()

        if path.endswith("/schema.json"):
            base = path[: -len("/schema.json")].rstrip("/")
            routes_by_base[base]["has_schema"] = True
            for t in (route.tags or []):
                routes_by_base[base]["tags"].add(t)
            continue

        m = _PK_PARAM.search(path)
        if m:
            base = path[: m.start()].rstrip("/")
            pk = m.group(1)
            entry = routes_by_base[base]
            entry["pk"] = pk
            for method in methods:
                entry["methods"].add(("item", method))
            for t in (route.tags or []):
                entry["tags"].add(t)
        elif path.endswith("/"):
            base = path.rstrip("/")
            entry = routes_by_base[base]
            for method in methods:
                entry["methods"].add(("collection", method))
            for t in (route.tags or []):
                entry["tags"].add(t)

    content: List[Dict[str, Any]] = []
    for base, info in sorted(routes_by_base.items()):
        coll = {m for (kind, m) in info["methods"] if kind == "collection"}
        item = {m for (kind, m) in info["methods"] if kind == "item"}
        capabilities = {
            "list": "GET" in coll,
            "create": "POST" in coll,
            "get": "GET" in item,
            "update": "PUT" in item or "PATCH" in item,
            "delete": "DELETE" in item,
            "schema": info["has_schema"],
        }
        if not any(capabilities.values()):
            continue
        if not (capabilities["list"] or capabilities["get"] or capabilities["create"]):
            continue
        name = base.rstrip("/").rsplit("/", 1)[-1] or base
        content.append({
            "name": name,
            "path": base,
            "pk": info["pk"],
            "tags": sorted(info["tags"]),
            "capabilities": capabilities,
        })

    return ResponseEnvelope.ok(content=content, count=len(content))


@router.get("/sys/schemas", response_model=ResponseEnvelope)
async def list_schemas(request: Request, response: Response):
    """
    Bundle every registered entity's JSON Schema in a single document so it can
    be consumed for codegen and mirroring the API surface in other projects.
    Stable ``version`` field + ``ETag`` enable cheap caching.
    """
    base_url = str(request.base_url).rstrip("/")
    bundle = build_schema_bundle(base_url=base_url)

    # Hash the entire bundle (excluding `generated_at`) for the ETag.
    etag_payload = {k: v for k, v in bundle.items() if k != "generated_at"}
    etag = compute_etag(etag_payload)

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag})

    response.headers["ETag"] = etag
    return ResponseEnvelope.ok(content=bundle, count=len(bundle.get("entities", {})))
