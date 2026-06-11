# SeedbedsApp — demo de nodo hot-plug (semillero)

Plugin de demostración para la defensa del TFG: añade al sistema una entidad de
dominio nueva (**lotes de semillero**, `seed_batches`) empaquetada como un nodo
independiente que se puede enchufar y desenchufar **en caliente**, sin tocar el
núcleo, sin tocar el front y sin recargar siquiera la página del navegador.

## Qué demuestra

1. **Plugins**: modelo + CRUD + widgets de UI declarados en ~2 ficheros
   (`models.py`, `plugin.py`). El `PluginManager` los descubre solo.
2. **Pantallas automáticas**: el front no tiene ni una línea de código de
   semillero. Las páginas `/d/seed_batches_browser` y
   `/d/seed_batches_editable_table` las genera el backend al vuelo desde el
   JSON Schema de la entidad y las pinta el `DynamicPage` genérico.
3. **Hot-plug de infraestructura**: el servicio `seedbeds_node` del
   docker-compose está detrás de un *profile*, así que no arranca con el stack.
   Al lanzarlo, Traefik detecta el contenedor y enruta `/api/seed_batches`
   hacia él.
4. **Tiempo real**: el nodo mantiene un *heartbeat* en Redis
   (`uniback:node:seedbeds:alive`, ver `uniback.utils.realtime`) y todos los
   nodos comparten un bus Socket.IO sobre Redis. Al enchufar el nodo se emite
   `navigation_changed` y el sidebar de los navegadores conectados se refresca
   solo; al pararlo (o matarlo), la clave expira por TTL, el *watcher* del nodo
   core emite el evento y la sección **desaparece en vivo** porque
   `/gui/navigation` oculta los menús con `definition.requires_node` cuyo nodo
   no late.

## Guion de la demo

```bash
# 1. Stack normal levantado (sin el nodo de semillero):
docker compose up -d
# → En el front no existe la sección "Semillero (demo)".

# 2. Enchufar el nodo en caliente (un solo comando):
docker compose up -d seedbeds_node
# → SIN recargar la página, en unos segundos aparece "Semillero (demo)" en el
#   sidebar con dos pantallas generadas automáticamente (navegador CRUD y
#   tabla de alta masiva).
# → En el dashboard de Traefik (http://localhost:8080) se ve el router nuevo
#   de /api/seed_batches apuntando al contenedor uniback_seedbeds.

# 3. Desenchufarlo en caliente:
docker compose stop seedbeds_node
# → En ~10 s (TTL del heartbeat) la sección desaparece del sidebar, también
#   sin tocar el navegador.
```

Comprobaciones útiles durante la demo:

```bash
# El nodo responde a través del gateway:
curl http://localhost:8000/api/seed_batches/

# El heartbeat de presencia en Redis (TTL ≈ 10 s mientras el nodo vive):
docker compose exec redis redis-cli ttl uniback:node:seedbeds:alive

# Logs del nodo (se ve el sembrado y las peticiones llegando a ESTE nodo):
docker logs -f uniback_seedbeds
```

## Resetear los datos (opcional)

El menú se oculta solo cuando el nodo no está, así que no hace falta borrar
nada para repetir la demo. Si además se quieren eliminar los datos sembrados
(p. ej. para enseñar el sembrado inicial otra vez):

```bash
docker compose stop seedbeds_node
docker compose exec ub_pg psql -U postgres -d ub_db -c "
  -- Menús (heredan de functional_objects: el name vive en la tabla base y la
  -- cascada elimina también las filas de ub_gui_menus):
  DELETE FROM ub_functional_objects fo USING ub_gui_menus m
  WHERE m.id = fo.id
    AND fo.name IN ('Seedbeds Demo', 'Seed Batches Browser', 'Seed Batches Table');
  -- Lotes (cascada a ub_seedbeds_seed_batches):
  DELETE FROM ub_functional_objects WHERE object_type_id = 210;
"
```
