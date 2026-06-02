"""
Plugin de ejemplo: aplicación de plantas geolocalizadas.

Demuestra cómo construir una app de dominio sobre el micronúcleo de uniback
SIN tocar el núcleo: basta con dejar este paquete dentro de ``src/plugins/``.

El plugin aporta:
  * Un modelo SQLAlchemy (``Plant``) que hereda de ``FunctionalObject``.
  * Un CRUD REST completo generado por ``make_simple_rest_crud`` (lista, alta,
    edición, borrado, ``/schema.json`` y ``/bulk``).
  * Pistas de UI para el mapa vía ``get_field_widgets`` (extensión inyectable).
  * Datos semilla (tipo de objeto + plantas de ejemplo) vía ``on_seed``.

Una vez cargado, la entidad ``plants`` queda registrada en el ``schema_registry``
y el frontend obtiene gratis: formulario dinámico (``/plants/schema.json``),
pantallas sintéticas (``/d/plants_browser``, ``/d/plants_form``,
``/d/plants_editable_table``) y el cliente genérico ``EntityClient``.
"""
