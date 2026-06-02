# Generación automática de esquemas — Incremento 4

Formaliza la extracción automática de esquemas desde el ORM y los publica en
un endpoint único (bundle) preparado para codegen y portabilidad. Añade
versionado vía ETag para caching agresivo en cliente y proxies.

## Piezas

### Registry de entidades

[`src/uniback/api/schema_registry.py`](../src/uniback/api/schema_registry.py).

Cada llamada a `make_simple_rest_crud` o `make_crudie_rest_crud` registra la
entidad en un diccionario global vía `register_entity(EntityRegistration(...))`:

```python
@dataclass
class EntityRegistration:
    name: str            # "roles"
    path: str            # "/roles"
    factory: str         # "simple" | "crudie"
    orm_class: Type | None
    pydantic_schema: Type[BaseModel] | None
    tags: list[str]
```

El registry expone:

- `register_entity(reg)` — idempotente por `name`.
- `get_entity(name)` — lookup.
- `all_entities()` — copia de todas las registradas.
- `build_entity_schema(reg)` — JSON Schema enriquecido para una entidad.
- `build_schema_bundle(base_url)` — documento con todas las entidades.
- `compute_etag(payload)` — hash SHA-256 truncado, encapsulado como
  validador débil `W/"…"`.

### Endpoint `/api/sys/schemas`

[`src/uniback/api/routers/discovery.py`](../src/uniback/api/routers/discovery.py).

Devuelve un `ResponseEnvelope` cuyo `content` es:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "version": "9f3a1b2c4d5e6f70",
  "generated_at": "2026-05-11T10:38:02Z",
  "entities": {
    "roles":      { "type": "object", "properties": { … }, "x-*": "…" },
    "identities": { "type": "object", "properties": { … } },
    "…":          { … }
  }
}
```

- `version` es el ETag del bundle sin el prefijo `W/"…"`. Estable: dos
  llamadas consecutivas con la misma BD/ORM devuelven la misma versión.
- `generated_at` cambia entre llamadas — es metadato, no participa en el
  hash.
- La respuesta lleva header `ETag: W/"…"`. Una segunda llamada con
  `If-None-Match: W/"…"` recibe **HTTP 304** sin cuerpo.

### ETag por entidad

`/<entity>/schema.json` ahora también:

- Calcula `ETag` con `compute_etag(enriched_schema)`.
- Si el request lleva `If-None-Match` y coincide → 304 sin cuerpo.
- Si no, devuelve `ResponseEnvelope` con header `ETag`.

## Frontend

### Tipos

```ts
import { SchemaBundle } from 'ngt-gui';

interface SchemaBundle {
  $schema: string;
  version: string;
  generated_at: string;
  entities: Record<string, unknown>;
}
```

### SchemaService

```ts
constructor(private schemas: SchemaService) {}

// Por entidad (cacheado en memoria por path)
this.schemas.get('/roles').subscribe(schema => …);

// Bundle completo (cacheado con shareReplay)
this.schemas.getBundle().subscribe(bundle => {
  console.log(bundle.version, Object.keys(bundle.entities));
});

