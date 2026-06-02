"""
Punto de entrada del plugin de plantas.

``PluginManager.discover_plugins`` importa este módulo (``plants.plugin``) y
detecta la subclase de ``UnibackPlugin``. A partir de ahí el plugin se engancha
al ciclo de vida del framework mediante los hooks que sobreescribe.
"""

from __future__ import annotations

import uuid as _uuid
from datetime import date
from typing import Any, List, Mapping

from fastapi import APIRouter
from sqlalchemy.orm import Session

from uniback.plugins.base import UnibackPlugin


class MapCoordinatesWidget:
    """Extensión inyectable (``FieldWidget``): añade pistas ``x-*`` al JSON
    Schema de las columnas de coordenadas para que el frontend sepa que forman
    parte de un mapa. Demuestra ``get_field_widgets`` sin tocar el núcleo.

    El registro solo copia claves que empiecen por ``x-`` a la propiedad.
    """

    name = "map-coordinates"

    def matches(self, column_name: str, column_schema: Mapping[str, Any], column_info: Mapping[str, Any]) -> bool:
        return column_name in ("latitude", "longitude")

    def enrich(self, column_name: str, column_schema: Mapping[str, Any], column_info: Mapping[str, Any]) -> Mapping[str, Any]:
        return {
            "x-map-field": column_name,                 # marca semántica para la app
            "x-formly-props": {"step": 0.000001},        # precisión fina en el input numérico
        }


# Plantas de ejemplo alrededor de Gran Canaria (lat, lng en WGS84).
_SAMPLE_PLANTS = [
    {
        "name": "Drago centenario",
        "species": "Dracaena draco",
        "latitude": 28.070800, "longitude": -15.469400,
        "planted_on": date(1998, 3, 12), "health": "healthy",
        "notes": "Ejemplar del Jardín Botánico Canario Viera y Clavijo.",
    },
    {
        "name": "Palmera canaria del campus",
        "species": "Phoenix canariensis",
        "latitude": 28.072700, "longitude": -15.453300,
        "planted_on": date(2005, 11, 2), "health": "healthy",
        "notes": "Campus de Tafira (ULPGC).",
    },
    {
        "name": "Tajinaste rojo",
        "species": "Echium wildpretii",
        "latitude": 28.110600, "longitude": -15.436100,
        "planted_on": date(2021, 5, 20), "health": "attention",
        "notes": "Necesita riego de apoyo en verano. Parque Doramas.",
    },
    {
        "name": "Cardón",
        "species": "Euphorbia canariensis",
        "latitude": 27.737600, "longitude": -15.586600,
        "planted_on": date(2019, 1, 8), "health": "healthy",
        "notes": "Zona de Maspalomas.",
    },
    {
        "name": "Pino canario joven",
        "species": "Pinus canariensis",
        "latitude": 28.107500, "longitude": -15.418900,
        "planted_on": date(2023, 2, 14), "health": "sick",
        "notes": "Detectada plaga; en seguimiento. Parque San Telmo.",
    },
]


