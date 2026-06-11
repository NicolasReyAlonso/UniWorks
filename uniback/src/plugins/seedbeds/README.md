# SeedbedsApp — demo de nodo hot-plug (semillero)

Plugin de demostración para la defensa del TFG: añade al sistema una entidad de
dominio nueva (**lotes de semillero**, `seed_batches`) empaquetada como un nodo
independiente que se puede enchufar **en caliente**, sin tocar el núcleo, sin
tocar el front y sin reiniciar ningún servicio.

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
   hacia él; el nodo siembra sus datos y su menú en la BD compartida.

## Guion de la demo

```bash
# 1. Stack normal levantado (sin el nodo de semillero):
docker compose up -d
# → En el front no existe la sección "Semillero (demo)".

# 2. Enchufar el nodo en caliente (un solo comando):
docker compose up -d seedbeds_node

# 3. Refrescar el navegador:
# → Aparece "Semillero (demo)" en el sidebar con dos pantallas generadas
#   automáticamente (navegador CRUD y tabla de alta masiva).
# → En el dashboard de Traefik (http://localhost:8080) se ve el router nuevo
#   de /api/seed_batches apuntando al contenedor uniback_seedbeds.
```

Comprobaciones útiles durante la demo:

```bash
# El nodo responde a través del gateway:
curl http://localhost:8000/api/seed_batches/

# Logs del nodo (se ve el sembrado y las peticiones llegando a ESTE nodo):
docker logs -f uniback_seedbeds
```

## Resetear la demo (para poder repetirla)

Los datos y el menú persisten en el volumen de Postgres, así que para volver al
estado "sin semillero":

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

(Refrescar el navegador: la sección desaparece del sidebar.)
