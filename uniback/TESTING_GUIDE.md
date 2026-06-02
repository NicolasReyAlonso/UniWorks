# Guía de Pruebas del Backend Uniback

## Estado del Sistema ✅

- **Infraestructura (Docker)**: PostgreSQL (puerto 5433), Redis (puerto 6379)
- **API REST**: FastAPI corriendo en http://localhost:8000
- **Base de Datos**: Migraciones aplicadas correctamente
- **Documentación**: OpenAPI Swagger disponible en http://localhost:8000/docs

## Comandos Rápidos

### Gestión de Contenedores
```bash
# Iniciar todos los servicios
docker compose up -d

# Ver estado de contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f web

# Detener todos los servicios
docker compose down

# Detener y eliminar volúmenes (resetea la BD)
docker compose down -v
```

### Base de Datos
```bash
# Ver estado de migraciones
docker compose exec web alembic current

# Ejecutar migraciones pendientes
docker compose exec web alembic upgrade head

# Acceder a PostgreSQL directamente
docker compose exec ub_pg psql -U postgres -d ub_db
```

## Endpoints Disponibles

### 1. Health Check / Estado del Sistema

**Endpoint raíz**
```bash
curl http://localhost:8000/
# Respuesta: {"status":"ok"}
```

**Health check**
```bash
curl http://localhost:8000/api/health
# Respuesta: {"status":"ok"}
```

### 2. Autenticación (Auth)

**Login**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**Registro de usuario**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "name": "New User"
  }'
```

**Obtener información del usuario actual**
```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Identidades y Roles

**Listar identidades**
```bash
curl http://localhost:8000/api/identities
```

**Listar roles**
```bash
curl http://localhost:8000/api/roles
```

**Listar grupos**
```bash
curl http://localhost:8000/api/groups
```

**Listar organizaciones**
```bash
curl http://localhost:8000/api/organizations
```

### 4. Objetos Funcionales (Functional Objects)

**Listar objetos funcionales**
```bash
curl http://localhost:8000/api/functional-objects
```

**Obtener un objeto específico**
```bash
curl http://localhost:8000/api/functional-objects/{uuid}
```

**Crear nuevo objeto funcional**
```bash
curl -X POST http://localhost:8000/api/functional-objects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Mi Objeto",
    "attributes": {"key": "value"}
  }'
```

### 5. Colecciones

**Listar colecciones**
```bash
curl http://localhost:8000/api/collections
```

**Objetos en una colección**
```bash
curl http://localhost:8000/api/collection-items?collection_id=1
```

### 6. Jerarquías

**Listar nodos de jerarquía**
```bash
curl http://localhost:8000/api/hierarchy-nodes
```

### 7. Anotaciones

**Listar plantillas de anotación**
```bash
curl http://localhost:8000/api/annotations/templates
```

**Listar campos de anotación**
```bash
curl http://localhost:8000/api/annotations/fields
```

### 8. Archivos y Almacenamiento

**Listar almacenes de archivos**
```bash
curl http://localhost:8000/api/file-stores
```

**Listar archivos**
```bash
curl http://localhost:8000/api/files
```

### 9. Control de Acceso (ACL)

**Listar ACLs**
```bash
curl http://localhost:8000/api/acl
```

**Listar expresiones ACL**
```bash
curl http://localhost:8000/api/acl-expressions
```

### 10. Sistema y Funciones

**Listar funciones del sistema**
```bash
curl http://localhost:8000/api/system-functions
```

**Filtros del navegador**
```bash
curl http://localhost:8000/api/sys/browser-filters
```

### 11. Vistas y Dashboards

**Listar vistas**
```bash
curl http://localhost:8000/api/views
```

**Listar dashboards**
```bash
curl http://localhost:8000/api/dashboards
```

### 12. Estudios de Caso

**Listar estudios de caso**
```bash
curl http://localhost:8000/api/case-studies
```

### 13. Interfaz de Usuario

**Listar pantallas**
```bash
curl http://localhost:8000/api/screens
```

**Listar menús**
```bash
curl http://localhost:8000/api/menus
```

**Listar variantes de aplicación**
```bash
curl http://localhost:8000/api/app-flavors
```

### 14. Internacionalización

**Listar etiquetas de entidades**
```bash
curl http://localhost:8000/api/entity-labels
```

## Documentación Interactiva

### Swagger UI (Recomendado)
Abre en tu navegador: http://localhost:8000/docs

Aquí puedes:
- Ver todos los endpoints disponibles organizados por tags
- Probar cada endpoint directamente desde el navegador
- Ver los esquemas de request/response
- Autenticarte y probar endpoints protegidos

### ReDoc (Alternativa)
Abre en tu navegador: http://localhost:8000/redoc

Documentación más limpia y legible, ideal para referencia.

## Ejemplos de Flujos Comunes

### 1. Flujo de Autenticación Completo
```bash
# 1. Registrar un nuevo usuario
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'

# 2. Hacer login
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}' \
  | jq -r '.access_token')

# 3. Usar el token para obtener info del usuario
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 2. CRUD de Objetos Funcionales
```bash
# Crear
curl -X POST http://localhost:8000/api/functional-objects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Test Object", "attributes": {}}'

# Listar
curl http://localhost:8000/api/functional-objects

# Actualizar
curl -X PUT http://localhost:8000/api/functional-objects/{uuid} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Updated Object"}'

# Eliminar
curl -X DELETE http://localhost:8000/api/functional-objects/{uuid} \
  -H "Authorization: Bearer $TOKEN"
```

## Ejecutar Tests

```bash
# Tests unitarios
docker compose exec web pytest

# Tests con cobertura
docker compose exec web pytest --cov=uniback --cov-report=html

# Tests específicos
docker compose exec web pytest tests/test_api/test_auth.py
```

## Solución de Problemas

### El contenedor web no inicia
```bash
# Ver logs detallados
docker compose logs web

# Reconstruir la imagen
docker compose up --build web

# Verificar que las dependencias se instalaron
docker compose exec web pip list
```

### Error de conexión a la base de datos
```bash
# Verificar que PostgreSQL está corriendo
docker compose ps ub_pg

# Ver logs de PostgreSQL
docker compose logs ub_pg

# Probar conexión manual
docker compose exec ub_pg psql -U postgres -d ub_db -c "SELECT 1"
```

### Migraciones no aplicadas
```bash
# Ver estado actual
docker compose exec web alembic current

# Aplicar migraciones
docker compose exec web alembic upgrade head

# Si las tablas ya existen, sincronizar estado
docker compose exec web alembic stamp head
```

### Resetear la base de datos completamente
```bash
# Detener servicios y eliminar volúmenes
docker compose down -v

# Volver a iniciar
docker compose up -d

# Ejecutar migraciones
docker compose exec web alembic upgrade head
```

## Notas Importantes

1. **Autenticación**: La mayoría de endpoints requieren autenticación. Obtén un token con `/api/auth/login` primero.

2. **CORS**: La API está configurada para aceptar peticiones desde cualquier origen en desarrollo. En producción, configura los orígenes permitidos en la configuración.

3. **Documentación**: Usa siempre http://localhost:8000/docs para explorar la API de forma interactiva.

4. **Logs**: Para debugging, mantén una terminal con `docker compose logs -f web` abierta.

5. **Hot Reload**: El servidor tiene `--reload` activado, los cambios en el código se aplican automáticamente.

6. **Base de Datos**: El volumen de PostgreSQL persiste entre reinicios. Usa `docker compose down -v` solo si quieres resetear completamente.