// Forzar refresco
this.schemas.getBundle({ reload: true }).subscribe(…);
this.schemas.invalidateBundle();
```

`HttpClient` de Angular hace caching de ETag automáticamente vía el
`Cache-Control` del navegador; no hay que mandar `If-None-Match` a mano para
beneficiarse de él en el navegador.

## Tests

[`tests/test_api/test_schema_bundle.py`](../tests/test_api/test_schema_bundle.py):

- `/sys/schemas` devuelve envelope versionado, con `version`, `generated_at`
  y entidades.
- La versión es estable entre llamadas consecutivas (el hash del contenido
  no se mueve aunque `generated_at` sí).
- ETag round-trip: una segunda llamada con `If-None-Match` devuelve 304.
- Las entidades conocidas (p. ej. `roles`) están presentes con `type:
  object` y `properties`.
- ETag por entidad: header presente, 304 con `If-None-Match`, ETags
  distintos para entidades distintas.
- Unit tests directos de `compute_etag` (estabilidad + sensibilidad al
  contenido) y `build_schema_bundle`.

## Por qué importa para la reusabilidad

El bundle es la pieza que permite:

- **Codegen en otros proyectos**: un script puede pedir
  `/api/sys/schemas` una vez y generar interfaces TypeScript, formularios
  Formly precompilados, validadores, documentación.
- **Espejado en otros backends**: un microservicio puede pedir el bundle de
  otro para conocer su contrato sin acoplarse al ORM.
- **Caching agresivo**: con ETag, un navegador o proxy almacena el bundle
  indefinidamente y solo paga round-trips condicionales mientras no
  cambia.

## Polimorfismo (FunctionalObject + subclases)

Toda entidad cuya clase ORM sea la **raíz** de una jerarquía polimórfica de
SQLAlchemy (`polymorphic_on`, sin mapper padre) emite, junto a sus
`properties` base, un `oneOf` con el schema enriquecido de cada subclase y un
`x-discriminator`:

```json
{
  "type": "object",
  "properties": { "object_type_id": { "type": "integer" }, "name": { } },
  "oneOf": [
    { "type": "object", "title": "Dataset",    "properties": { } },
    { "type": "object", "title": "Collection", "properties": { } }
  ],
  "x-discriminator": {
    "propertyName": "object_type_id",
    "mapping": { "0": "Dataset", "106": "Collection", "103": "CaseStudy" }
  }
}
```

- El campo discriminador se deduce de `polymorphic_on` (`object_type_id`).
- `mapping` asocia cada valor del discriminador (la `polymorphic_identity`
  de la subclase) con el nombre de su clase.
- Las variantes se **incrustan completas** (no vía `$ref`): así el documento
  es autocontenido tanto en `/<entity>/schema.json` como dentro del bundle
  agregado, donde un `#/$defs` no resolvería desde la raíz del bundle.
- Las `properties` base se conservan, de modo que un consumidor que no
  entienda `oneOf` (p. ej. el conversor Formly del frontend) sigue viendo
  las columnas comunes sin romperse. Las variantes están ordenadas de forma
  determinista, así que el `version`/ETag del bundle permanece estable.
- Solo la clase raíz emite `oneOf`; una subclase registrada por separado
  (p. ej. `case_studies`) no lo lleva.

## Relaciones ORM (`x-relationships`)

Las `relationship()` del ORM se reflejan como un array `x-relationships`
(ordenado por nombre), complementando el `x-foreign-key` por columna:

```json
"x-relationships": [
  { "name": "rl_owner", "target": "identities", "direction": "MANYTOONE",
    "collection": false, "endpoint": "/identities",
    "local_columns": ["owner_id"] }
]
```

- `target`: entidad registrada destino (o el nombre de la clase ORM si no
  está registrada en el `schema_registry`).
- `direction`: `MANYTOONE` | `ONETOMANY` | `MANYTOMANY`.
- `collection`: `true` si la relación es a una colección (`uselist`).
- `endpoint`: ruta CRUD de la entidad destino, si está registrada.
- `local_columns`: columnas FK locales que materializan la relación.

## Tests añadidos

[`tests/test_api/test_schema_bundle.py`](../tests/test_api/test_schema_bundle.py)
cubre además: `functional_objects` expone `oneOf` + `x-discriminator` con las
subclases conocidas y conserva `properties`; una subclase no emite `oneOf`;
`x-relationships` refleja `rl_owner` (MANYTOONE → `identities`) y va ordenado;
y el `version` del bundle no se desestabiliza con estas extensiones.

En el frontend, `schema-to-formly.spec.ts` verifica que el conversor procesa
una raíz polimórfica (object + properties + `oneOf` + `x-discriminator` +
`x-relationships`) sin lanzar y renderiza solo las columnas base, sin filtrar
variantes ni `x-relationships` como campos del formulario.
