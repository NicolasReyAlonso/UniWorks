"""
Catálogo de pantallas a las que el asistente puede llevar al usuario.

El modelo no conoce las rutas del front y, si se le deja, las inventa
(``/d/plants_map`` en vez de ``/plantsMap``). La fuente de verdad es la misma
que usa el frontend:

  * el menú lateral (``ub_gui_menus`` vía ``visible_menus``), que trae la ruta
    de cada página, incluidas las Angular dedicadas como ``/plantsMap``;
  * las pantallas dinámicas ``/d/<screen>`` que el backend sabe resolver
    (``resolve_screen``: pantalla en BD o sintética desde el schema), p.ej. la
    alta masiva ``/d/<entidad>_editable_table`` aunque no esté en el menú.

``navigate_to`` usa el catálogo para el system prompt y para validar la ruta
antes de emitirla al navegador.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

from sqlalchemy.orm import Session

_I18N_KEY = re.compile(r"^[A-Z0-9_]+(\.[A-Z0-9_]+)+$")
_DYNAMIC_ROUTE = re.compile(r"^/d/([^/]+)(/[^/]+)?$")

# Orden importante: ``_editable_table`` también termina en ``_table``.
_KIND_BY_SUFFIX = (
    ("_editable_table", "alta masiva / edición en tabla"),
    ("_table", "alta masiva / edición en tabla"),
    ("_browser", "listado"),
    ("_form", "formulario"),
)


@dataclass(frozen=True)
class NavigablePage:
    route: str
    label: str
    section: Optional[str]
    kind: str


def _humanize(code: Optional[str]) -> Optional[str]:
    """``SIDEBAR.DATA.COLLECTIONS`` -> ``Collections``; los textos ya legibles
    (``Plantas en el mapa``) se devuelven tal cual."""
    if not code:
        return None
    if not _I18N_KEY.match(code):
        return code
    parts = code.split(".")
    last = parts[-2] if parts[-1] == "TITLE" and len(parts) > 1 else parts[-1]
    return last.replace("_", " ").capitalize()


def _kind_of(route: str) -> str:
    if route.startswith("/d/"):
        for suffix, kind in _KIND_BY_SUFFIX:
            if route.endswith(suffix):
                return kind
    return "página"


def navigable_pages(db: Session) -> List[NavigablePage]:
    """Páginas del menú lateral visibles ahora mismo, en el orden del sidebar."""
    from uniback.api.routers.gui import visible_menus

    menus = visible_menus(db)
    by_id = {m.id: m for m in menus}

    def sort_key(m):
        parent = by_id.get(m.parent_menu_id)
        return ((parent.order if parent else m.order) or 0, parent is not None, m.order or 0)

    pages: List[NavigablePage] = []
    seen: set[str] = set()
    for menu in sorted(menus, key=sort_key):
        definition = menu.definition or {}
        route = definition.get("route") or (f"/d/{menu.screen.name}" if menu.screen else None)
        if not route or route in seen:
            continue
        seen.add(route)
        parent = by_id.get(menu.parent_menu_id)
        pages.append(NavigablePage(
            route=route,
            label=_humanize(definition.get("code")) or menu.name or route,
            section=_humanize((parent.definition or {}).get("code")) if parent else None,
            kind=_kind_of(route),
        ))
    return pages


def resolve_route(db: Session, route: str, pages: List[NavigablePage]) -> Optional[str]:
    """Ruta canónica a la que navegar, o ``None`` si no existe en el front.

    Tolera los despistes típicos de un modelo pequeño: sin barra inicial,
    mayúsculas distintas (``/plantsmap``) o el nombre de pantalla sin ``/d/``.
    """
    from uniback.api.routers.gui import resolve_screen

    path, _, query = (route or "").strip().partition("?")
    path = "/" + path.strip().strip("/")
    if path == "/":
        return None

    by_lower = {p.route.lower(): p.route for p in pages}
    candidates = [path]
    if not path.startswith("/d/") and path.count("/") == 1:
        candidates.append("/d" + path)

    for candidate in candidates:
        canonical = by_lower.get(candidate.lower())
        if canonical is None:
            match = _DYNAMIC_ROUTE.match(candidate)
            if match:
                screen = match.group(1)
                for name in dict.fromkeys((screen, screen.lower())):
                    if resolve_screen(name, db):
                        canonical = f"/d/{name}{match.group(2) or ''}"
                        break
        if canonical:
            return canonical + (f"?{query}" if query else "")
    return None


def format_catalog(pages: List[NavigablePage]) -> str:
    lines = ["Pantallas navegables (usa EXACTAMENTE una de estas rutas con 'navigate_to'):"]
    for page in pages:
        title = f"{page.section} › {page.label}" if page.section else page.label
        lines.append(f"- {title} [{page.kind}]: {page.route}")
    lines.append(
        "Además, toda pantalla '/d/<x>_browser' tiene su alta masiva en "
        "'/d/<x>_editable_table' y su formulario en '/d/<x>_form'."
    )
    return "\n".join(lines)
