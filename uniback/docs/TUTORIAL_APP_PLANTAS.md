# Tutorial: montar una app sobre el framework — "Plantas en el mapa"

Guía práctica para el equipo de desarrollo. Construimos, de principio a fin, una
aplicación de dominio (**catálogo de plantas geolocalizadas con un mapa**) **sin
tocar el núcleo** de `uniback` ni de la librería `ngt-gui`. Es el patrón que
debéis seguir para cualquier app nueva.

La app real de ejemplo ya está en el repo:

| Capa | Ubicación | Qué contiene |
|---|---|---|
| Backend (plugin) | [`src/plugins/plants/`](../src/plugins/plants/) | modelo `Plant`, CRUD, semilla, widget de mapa |
| Frontend (página) | [`Front/gui-components/src/app/pages/plants/`](../../../Front/gui-components/src/app/pages/plants/) | mapa OpenLayers + formulario dinámico |

---

## 1. La idea: arquitectura de micronúcleo

El framework es un **micronúcleo**: el núcleo no conoce tu dominio. Tú aportas el
dominio como un **plugin** que se engancha al ciclo de vida en puntos bien
definidos. A cambio, obtienes **gratis** un montón de infraestructura.

```
            TU PLUGIN (dominio "plantas")                 EL NÚCLEO (no sabe de plantas)
            ─────────────────────────────                 ──────────────────────────────
  get_model_modules() ─▶ Plant(FunctionalObject) ───────▶ ORM, polimorfismo, ownership,
                                                          soft-delete, full-text search
  get_routers()       ─▶ make_simple_rest_crud(Plant) ──▶ GET/POST/PUT/DELETE + /bulk
                                                          + /plants/schema.json (JSON Schema)
  get_field_widgets() ─▶ MapCoordinatesWidget ──────────▶ inyecta hints x-* en el schema
  on_seed()           ─▶ ObjectType + plantas demo ─────▶ se ejecuta en el arranque

                         Y sin escribir nada más:
                         · /api/sys/entities lista "plants"
                         · /api/sys/schemas la incluye en el bundle versionado (ETag)
                         · /api/gui/screens/by-name/plants_browser  (pantalla sintética)
                         · /api/gui/screens/by-name/plants_form / plants_editable_table
```

En el frontend, esa misma entidad se consume con piezas **genéricas** de
`ngt-gui` (no específicas de plantas):

```
  SchemaService.get('/plants')      ─▶ trae el JSON Schema (cacheado por ETag)
  <ngt-dynamic-form entityPath=…>   ─▶ construye el formulario Formly solo
  EntityClient.for('/plants')       ─▶ list/get/create/update/delete/bulk tipados
```

Lo único que escribes a mano en el front es lo **propio de tu app**: en este caso,
el mapa.

---

## 2. Backend: anatomía del plugin

Un plugin es un paquete Python dentro de `src/plugins/`. El `PluginManager` lo
descubre solo al arrancar (busca `<paquete>/plugin.py` y, dentro, una subclase de
`UnibackPlugin`). No hay que registrar nada en ningún sitio.

```
src/plugins/plants/
├── __init__.py     # docstring del paquete
├── models.py       # modelo SQLAlchemy del dominio
└── plugin.py       # la clase UnibackPlugin con los hooks
```

### 2.1. El modelo — `models.py`

Heredamos de `FunctionalObject` para reaprovechar `id`/`uuid`/`name`/`attributes`,
propiedad automática, `creation_time`, borrado lógico, búsqueda y **polimorfismo**.

```python
import enum
from datetime import date
from sqlalchemy import BigInteger, Date, Float, ForeignKey, String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from uniback.persistence.base import get_table_prefix
from uniback.persistence.models.core import (
    FunctionalObject, class_to_object_type_id, data_object_type_id,
)

# Reservamos un object_type_id único para el polimorfismo (el núcleo usa <~1000).
data_object_type_id["plant"] = 200

class PlantHealth(str, enum.Enum):     # SAEnum ⇒ el schema emite `enum` ⇒ <select> en el front
    healthy = "healthy"; attention = "attention"; sick = "sick"; dead = "dead"

class Plant(FunctionalObject):
    __tablename__ = f"{get_table_prefix()}plants_plants"
    __mapper_args__ = {"polymorphic_identity": data_object_type_id["plant"]}

    id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{get_table_prefix()}functional_objects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    species: Mapped[str | None]   = mapped_column(String(200))
    latitude: Mapped[float | None]  = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    planted_on: Mapped[date | None] = mapped_column(Date)          # ⇒ datepicker
    health: Mapped[PlantHealth | None] = mapped_column(
        SAEnum(PlantHealth, name="plant_health"), default=PlantHealth.healthy)
    notes: Mapped[str | None] = mapped_column(
        String(2000),
        info={"ui": {"ui-widget": "textarea", "formly-props": {"rows": 4}}},  # override manual
    )

class_to_object_type_id.update({Plant: data_object_type_id["plant"]})
```

