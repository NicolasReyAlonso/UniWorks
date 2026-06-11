"""
Soporte de tiempo real entre nodos: bus Socket.IO sobre Redis y presencia de
nodos por heartbeat.

El servidor Socket.IO al que se conectan los navegadores vive en el nodo que
recibe ``/socket.io/`` (el core, según las reglas de Traefik). Para que
CUALQUIER nodo pueda notificar a esos navegadores, todos los servidores
Socket.IO se crean con un ``AsyncRedisManager`` apuntando al mismo Redis: un
``emit`` publicado en el canal compartido lo reenvía a sus clientes el nodo que
los tenga conectados.

Sobre ese bus se construye la pieza que hace posible el hot-plug visible:

* ``start_node_presence(node_type)`` — el nodo enchufable arranca un hilo que
  refresca una clave Redis con TTL (heartbeat) y emite ``navigation_changed``
  al arrancar. Si el contenedor muere (aunque sea con kill -9), la clave
  expira sola.
* ``node_is_alive(node_type)`` — lo usa ``/gui/navigation`` para ocultar los
  menús marcados con ``definition.requires_node`` cuando su nodo no está vivo.
* ``start_presence_watcher()`` — el nodo core vigila el conjunto de nodos
  vivos y emite ``navigation_changed`` cuando cambia (alta o caída), de modo
  que el sidebar de los navegadores se refresca solo, sin recargar la página.
"""

from __future__ import annotations

import logging
import threading
import time

log = logging.getLogger(__name__)

_PRESENCE_KEY = "uniback:node:{}:alive"
_PRESENCE_PATTERN = "uniback:node:*:alive"

_emitter = None
_emitter_lock = threading.Lock()


def redis_url() -> str:
    """Construye la URL de Redis a partir de los settings globales."""
    from uniback.config.settings import get_settings

    r = get_settings().redis
    auth = f":{r.password}@" if r.password else ""
    return f"redis://{auth}{r.host}:{r.port}/{r.db}"


def _get_emitter():
    """Cliente Socket.IO de solo escritura sobre el canal Redis compartido.

    Es la versión síncrona (``RedisManager``): publica con el mismo protocolo
    que consume el ``AsyncRedisManager`` de los servidores, así que sirve para
    emitir desde hilos y código no-async (seeds, heartbeats...).
    """
    global _emitter
    with _emitter_lock:
        if _emitter is None:
            import socketio

            _emitter = socketio.RedisManager(redis_url(), write_only=True)
    return _emitter


def emit_navigation_changed(reason: str = "") -> None:
    """Notifica a todos los navegadores que el árbol de navegación cambió.

    El front reacciona recargando el sidebar (sin refrescar la página).
    Nunca lanza: el tiempo real es best-effort y no debe tumbar un arranque.
    """
    try:
        _get_emitter().emit("navigation_changed", {"reason": reason})
        log.info("navigation_changed emitido (%s)", reason or "sin motivo")
    except Exception as e:
        log.warning("No se pudo emitir navigation_changed: %s", e)


# --------------------------------------------------------------------------- #
# Presencia de nodos (heartbeat con TTL en Redis)
# --------------------------------------------------------------------------- #

def node_is_alive(node_type: str) -> bool:
    """¿Hay algún nodo de este tipo latiendo ahora mismo?"""
    try:
        from uniback.utils.redis import get_redis_manager

        return bool(get_redis_manager().client.exists(_PRESENCE_KEY.format(node_type)))
    except Exception as e:
        # Sin Redis no hay presencia: mejor mostrar el menú que romper la
        # navegación entera.
        log.warning("No se pudo comprobar presencia de '%s': %s", node_type, e)
        return True


def alive_node_types() -> set[str]:
    """Conjunto de tipos de nodo con heartbeat activo."""
    from uniback.utils.redis import get_redis_manager

    keys = get_redis_manager().client.keys(_PRESENCE_PATTERN)
    return {k.split(":")[2] for k in keys}


def start_node_presence(node_type: str, interval: int = 3, ttl: int = 10) -> None:
    """Arranca el heartbeat de presencia de este nodo (hilo daemon).

    Tras el primer latido emite ``navigation_changed`` para que los menús que
    dependen de este nodo aparezcan en los navegadores ya conectados. La caída
    no necesita aviso desde aquí: la clave expira por TTL y el watcher del core
    emite el evento.
    """
    key = _PRESENCE_KEY.format(node_type)

    def beat() -> None:
        from uniback.utils.redis import get_redis_manager

        first = True
        while True:
            try:
                get_redis_manager().client.set(key, "1", ex=ttl)
                if first:
                    emit_navigation_changed(f"node '{node_type}' conectado")
                    first = False
            except Exception as e:
                log.warning("Heartbeat de '%s' falló: %s", node_type, e)
            time.sleep(interval)

    threading.Thread(target=beat, name=f"presence-{node_type}", daemon=True).start()
    log.info("Heartbeat de presencia iniciado para nodo '%s' (ttl=%ss)", node_type, ttl)


def start_presence_watcher(interval: int = 2) -> None:
    """Vigila el conjunto de nodos vivos y emite ``navigation_changed`` al
    cambiar (hilo daemon; pensado para el nodo core/monolith).

    Cubre el caso de caída que el propio nodo no puede notificar: cuando su
    clave de presencia expira, el watcher detecta la diferencia y avisa a los
    navegadores.
    """

    def watch() -> None:
        previous: set[str] | None = None
        while True:
            try:
                current = alive_node_types()
                if previous is not None and current != previous:
                    emit_navigation_changed(
                        f"nodos vivos: {sorted(current)} (antes: {sorted(previous)})"
                    )
                previous = current
            except Exception as e:
                log.warning("Watcher de presencia falló: %s", e)
            time.sleep(interval)

    threading.Thread(target=watch, name="presence-watcher", daemon=True).start()
    log.info("Watcher de presencia de nodos iniciado")
