"""
Plugin de serie de capas geograficas: GeographicLayer (hereda de Dataset) y
Grid. Sin routers propios todavia; aporta modelos y su semilla de object
types, permisos y ACL de referencia.
"""

from __future__ import annotations

from typing import List

from sqlalchemy.orm import Session

from uniback.plugins.base import UnibackPlugin

_OBJECT_TYPES = [
    ("geolayer", "b7c404e0-8b5d-4327-b830-85f8209c06e3"),
    ("grid", "ffb8e897-5df8-4a01-922c-7901b63ef325"),
]

_OBJECT_TYPE_PERMISSIONS = [
    ["geolayer", "view"], ["geolayer", "read"], ["geolayer", "export"],
    ["geolayer", "edit"], ["geolayer", "delete"], ["geolayer", "permissions"],
]


class GeographicsPlugin(UnibackPlugin):
    name = "uniback.geographics"
    description = "Capas geograficas y mallas"
    version = "1.0.0"

    node_types = {"core"}
    seed_priority = 50

    def get_model_modules(self) -> List[str]:
        return ["uniback.contrib.geographics.models"]

    def on_seed(self, db: Session) -> None:
        from uniback.contrib.geographics.models import GeographicLayer
        from uniback.persistence.models.core import data_object_type_id
        from uniback.persistence.models.sysadmin import (
            ObjectType,
            ObjectTypePermissionType,
            PermissionType,
        )
        from uniback.persistence.seeding import (
            create_or_update_acl_reference_object,
            load_many_to_many_table,
            load_table_extended,
        )

        object_types = [
            (data_object_type_id[name], uid, name) for name, uid in _OBJECT_TYPES
        ]
        load_table_extended(db, ObjectType, ["id", "uuid", "name"], object_types)
        load_many_to_many_table(
            db, ObjectTypePermissionType, ObjectType, PermissionType,
            ["object_type_id", "permission_type_id"], _OBJECT_TYPE_PERMISSIONS,
        )
        create_or_update_acl_reference_object(
            db, GeographicLayer, "d0f0ee40-7595-4581-8f5b-bccac087c8b9",
            [("role", "sys-admin", "read")],
        )