Puntos clave:

- **Tipo de columna → widget automático.** El generador de schema deduce el widget
  del tipo SQLAlchemy: `Date`→date, `Enum`→select, `Float`/`Integer`→number,
  `Boolean`→checkbox, `String(>500)`/JSONB→textarea/json. (Ver
  [`DYNAMIC_FORMS.md`](DYNAMIC_FORMS.md).)
- **Override por columna** con `info={"ui": {...}}`: las claves se aplanan con
  prefijo `x-` en el schema (aquí forzamos textarea de 4 filas en `notes`).
- **`name` (heredado)** lo usamos como nombre común; `species` como científico.
- **`data_object_type_id["plant"] = 200`**: cada subclase polimórfica necesita un
  id de tipo único. La fila `ObjectType` correspondiente la sembramos en `on_seed`
  (es FK obligatoria).

### 2.2. Los hooks — `plugin.py`

```python
from uniback.plugins.base import UnibackPlugin

class PlantsPlugin(UnibackPlugin):
    name = "PlantsApp"; version = "1.0.0"
    description = "App demo: catálogo de plantas geolocalizadas sobre un mapa"

    # 1) Modelos: el initializer los importa antes de configurar los mappers.
    def get_model_modules(self):
        return ["plants.models"]

    # 2) API REST: CRUD completo + /schema.json + /bulk. Importa el modelo AQUÍ
    #    (no a nivel de módulo): get_routers corre tras configure_mappers.
    def get_routers(self):
        from uniback.api.crud_factory import make_simple_rest_crud
        from plants.models import Plant
        # /schema.json se genera del create_schema. Por defecto incluye toda la
        # "fontanería" de FunctionalObject (object_type_id, owner_id, native_*,
        # timestamps, flags, attributes), que en el formulario dinámico saldría
        # como campos editables e incluso dispararía selects FK contra /identities
        # y /ub_object_types. La excluimos para que el form muestre solo el dominio.
        FRAMEWORK_FIELDS = ["object_type_id", "owner_id", "native_id",
                            "native_table", "entity_update_time",
                            "ts_vector_update_time", "ts_vector",
                            "is_deleted", "authr_reference", "attributes"]
        return [make_simple_rest_crud(
            Plant, "plants", tags=["Plants"],
            exclude_from_create=list(FRAMEWORK_FIELDS),   # listas separadas:
            exclude_from_update=list(FRAMEWORK_FIELDS),   # la factory las muta
        )]

    # 3) Pistas de UI inyectables (opcional): un FieldWidget enriquece el schema.
    def get_field_widgets(self):
        return [MapCoordinatesWidget()]

    # 4) Semilla: corre dentro del session_scope del arranque, antes del seed núcleo.
    def on_seed(self, db):
        from uniback.persistence.models.core import ObjectType
        from plants.models import Plant, data_object_type_id
        import uuid
        tid = data_object_type_id["plant"]
        if not db.get(ObjectType, tid):                      # FK del polimorfismo
            db.add(ObjectType(id=tid, uuid=uuid.uuid4(), name="plant")); db.flush()
        if db.query(Plant).count() == 0:                     # idempotente
            db.add_all([Plant(name="Drago", species="Dracaena draco",
                              latitude=28.0708, longitude=-15.4694, health="healthy")])
            db.flush()
```

El **FieldWidget** del mapa (extensión inyectable) marca las columnas de
coordenadas con hints `x-*` que luego puede leer la app. El registro solo copia
claves que empiecen por `x-`:

```python
class MapCoordinatesWidget:
    name = "map-coordinates"
    def matches(self, col, schema, info):  return col in ("latitude", "longitude")
    def enrich(self, col, schema, info):
        return {"x-map-field": col, "x-formly-props": {"step": 0.000001}}
```

