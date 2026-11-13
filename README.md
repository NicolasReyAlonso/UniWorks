# UniWorks

Framework *full-stack* para construir aplicaciones de gestión de datos cuando el
modelo de datos está en evolución. El modelo ORM es la única fuente de verdad:
de él se derivan los endpoints, el esquema, el contrato con el frontend y los
formularios, de modo que exponer y editar una entidad nueva consiste en
declararla.

Versión: **0.1.0-beta.1** · Trabajo de Fin de Grado (ULPGC, curso 2025-2026).

| Carpeta | Qué es |
|---|---|
| [`uniback/`](uniback/) | Backend: micronúcleo Python (FastAPI, SQLAlchemy 2, PostgreSQL) con sistema de *plugins*, fábricas CRUD y generación de JSON Schema enriquecido a partir del ORM. |
| [`gui-components/`](gui-components/) | Frontend: librería Angular `ngt-gui` (cliente genérico, formularios dinámicos con Formly, gestor de ventanas) y una aplicación de demostración. |

## Puesta en marcha

Requisitos: Docker con Docker Compose, y Node.js 20 o superior para el frontend.

**1. Backend** (API, PostgreSQL, Redis y Traefik):

```bash
cd uniback
docker compose up -d --build
```

La primera vez crea las tablas y siembra los datos de ejemplo. Queda en:

- API: <http://localhost:8000/api> — documentación interactiva en <http://localhost:8000/docs>
- Panel de Traefik (nodos y rutas): <http://localhost:8080/dashboard/>

**2. Frontend**:

```bash
cd gui-components
npm ci
npx ng build ngt-gui   # la aplicación consume la librería compilada
npx ng serve           # http://localhost:4200
```

**3. Entrar**: usuario `demo`, contraseña `demo1234`. En el menú, *Plantas
(demo)* reúne lo esencial del framework: un mapa con formulario generado desde
el esquema, la tabla de alta masiva y las zonas, que actúan de ámbito global en
la cabecera.

### Configuración privada (opcional)

El inicio de sesión con Google usa Firebase y necesita credenciales que no
están en el repositorio: una carpeta `private-conf/` **junto a** la del
repositorio con `firebase-service-account.json` (backend) y `ngd-firebase.json`
(frontend). Sin ella todo funciona igual con usuario y contraseña; simplemente
no se ofrece el acceso con Google.

## Pruebas

```bash
# Backend (autónomas: SQLite en memoria, sin Redis ni credenciales)
docker exec uniback_web python -m pytest tests/

# Frontend (tras `npx ng build ngt-gui`)
cd gui-components
npx ng test ngt-gui --watch=false --browsers=ChromeHeadless
npx ng test bcs-gui --watch=false --browsers=ChromeHeadless
```

## Antes de desplegarlo fuera de un entorno de desarrollo

El `docker-compose.yml` es un entorno de desarrollo y demostración. Para
cualquier otro uso:

- Cambia la contraseña de PostgreSQL y `UNIBACK_AUTH_SECRET_KEY`.
- Elimina o cambia el usuario sembrado `demo` (su contraseña es pública).
- Mantén `UNIBACK_AUTH_LOCAL_LOGIN_ENABLED` sin activar: permite entrar por
  nombre, sin credenciales.
- Restringe los orígenes CORS (`UNIBACK_API_CORS_ORIGINS`) a los de tu frontend.

## Documentación

- [`uniback/README.md`](uniback/README.md): arquitectura de micronúcleo, uso como librería, migraciones y cómo escribir un *plugin*.
- [`uniback/CHANGELOG.md`](uniback/CHANGELOG.md): cambios de cada versión.
- [`gui-components/README.md`](gui-components/README.md): desarrollo con la librería, pruebas, tiempo real y ámbito global.

## Licencia

Cada parte conserva la licencia de su origen:

| Parte | Licencia | Texto |
|---|---|---|
| `uniback/` (backend) | MIT | [`uniback/LICENSE`](uniback/LICENSE) |
| `gui-components/` (librería `ngt-gui` y aplicación de demostración) | GPL-3.0-or-later | [`gui-components/LICENSE`](gui-components/LICENSE) |

El código de terceros incluido en el repositorio mantiene su propia licencia,
indicada en la cabecera de sus ficheros.
