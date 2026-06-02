# Contrato Back ↔ Front — Incremento 2

Documento del contrato uniforme entre `uniback` (FastAPI) y `gui-components` (Angular + librería `ngt-gui`).
Define la estructura de las respuestas, los códigos de error, los endpoints de descubrimiento y la capa cliente genérica.

## 1. Envelope universal

Toda respuesta (éxito o error) del backend devuelve un objeto con esta forma:

```jsonc
{
  "content": <T | null>,
  "count":   <int>,
  "issues":  [ { "type": "INFO|WARNING|ERROR", "code": "<string|null>", "message": "<string>", "location": <any|null> } ]
}
```

- HTTP 2xx → `content` poblado, `count` coherente, `issues` puede traer INFO/WARNING.
- HTTP 4xx/5xx → `content = null`, `count = 0`, `issues` con al menos un ERROR.
- `count` = `len(content)` si lista, `1` si objeto, `0` si null.

**Implementación**:
- Modelo: [`src/uniback/api/schemas/responses.py`](../src/uniback/api/schemas/responses.py) (`ResponseEnvelope`, `Issue`, `IType`).
- Handlers globales: [`src/uniback/api/error_handlers.py`](../src/uniback/api/error_handlers.py) capturan `HTTPException`, `RequestValidationError` y `Exception` y devuelven envelope.
- Helpers: `ResponseEnvelope.ok(content)`, `ResponseEnvelope.fail(message, code=...)`, `Issue.error/warning/info(...)`.

### Códigos de error estándar

| `Issue.code` | HTTP | Significado |
|---|---|---|
| `BAD_REQUEST` | 400 | Petición malformada |
| `UNAUTHORIZED` | 401 | Sesión inválida o ausente |
| `FORBIDDEN` | 403 | Sin permisos sobre el recurso |
| `NOT_FOUND` | 404 | Recurso inexistente |
| `CONFLICT` | 409 | Estado en conflicto |
| `UNPROCESSABLE_ENTITY` | 422 | Validación fallida (fallback) |
| `VALIDATION_ERROR` | 422 | Validación Pydantic con `location` (JSON-pointer) |
| `INTERNAL_ERROR` | 500 | Excepción no capturada |
| `HTTP_<n>` | otros | Cualquier otro status |

Los códigos específicos de dominio (p. ej. `AUTH_INVALID_CREDENTIALS`, `DISCOVERY_UPSTREAM_ERROR`) se añaden caso por caso usando `Issue.error(message=..., code="MI_CODIGO")`.

## 2. Convención de endpoints por entidad

Toda entidad expuesta vía `make_simple_rest_crud` o `make_crudie_rest_crud` ofrece:

| Método | Path | Propósito | Body / Query |
|---|---|---|---|
| GET | `/<entity>/` | Lista | filtros como query params |
| GET | `/<entity>/{id}` | Un objeto | — |
| POST | `/<entity>/` | Crear | objeto JSON validado por `create_schema` |
| PUT | `/<entity>/{id}` | Actualizar | objeto JSON validado por `update_schema` |
| DELETE | `/<entity>/{id}?soft_delete=true\|false` | Borrar | — |
| GET | `/<entity>/schema.json` | JSON Schema enriquecido | — |

## 3. Endpoints de descubrimiento

- `GET /api/sys/entities` — Lista todas las entidades CRUD detectadas en `app.routes` con sus capabilities (`list/get/create/update/delete/schema`).
- `GET /api/sys/discovery` — Lista los servicios externos detectados a través de Traefik (microservicios).

## 4. Capa cliente en `ngt-gui`

Importable desde `'ngt-gui'`. Re-exportada en [`projects/ngt-gui/src/public-api.ts`](../../../Front/gui-components/projects/ngt-gui/src/public-api.ts).

### Tipos

```ts
import { ApiResponse, Issue, IssueType, EntityDescriptor, ServiceDescriptor, hasErrors, firstError } from 'ngt-gui';
```

### EntityClient<T>

```ts
import { EntityClient } from 'ngt-gui';

constructor(private api: EntityClient) {}

ngOnInit() {
  const roles = this.api.for<Role>('/roles');
  roles.list().subscribe(res => /* res: ApiResponse<Role[]> */);
  roles.get(1).subscribe(res => /* res: ApiResponse<Role> */);
  roles.create({ name: 'editor' }).subscribe(res => ...);
  roles.update(1, { name: 'admin' }).subscribe(res => ...);
  roles.delete(1, /* soft= */ true).subscribe(res => ...);
  roles.schema<JSONSchema>().subscribe(res => ...);
}
```

### SchemaService

Caché por entidad. Lanza error si el backend devuelve `issues` con ERROR.

```ts
this.schemas.get('/roles').subscribe(schema => /* JSON Schema */);
this.schemas.invalidate('/roles'); // forzar recarga
```

### DiscoveryService

```ts
this.discovery.loadEntities().subscribe(list => /* EntityDescriptor[] */);
this.discovery.entities$.subscribe(list => /* observable */);
this.discovery.findEntity('roles');
```

### ApiErrorInterceptor (opt-in)

Convierte cualquier error HTTP en `ApiResponse<null>` con `issues[]`. **No se registra automáticamente** para no romper el código existente que captura errores en `error: (err) => ...`. Se opta in añadiéndolo a los providers de la app:

```ts
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: ApiErrorInterceptor, multi: true },
]
```

## 5. Compatibilidad con el `BackendService` existente

El interfaz `BackendServiceInterface` con sus ~272 métodos hardcoded (`getProcesses`, `getSequences`, etc.) **sigue funcionando como antes**: devuelve `Observable<any>` con el cuerpo crudo. La nueva capa `EntityClient` convive con él y es la opción recomendada para entidades nuevas o cuando se quiera tipado fuerte sobre el envelope.

La migración del `BackendService` para que internamente delegue en `EntityClient` se hará progresivamente fuera del alcance del Incremento 2.

## 6. Pruebas

- Backend: [`tests/test_api/test_envelope.py`](../tests/test_api/test_envelope.py) verifica forma del envelope, 404, validación, `/sys/entities` y `/<entity>/schema.json`.
- Frontend: [`src/app/pages/api-contract-pilot/`](../../../Front/gui-components/src/app/pages/api-contract-pilot/) es un componente piloto navegable en `/api-contract-pilot` que consume el contrato end-to-end (DiscoveryService → SchemaService → EntityClient).

Ejecuta los tests del backend con:

```bash
pytest tests/test_api/test_envelope.py tests/test_api/test_auth.py
```

Y el piloto del frontend con:

```bash
cd ../Front/gui-components
ng build ngt-gui && ng serve
# navega a http://localhost:4200/api-contract-pilot
```