> **Hooks disponibles** en `UnibackPlugin` (todos opcionales, devuelven vacío por
> defecto): `on_init`, `get_model_modules`, `get_routers`, `on_seed`,
> `on_app_ready`, y las extensiones inyectables `get_source_adapters`,
> `get_importers`, `get_exporters`, `get_field_widgets`, `get_fk_resolvers`.

### 2.3. Lo que obtienes gratis (verificado)

Una vez cargado el plugin, **sin una línea más** de backend:

```bash
# Login local de conveniencia (ver reference de la BD)
curl -X PUT "http://localhost:8000/api/authn?user=test_user" -c cookies.txt

# CRUD genérico
curl -b cookies.txt http://localhost:8000/api/plants/
curl -b cookies.txt -X POST http://localhost:8000/api/plants/ \
     -H 'Content-Type: application/json' \
     -d '{"name":"Tabaiba","species":"Euphorbia balsamifera","latitude":28.1,"longitude":-15.42,"health":"healthy"}'

# JSON Schema enriquecido (con los hints del FieldWidget en lat/lng)
curl -b cookies.txt http://localhost:8000/api/plants/schema.json

# Descubrimiento + bundle versionado
curl -b cookies.txt http://localhost:8000/api/sys/entities      # incluye /api/plants
curl -b cookies.txt http://localhost:8000/api/sys/schemas       # bundle con ETag

# Pantallas sintéticas (sin sembrar nada): browser / form / editable_table
curl -b cookies.txt http://localhost:8000/api/gui/screens/by-name/plants_browser
```

En `/plants/schema.json`, `latitude`/`longitude` traen
`"x-map-field"` y `"x-formly-props": {"step": 1e-06}`; `health` trae
`"x-ui-widget": "select"`; `notes` trae `"x-ui-widget": "textarea"` con `rows: 4`.

---

## 3. Frontend: la página de la app

La página vive en la **app consumidora** (no en la librería):
[`src/app/pages/plants/plants-map.component.ts`](../../../Front/gui-components/src/app/pages/plants/plants-map.component.ts).
Combina tres piezas genéricas del framework + OpenLayers para el mapa.

### 3.1. Piezas reutilizables (de `ngt-gui`)

```ts
import { EntityClient, DynamicFormComponent, ApiResponse, Issue,
         hasErrors, firstError } from 'ngt-gui';

// CRUD genérico tipado contra el envelope del backend
private readonly plants$ = inject(EntityClient).for<Plant>('/plants');
this.plants$.list().subscribe(res => this.plants = res.content ?? []);
this.plants$.create(model).subscribe(...);
this.plants$.update(id, model).subscribe(...);
this.plants$.delete(id).subscribe(...);
```

```html
<!-- Formulario generado SOLO a partir del schema del backend. Cero HTML de campos. -->
<ngt-dynamic-form
    entityPath="/plants"
    [mode]="formMode"            <!-- 'create' | 'edit' | 'view' -->
    [(model)]="model"
    [issues]="issues"
    submitButton="Guardar"
    (submitted)="save($event)">
</ngt-dynamic-form>
```

`DynamicFormComponent` pide `/plants/schema.json`, lo convierte a campos Formly
(`schemaToFormly`) y los renderiza con los tipos ya registrados en la app
(`FormlyComponentsModule`). Los validadores (`required`, `min/maxLength`,
`pattern`, `email`…) salen también del schema.

> **⚠️ Dos requisitos de configuración (una sola vez por app):**
>
> 1. **Tokens de `EntityClient`.** `EntityClient`/`DynamicFormComponent` viven en el
>    entry point *main* de `ngt-gui`, que define sus PROPIOS `CORE_ENVIRONMENT` y
>    `GLOBAL_SERVICE` (instancias DI distintas a las de `ngt-gui/core`). Hay que
>    cablearlos en `app.config.ts`, o saltará `NullInjectorError: No provider for
>    InjectionToken core.environment` (al construir) y luego **401 Unauthorized**
>    (su GlobalService no tiene las `authOptions` que pone `AuthService`):
>    ```ts
>    import { CORE_ENVIRONMENT, GLOBAL_SERVICE } from "ngt-gui/core";
>    import { CORE_ENVIRONMENT as CORE_ENVIRONMENT_ENTITY,
>             GLOBAL_SERVICE  as GLOBAL_SERVICE_ENTITY } from "ngt-gui";
>    // ...
>    { provide: CORE_ENVIRONMENT_ENTITY, useValue: environment },
>    { provide: GLOBAL_SERVICE_ENTITY, useExisting: GLOBAL_SERVICE }, // ¡useExisting!
>    ```
> 2. **Tipo formly `datepicker`.** `schemaToFormly` mapea los campos `date` (como
>    `planted_on`) al tipo `datepicker`, que NO viene en `@ngx-formly/ng-zorro-antd`.
>    Hay que registrarlo en `FormlyModule.forRoot({ types: [...] })` con un
>    componente que envuelva `nz-date-picker` (ver
>    `datepicker-formly.component.ts`); si no, el formulario revienta con
>    *"The type 'datepicker' could not be found"* y rompe toda la página.

