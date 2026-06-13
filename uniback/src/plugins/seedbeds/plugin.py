"""
Punto de entrada del plugin de semillero (demo de hot-plug).

``PluginManager.discover_plugins`` importa este módulo (``seedbeds.plugin``) y
detecta la subclase de ``UnibackPlugin``. A diferencia del plugin de plantas,
aquí TODO el sembrado (tipo de objeto, datos de ejemplo y menú del sidebar) está
condicionado a ``UNIBACK_NODE_TYPE in ("seedbeds", "monolith")``:

  * Mientras el nodo ``seedbeds`` no exista, ningún otro nodo siembra nada, así
    que el sidebar del front no muestra la sección de semillero.
  * Al hacer ``docker compose up -d seedbeds_node``, el nodo arranca, crea su
    tabla, siembra los datos y registra el menú en la BD compartida. Con un
    simple refresco del navegador la sección aparece y las pantallas se generan
    solas a partir del JSON Schema (``/d/seed_batches_browser`` y
    ``/d/seed_batches_editable_table``). Traefik, además, enruta
    ``/api/seed_batches`` hacia el nodo nuevo en cuanto detecta el contenedor.

Eso es exactamente lo que se quiere enseñar en la defensa: añadir capacidad de
dominio al sistema sin tocar el núcleo, sin tocar el front y sin reiniciar nada.
"""

from __future__ import annotations

import uuid as _uuid
from datetime import date
from typing import Any, List, Mapping

from fastapi import APIRouter
from sqlalchemy.orm import Session

from uniback.plugins.base import UnibackPlugin


class SeedCountersWidget:
    """Extensión inyectable (``FieldWidget``): marca los contadores del lote
    como enteros no negativos de paso 1 para el formulario dinámico. Demuestra
    ``get_field_widgets`` sin tocar el núcleo.

    El registro solo copia claves que empiecen por ``x-`` a la propiedad.
    """

    name = "seed-counters"

    def matches(self, column_name: str, column_schema: Mapping[str, Any], column_info: Mapping[str, Any]) -> bool:
        return column_name in ("sown_count", "germinated_count")

    def enrich(self, column_name: str, column_schema: Mapping[str, Any], column_info: Mapping[str, Any]) -> Mapping[str, Any]:
        return {
            "x-formly-props": {"min": 0, "step": 1},
        }


# Lotes de ejemplo de un semillero hortícola.
_SAMPLE_BATCHES = [
    {
        "name": "TOM-2026-A",
        "species": "Tomate cherry (Solanum lycopersicum)",
        "tray_code": "B-01",
        "sown_count": 96, "germinated_count": 88,
        "sowing_date": date(2026, 4, 14), "substrate": "turba",
        "status": "listo_para_trasplante",
        "notes": "Germinación muy homogénea; trasplantar esta semana.",
    },
    {
        "name": "LEC-2026-B",
        "species": "Lechuga batavia (Lactuca sativa)",
        "tray_code": "B-02",
        "sown_count": 150, "germinated_count": 121,
        "sowing_date": date(2026, 5, 2), "substrate": "fibra_de_coco",
        "status": "germinando",
        "notes": "Riego por nebulización dos veces al día.",
    },
    {
        "name": "PIM-2026-A",
        "species": "Pimiento de Padrón (Capsicum annuum)",
        "tray_code": "B-03",
        "sown_count": 72, "germinated_count": 40,
        "sowing_date": date(2026, 4, 28), "substrate": "mezcla",
        "status": "germinando",
        "notes": "Germinación lenta, típico de la especie; mantener a 25 ºC.",
    },
    {
        "name": "ALB-2026-C",
        "species": "Albahaca genovesa (Ocimum basilicum)",
        "tray_code": "B-04",
        "sown_count": 200, "germinated_count": 187,
        "sowing_date": date(2026, 5, 20), "substrate": "perlita",
        "status": "sembrado",
        "notes": "Lote para el mercadillo de junio.",
    },
    {
        "name": "MIL-2026-A",
        "species": "Millo canario (Zea mays)",
        "tray_code": "B-05",
        "sown_count": 48, "germinated_count": 0,
        "sowing_date": date(2026, 6, 8), "substrate": "turba",
        "status": "sembrado",
        "notes": "Semilla local del banco de semillas de Gran Canaria.",
    },
    {
        "name": "CAL-2026-A",
        "species": "Calabacín (Cucurbita pepo)",
        "tray_code": "B-06",
        "sown_count": 36, "germinated_count": 4,
        "sowing_date": date(2026, 5, 30), "substrate": "vermiculita",
        "status": "descartado",
        "notes": "Hongos en bandeja por exceso de humedad; repetir siembra.",
    },
]


