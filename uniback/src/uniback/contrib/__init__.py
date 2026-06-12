"""
Plugins de serie del framework (dominios funcionales sobre el micronucleo).

Cada subpaquete ``uniback.contrib.<dominio>`` es un plugin autocontenido con
``plugin.py`` (subclase de UnibackPlugin) y, segun el dominio, ``models.py``,
``routers.py``, ``service.py`` y ``seed.py``. Los descubre siempre
``PluginManager.discover_internal``; su actividad por nodo la decide
``UnibackPlugin.node_types`` frente a ``UNIBACK_NODE_TYPE``.
"""