class PlantsPlugin(UnibackPlugin):
    name = "PlantsApp"
    description = "App demo: catálogo de plantas geolocalizadas sobre un mapa"
    version = "1.0.0"

    # 1) Modelos: el initializer importa estos módulos antes de configurar los
    #    mappers, de modo que ``Plant`` quede registrado en el ORM base.
    def get_model_modules(self) -> List[str]:
        return ["plants.models"]

    # 2) API: CRUD REST completo + /schema.json + /bulk para la entidad ``plants``.
    #    Se importa el modelo aquí (no a nivel de módulo) porque get_routers se
    #    invoca tras configure_mappers, cuando el modelo ya está listo.
    def get_routers(self) -> List[APIRouter]:
        from uniback.api.crud_factory import make_simple_rest_crud
        from plants.models import Plant

        # /schema.json se genera a partir del create_schema. Por defecto incluye
        # toda la "fontanería" heredada de FunctionalObject (object_type_id,
        # owner_id, native_*, timestamps, flags, attributes), que en el formulario
        # dinámico aparecería como campos editables e incluso dispararía selects
        # contra /identities y /ub_object_types. La excluimos para que el form
        # muestre solo el dominio: name, species, latitude, longitude, planted_on,
        # health, notes. El backend sigue rellenando esos campos internos solo.
        FRAMEWORK_FIELDS = [
            "object_type_id", "owner_id", "native_id", "native_table",
            "entity_update_time", "ts_vector_update_time", "ts_vector",
            "is_deleted", "authr_reference", "attributes",
        ]

        return [
            make_simple_rest_crud(
                Plant,
                "plants",
                tags=["Plants"],
                soft_delete_by_default=False,
                exclude_from_create=list(FRAMEWORK_FIELDS),
                exclude_from_update=list(FRAMEWORK_FIELDS),
            )
        ]

    # 3) Pistas de UI inyectables para el mapa.
    def get_field_widgets(self) -> List[Any]:
        return [MapCoordinatesWidget()]

    # 4) Semilla: tipo de objeto (FK obligatoria del polimorfismo) + datos demo
    #    + entrada en el menú lateral. on_seed corre DENTRO del session_scope
    #    del initializer, justo antes de initialize_database_data.
    def on_seed(self, db: Session) -> None:
        from uniback.persistence.models.core import ObjectType
        from plants.models import Plant, data_object_type_id

        plant_type_id = data_object_type_id["plant"]

        # ObjectType: necesario para la FK ``object_type_id`` del polimorfismo.
        if not db.get(ObjectType, plant_type_id):
            db.add(ObjectType(id=plant_type_id, uuid=_uuid.uuid4(), name="plant"))
            db.flush()

        # Plantas de ejemplo (idempotente: solo si la tabla está vacía).
        if db.query(Plant).count() == 0:
            for sample in _SAMPLE_PLANTS:
                db.add(Plant(**sample))
            db.flush()
            print(f"[PlantsApp] Sembradas {len(_SAMPLE_PLANTS)} plantas de ejemplo.")

        # Entrada en el sidebar. El menú lateral lo sirve el backend desde la
        # tabla ``ub_gui_menus`` (endpoint /gui/navigation); el YAML del front es
        # solo un fallback. Por eso registramos aquí el menú padre + hijo.
        self._seed_menu(db)

    def _seed_menu(self, db: Session) -> None:
        """Registra el menú lateral de la demo (idempotente, por nombre).

        El frontend toma la ruta de ``definition.route``:
          * ``Plants Map``   → ``/plantsMap`` (página Angular dedicada).
          * ``Plants Table`` → ``/d/plants_editable_table`` (pantalla SINTÉTICA de
            tabla editable / alta masiva: la genera el backend desde el schema y el
            DynamicPage la pinta con BulkEditGridComponent contra /plants/bulk).

        Solo sembramos en el nodo ``core``/``monolith``: es el único que sirve el
        endpoint ``/gui/navigation``, y así evitamos que los 5 nodos del despliegue
        creen el menú en paralelo (la comprobación por nombre no detecta inserts no
        confirmados de otros nodos por aislamiento transaccional).
        """
        import os
        from uniback.persistence.models.screens import Menu

        if os.getenv("UNIBACK_NODE_TYPE", "monolith") not in ("core", "monolith"):
            return

        # Padre: get-or-create por nombre.
        parent = db.query(Menu).filter(Menu.name == "Plants Demo").first()
        if parent is None:
            parent = Menu(
                name="Plants Demo",
                icon="environment",
                order=60,  # tras "System" (50)
                definition={"code": "Plantas (demo)"},
            )
            db.add(parent)
            db.flush()  # necesitamos parent.id para los hijos

        # Pestañas (hijos): get-or-create por nombre, así añadir una nueva pestaña
        # es idempotente aunque el padre ya existiera de un arranque anterior.
        children = [
            ("Plants Map", 1, {"code": "Plantas en el mapa", "route": "/plantsMap"}),
            ("Plants Table", 2, {"code": "Plantas (alta masiva)", "route": "/d/plants_editable_table"}),
        ]
        for name, order, definition in children:
            if db.query(Menu).filter(Menu.name == name).count():
                continue
            db.add(Menu(name=name, parent_menu_id=parent.id, order=order, definition=definition))
        db.flush()
        print("[PlantsApp] Menú 'Plantas (demo)' (mapa + alta masiva) registrado en el sidebar.")

    def on_app_ready(self, app: Any) -> None:
        print("[PlantsApp] Plugin de plantas montado. Entidad 'plants' disponible en /api/plants/.")