class SeedbedsPlugin(UnibackPlugin):
    name = "SeedbedsApp"
    description = "App demo hot-plug: gestión de lotes de semillero"
    version = "1.0.0"

    # Activo SOLO en su propio nodo (y en monolith). Sin esto, el router de
    # ``seed_batches`` se montaría en todos los nodos (incluido el core) y, al
    # parar el nodo seedbeds, Traefik haría caer ``/api/seed_batches`` en el
    # comodín del core, que lo seguiría sirviendo: la entidad quedaría accesible
    # por URL pese a estar "desenchufada". Restringiéndolo, solo lo sirve su
    # nodo; el core sigue registrando la entidad en el schema_registry (para el
    # catálogo/pantallas sintéticas) pero NO monta el endpoint -> 404 al caer.
    node_types = {"seedbeds"}

    # 1) Modelos: el initializer importa estos módulos antes de configurar los
    #    mappers, de modo que ``SeedBatch`` quede registrado en el ORM base.
    #    Esto SÍ corre en todos los nodos: el ORM necesita conocer todas las
    #    identidades polimórficas de ``functional_objects``.
    def get_model_modules(self) -> List[str]:
        return ["seedbeds.models"]

    # 2) API: CRUD REST completo + /schema.json + /bulk para ``seed_batches``.
    #    También corre en todos los nodos: el nodo core necesita la entidad en
    #    su schema_registry para servir las pantallas sintéticas de
    #    /gui/screens/by-name; Traefik se encarga de que el tráfico de
    #    /api/seed_batches llegue al nodo dedicado cuando está levantado.
    def get_routers(self) -> List[APIRouter]:
        from uniback.api.crud_factory import make_simple_rest_crud
        from seedbeds.models import SeedBatch

        # Excluimos la "fontanería" heredada de FunctionalObject para que el
        # formulario dinámico muestre solo el dominio: name, species, tray_code,
        # sown_count, germinated_count, sowing_date, substrate, status, notes.
        # El backend sigue rellenando esos campos internos solo.
        FRAMEWORK_FIELDS = [
            "object_type_id", "owner_id", "native_id", "native_table",
            "entity_update_time", "ts_vector_update_time", "ts_vector",
            "is_deleted", "authr_reference", "attributes",
        ]

        return [
            make_simple_rest_crud(
                SeedBatch,
                "seed_batches",
                tags=["Seedbeds"],
                soft_delete_by_default=False,
                exclude_from_create=list(FRAMEWORK_FIELDS),
                exclude_from_update=list(FRAMEWORK_FIELDS),
            )
        ]

    # 3) Pistas de UI inyectables para los contadores.
    def get_field_widgets(self) -> List[Any]:
        return [SeedCountersWidget()]

    # 4) Semilla: SOLO en el nodo ``seedbeds`` (o ``monolith``). Es la pieza
    #    central de la demo de hot-plug: hasta que no se lanza el nodo, ni los
    #    datos ni el menú existen; al lanzarlo, todo aparece en el front sin
    #    tocar nada más. on_seed corre DENTRO del session_scope del
    #    initializer, justo antes de initialize_database_data.
    def on_seed(self, db: Session) -> None:
        import os

        if os.getenv("UNIBACK_NODE_TYPE", "monolith") not in ("seedbeds", "monolith"):
            return

        from uniback.persistence.models.core import ObjectType
        from seedbeds.models import SeedBatch, data_object_type_id

        batch_type_id = data_object_type_id["seed_batch"]

        # ObjectType: necesario para la FK ``object_type_id`` del polimorfismo.
        if not db.get(ObjectType, batch_type_id):
            db.add(ObjectType(id=batch_type_id, uuid=_uuid.uuid4(), name="seed_batch"))
            db.flush()

        # Lotes de ejemplo (idempotente: solo si la tabla está vacía).
        if db.query(SeedBatch).count() == 0:
            for sample in _SAMPLE_BATCHES:
                db.add(SeedBatch(**sample))
            db.flush()
            print(f"[SeedbedsApp] Sembrados {len(_SAMPLE_BATCHES)} lotes de ejemplo.")

        # Entrada en el sidebar. El menú lateral lo sirve el backend desde la
        # tabla ``ub_gui_menus`` (endpoint /gui/navigation, atendido por el nodo
        # core), pero como la BD es compartida basta con que ESTE nodo escriba
        # las filas: al refrescar el navegador la sección ya está visible.
        self._seed_menu(db)

    def _seed_menu(self, db: Session) -> None:
        """Registra el menú lateral de la demo (idempotente, por nombre).

        El frontend toma la ruta de ``definition.route``; ambas pantallas son
        SINTÉTICAS: el backend las genera al vuelo desde el JSON Schema de la
        entidad y el DynamicPage del front las pinta sin código específico.
          * ``Seed Batches Browser`` → ``/d/seed_batches_browser`` (tabla con
            filtros + CRUD por formulario).
          * ``Seed Batches Table``   → ``/d/seed_batches_editable_table``
            (tabla editable / alta masiva contra /seed_batches/bulk).
        """
        from uniback.persistence.models.screens import Menu

        # Padre: get-or-create por nombre.
        parent = db.query(Menu).filter(Menu.name == "Seedbeds Demo").first()
        if parent is None:
            parent = Menu(
                name="Seedbeds Demo",
                icon="experiment",
                order=61,  # tras "Plants Demo" (60)
                # requires_node: /gui/navigation oculta esta sección cuando el
                # nodo seedbeds no tiene heartbeat vivo en Redis → al parar el
                # contenedor, el menú desaparece del sidebar en caliente.
                definition={"code": "Semillero (demo)", "requires_node": "seedbeds"},
            )
            db.add(parent)
            db.flush()  # necesitamos parent.id para los hijos

        # Pestañas (hijos): get-or-create por nombre, así añadir una nueva
        # pestaña es idempotente aunque el padre ya existiera de un arranque
        # anterior.
        children = [
            ("Seed Batches Browser", 1, {"code": "Lotes (navegador)", "route": "/d/seed_batches_browser"}),
            ("Seed Batches Table", 2, {"code": "Lotes (alta masiva)", "route": "/d/seed_batches_editable_table"}),
        ]
        for name, order, definition in children:
            if db.query(Menu).filter(Menu.name == name).count():
                continue
            db.add(Menu(name=name, parent_menu_id=parent.id, order=order, definition=definition))
        db.flush()
        print("[SeedbedsApp] Menú 'Semillero (demo)' registrado en el sidebar.")

    def on_app_ready(self, app: Any) -> None:
        # Presencia hot-plug: SOLO el nodo dedicado late. Mientras el heartbeat
        # esté vivo, /gui/navigation muestra la sección del semillero; el primer
        # latido emite navigation_changed y los sidebars conectados se refrescan
        # solos. Al parar el contenedor la clave expira por TTL y el watcher del
        # core vuelve a avisar → el menú desaparece sin recargar la página.
        import os

        if os.getenv("UNIBACK_NODE_TYPE", "monolith") in ("seedbeds", "monolith"):
            from uniback.utils.realtime import start_node_presence

            start_node_presence("seedbeds")
        print("[SeedbedsApp] Plugin de semillero montado. Entidad 'seed_batches' disponible en /api/seed_batches/.")