### 3.2. El mapa (lo propio de la app)

OpenLayers (`ol`, ya en `package.json`) pinta un marcador por planta y, al pulsar
en el mapa, fija `latitude`/`longitude` en el modelo del formulario:

```ts
this.map.on('click', (evt) => {
  const hit = this.map.forEachFeatureAtPixel(evt.pixel, f => f.get('plantId'));
  if (hit != null) { this.selectPlant(...); return; }      // pulsar marcador = editar
  const [lng, lat] = toLonLat(evt.coordinate);             // pulsar mapa = situar
  this.model = { ...this.model, latitude: round(lat), longitude: round(lng) };
});
```

> El CSS de OpenLayers (`node_modules/ol/ol.css`) ya está declarado en
> `angular.json` → `styles`. Si montas el mapa en otro proyecto, añádelo ahí.

### 3.3. Enganchar la página

**Ruta** en [`src/app/app.routes.ts`](../../../Front/gui-components/src/app/app.routes.ts)
(dentro del bloque protegido por `CheckLoginGuard`, para que el `EntityClient`
tenga la sesión):

```ts
{
  path: 'plantsMap',
  loadComponent: () => import('src/app/pages/plants/plants-map.component')
                         .then(m => m.PlantsMapComponent),
},
```

**Menú lateral.** ⚠️ El sidebar lo sirve el **backend** desde la tabla
`ub_gui_menus` (endpoint `GET /api/gui/navigation`). El YAML
`src/assets/config/DemoFinal.yaml` es **solo un fallback** que se usa cuando el
backend no responde — añadir la entrada ahí NO la hace aparecer si el backend
está vivo. Por eso la registramos como semilla en `on_seed` (un `Menu` padre +
un `Menu` hijo). Solo se siembra en el nodo `core`/`monolith` para que los
varios nodos del despliegue no la creen en paralelo:

```python
# plugin.py · on_seed → _seed_menu  (get-or-create por nombre = idempotente)
from uniback.persistence.models.screens import Menu
import os

# Solo el nodo que sirve /gui/navigation; evita duplicados multi-nodo.
if os.getenv("UNIBACK_NODE_TYPE", "monolith") not in ("core", "monolith"):
    return

parent = db.query(Menu).filter(Menu.name == "Plants Demo").first()
if parent is None:
    parent = Menu(name="Plants Demo", icon="environment", order=60,
                  definition={"code": "Plantas (demo)"})
    db.add(parent); db.flush()                  # necesitamos parent.id

children = [
    # Pestaña 1: página Angular dedicada (el mapa).
    ("Plants Map", 1, {"code": "Plantas en el mapa", "route": "/plantsMap"}),
    # Pestaña 2: tabla editable / ALTA MASIVA. Es una pantalla SINTÉTICA: el
    # backend la genera del schema (/gui/screens/by-name/plants_editable_table,
    # con bulkEndpoint=/plants/bulk) y el DynamicPage la pinta con BulkEditGrid.
    # CERO código front: basta apuntar a /d/<entidad>_editable_table.
    ("Plants Table", 2, {"code": "Plantas (alta masiva)", "route": "/d/plants_editable_table"}),
]
for name, order, definition in children:
    if db.query(Menu).filter(Menu.name == name).count():
        continue
    db.add(Menu(name=name, parent_menu_id=parent.id, order=order, definition=definition))
db.flush()
```

