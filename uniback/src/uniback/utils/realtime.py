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

El mismo bus transporta los cambios de datos:

* ``install_entity_change_broadcast(session_factory)`` — engancha la factoría
  de sesiones para emitir ``entity_changed {entity, created, updated, deleted}``
  (solo ids, nunca datos) tras el commit RAÍZ de cualquier escritura sobre una
  entidad registrada. Las páginas abiertas (p.ej. el mapa de plantas) se
  refrescan solas cuando alguien, incluido el asistente, escribe.
"""

from __future__ import annotations

import logging
import queue
import threading
import time
from typing import Any

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


# --------------------------------------------------------------------------- #
# Cambios de entidades (evento ``entity_changed``)
# --------------------------------------------------------------------------- #

_PENDING_KEY = "uniback_entity_changes"
_KINDS = ("created", "updated", "deleted")

_change_queue: "queue.Queue[dict]" = queue.Queue(maxsize=1000)
_change_worker: threading.Thread | None = None
_change_worker_lock = threading.Lock()
_emit_failed = False


def _entity_names(obj: Any) -> list[str]:
    """Entidades registradas a las que pertenece ``obj``.

    Recorre el MRO: una ``Plant`` es también un ``FunctionalObject``, así que
    quien escucha ``functional_objects`` se entera de los cambios en plantas.
    """
    from uniback.api.schema_registry import all_entities

    by_class: dict[type, list[str]] = {}
    for name, reg in all_entities().items():
        if reg.orm_class is not None:
            by_class.setdefault(reg.orm_class, []).append(name)
    names: list[str] = []
    for cls in type(obj).__mro__:
        names.extend(by_class.get(cls, ()))
    return names


def _object_id(obj: Any) -> Any:
    from sqlalchemy import inspect

    pk = inspect(obj).mapper.primary_key_from_instance(obj)
    return pk[0] if len(pk) == 1 else tuple(pk)


def _real_transaction(transaction: Any) -> Any:
    """La transacción real (raíz o savepoint) que contiene a ``transaction``;
    las subtransacciones internas del flush se resuelven a su contenedora."""
    current = transaction
    while current is not None and not current.nested and current.parent is not None:
        current = current.parent
    return current


def _transaction_chain(session: Any) -> tuple:
    """Transacciones reales abiertas, de la más interna a la raíz."""
    chain = []
    current = _real_transaction(session.get_nested_transaction() or session.get_transaction())
    while current is not None:
        chain.append(current)
        current = _real_transaction(current.parent) if current.parent is not None else None
    return tuple(chain)


def _on_after_flush(session: Any, flush_context: Any) -> None:
    chain = _transaction_chain(session)
    pending = session.info.setdefault(_PENDING_KEY, [])
    groups = (
        ("created", list(session.new)),
        ("updated", [o for o in session.dirty if session.is_modified(o)]),
        ("deleted", list(session.deleted)),
    )
    for kind, objects in groups:
        for obj in objects:
            try:
                names = _entity_names(obj)
                if not names:
                    continue
                obj_id = _object_id(obj)
            except Exception:  # el tiempo real nunca rompe una escritura
                log.debug("entity_changed: no se pudo registrar %r", obj, exc_info=True)
                continue
            for name in names:
                pending.append((chain, name, kind, obj_id))


def _on_after_soft_rollback(session: Any, previous_transaction: Any) -> None:
    pending = session.info.get(_PENDING_KEY)
    if not pending:
        return
    rolled_back = _real_transaction(previous_transaction)
    # Se descarta lo escrito dentro de la transacción deshecha (y de sus
    # savepoints hijos); lo anterior al savepoint sigue pendiente.
    pending[:] = [entry for entry in pending if rolled_back not in entry[0]]


def _collect(pending: list) -> dict[str, dict[str, list]]:
    changes: dict[str, dict[str, set]] = {}
    for _chain, name, kind, obj_id in pending:
        entity = changes.setdefault(name, {k: set() for k in _KINDS})
        if kind == "created":
            entity["created"].add(obj_id)
        elif kind == "updated":
            if obj_id not in entity["created"]:
                entity["updated"].add(obj_id)
        elif obj_id in entity["created"]:
            # Creado y borrado en la misma transacción: nadie llegó a verlo.
            entity["created"].discard(obj_id)
        else:
            entity["updated"].discard(obj_id)
            entity["deleted"].add(obj_id)
    return {
        name: {k: sorted(ids, key=str) if any(not isinstance(i, int) for i in ids) else sorted(ids)
               for k, ids in entity.items()}
        for name, entity in changes.items()
        if any(entity.values())
    }


def _on_after_commit(session: Any) -> None:
    # ``after_commit`` salta también al liberar un savepoint: solo se emite
    # cuando se confirma la transacción raíz.
    if session.in_nested_transaction():
        return
    pending = session.info.pop(_PENDING_KEY, None)
    if not pending:
        return
    try:
        changes = _collect(pending)
        if changes:
            _dispatch_entity_changes(changes)
    except Exception:
        log.warning("entity_changed: fallo al difundir cambios", exc_info=True)


def _on_after_transaction_end(session: Any, transaction: Any) -> None:
    # Fin de la transacción raíz sin commit (close, rollback duro): nada
    # pendiente debe filtrarse a la transacción siguiente.
    if transaction.parent is None and not transaction.nested:
        session.info.pop(_PENDING_KEY, None)


def _dispatch_entity_changes(changes: dict[str, dict[str, list]]) -> None:
    """Encola los cambios confirmados para emitirlos fuera del hilo que hizo el
    commit: una petición nunca espera a Redis. Si la cola se llena se descarta
    (best-effort: los clientes solo pierden un refresco)."""
    _ensure_change_worker()
    try:
        _change_queue.put_nowait(changes)
    except queue.Full:
        log.warning("entity_changed: cola llena, cambios descartados")


def _ensure_change_worker() -> None:
    global _change_worker
    with _change_worker_lock:
        if _change_worker is None or not _change_worker.is_alive():
            _change_worker = threading.Thread(
                target=_drain_changes, name="entity-changes", daemon=True
            )
            _change_worker.start()


def _drain_changes() -> None:
    global _emit_failed
    while True:
        changes = _change_queue.get()
        try:
            emitter = _get_emitter()
            for entity, ids in changes.items():
                emitter.emit("entity_changed", {"entity": entity, **ids})
            _emit_failed = False
        except Exception as e:
            # Sin Redis no hay tiempo real; se avisa una vez y no en cada commit.
            log.log(logging.DEBUG if _emit_failed else logging.WARNING,
                    "No se pudo emitir entity_changed: %s", e)
            _emit_failed = True


def install_entity_change_broadcast(session_factory: Any) -> None:
    """Engancha ``session_factory`` (una ``sessionmaker``) para difundir los
    cambios de entidades registradas tras cada commit raíz. Idempotente."""
    from sqlalchemy import event

    # Cada ``sessionmaker`` crea su propia subclase de ``Session``: la marca se
    # guarda ahí. (``event.contains`` no sirve: su registro va por ``id()`` y
    # puede dar por instalada una factoría nueva que reutiliza la dirección de
    # otra ya destruida.)
    session_class = getattr(session_factory, "class_", session_factory)
    if vars(session_class).get("_uniback_entity_broadcast"):
        return
    event.listen(session_factory, "after_flush", _on_after_flush)
    event.listen(session_factory, "after_soft_rollback", _on_after_soft_rollback)
    event.listen(session_factory, "after_commit", _on_after_commit)
    event.listen(session_factory, "after_transaction_end", _on_after_transaction_end)
    session_class._uniback_entity_broadcast = True