El front toma la ruta de `definition.route`. La pestaña del mapa apunta a
`/plantsMap` (página Angular dedicada); la de alta masiva a
`/d/plants_editable_table` (pantalla dinámica sintética, sin escribir front). Sin
`permission`, ambas son visibles para todos. Tras sembrar, basta **refrescar
el navegador** (el sidebar se recarga desde el backend; no hay que reconstruir el
front). El bloque equivalente en `DemoFinal.yaml` se deja solo como fallback
documental.

---

## 4. Cómo ejecutarlo

```bash
# 1) Infraestructura (Postgres + Redis) ya descrita en el README
cd Back/uniback
docker compose up -d

# 2) Backend (create_tables y auto_seed están a True por defecto: crea ub_plants_plants
#    y siembra las plantas de ejemplo en el primer arranque)
python -m uvicorn run_server:create_initialized_app --factory --reload   # o vuestro arranque habitual

# 3) Frontend: la app consume dist/ de la librería; reconstruir lib + servir app
cd ../../Front/gui-components
ng build ngt-gui        # solo si tocaste la librería (esta demo NO la toca)
ng serve                # navega a http://localhost:4200/#/plantsMap
```

En el navegador: verás los marcadores de las plantas semilla sobre Gran Canaria,
podrás pulsar un marcador para editar, pulsar el mapa para situar una nueva y
guardar con el formulario generado.

---

## 5. Checklist para TU propia app

1. `src/plugins/<tu_app>/__init__.py`, `models.py`, `plugin.py`.
2. Modelo: hereda `FunctionalObject` (rico) o `ORMBase` (tabla plana, sin
   polimorfismo). Si es polimórfico, reserva `data_object_type_id["x"]` y siembra
   su `ObjectType` en `on_seed`.
3. `get_model_modules()` → `["<tu_app>.models"]`.
4. `get_routers()` → `make_simple_rest_crud(TuModelo, "<entidad>")`.
5. (Opcional) `get_field_widgets()` para hints de UI; `on_seed()` para datos.
6. Front: ruta Angular en `app.routes.ts`. Usa `EntityClient` y
   `<ngt-dynamic-form entityPath="/<entidad>">`. Escribe a mano solo lo propio de
   tu dominio (visualizaciones, mapas, editores…).
7. Sidebar: siembra el `Menu` (padre + hijo) en `on_seed`, guardado al nodo
   `core`/`monolith` (no en el YAML, que es solo fallback). El hijo apunta con
   `definition.route` a tu ruta Angular.

---

## 6. Notas y limitaciones

- **Pantallas sintéticas vs. a medida.** `/gui/screens/by-name/<entidad>_browser`
  genera columnas a partir del schema y se queda con las primeras (incluye
  columnas heredadas de `FunctionalObject`). Para un browser pulido, **siembra un
  `Screen`** con `definition.columns` explícitas (o usa, como aquí, una página a
  medida).
- **Tablas nuevas.** En desarrollo, `create_tables=True` crea la tabla en el primer
  arranque. Para producción, genera la migración Alembic:
  `alembic revision --autogenerate -m "add plants"` y `alembic upgrade head`.
- **Versionado (SQLAlchemy-Continuum).** El núcleo activa versionado en
  `FunctionalObject`. En el `ub_db` actual no se materializan tablas/triggers de
  versión, así que las inserciones funcionan igual que en las entidades del
  núcleo. Si en algún entorno con una versión más reciente de
  `SQLAlchemy-Continuum` aparece un error tipo `relation "ub_..._version" does not
  exist` al insertar, es un asunto de infraestructura del versionado (afecta a
  cualquier subclase de `FunctionalObject`, no a tu plugin): aplica el esquema con
  Alembic o alinea la versión de la librería.
- **El cliente genérico (`EntityClient`) usa la sesión** (`authOptions`): registra
  tu página dentro del bloque de rutas protegido por `CheckLoginGuard`.

---

## 7. Referencias

- Contrato back↔front y envelope: [`CONTRACT.md`](CONTRACT.md)
- Formularios dinámicos (hints `x-*`, `schemaToFormly`): [`DYNAMIC_FORMS.md`](DYNAMIC_FORMS.md)
- Generación de esquemas y bundle versionado: [`SCHEMA_GENERATION.md`](SCHEMA_GENERATION.md)
- Plugin de ejemplo mínimo (solo router): [`src/plugins/jupyter_integration/`](../src/plugins/jupyter_integration/)
