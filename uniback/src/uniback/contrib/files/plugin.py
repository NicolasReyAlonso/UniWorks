"""
Plugin de serie del dominio de ficheros: arbol de carpetas/ficheros sobre
FunctionalObject y almacenes de contenido (FileSystemStorage).
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter
from sqlalchemy.orm import Session

from uniback.plugins.base import UnibackPlugin

# ObjectTypes propios del dominio (ids del mapa global data_object_type_id).
_OBJECT_TYPES = [
    ("file_system_object", "45f747dd-f4b3-4f0c-b2ec-b7d6bd36b070"),
    ("folder", "860fcfb0-b8a5-4b6e-a678-830c2c70f805"),
    ("file", "eafd228c-386a-4910-85c6-5edc188e6b41"),
]

_OBJECT_TYPE_PERMISSIONS = [
    ["folder", "read"], ["folder", "annotate"], ["folder", "create"],
    ["folder", "edit"], ["folder", "delete"],
    ["file", "read"], ["file", "annotate"], ["file", "create"],
    ["file", "edit"], ["file", "delete"],
]

_FILE_SYSTEM_STORAGES = [
    ("20fbce2d-17a6-400a-8a34-73a6fc07a098", "embedded"),
]


class FilesPlugin(UnibackPlugin):
    name = "uniback.files"
    description = "Sistema de ficheros y almacenes de contenido"
    version = "1.0.0"

    node_types = {"files"}
    seed_priority = 50
    openapi_tags = [
        {"name": "Files and File stores", "description": "File system and storage backend configurations"},
    ]

    def get_model_modules(self) -> List[str]:
        return ["uniback.contrib.files.models"]

    def get_routers(self) -> List[APIRouter]:
        from uniback.contrib.files.routers import router, router_file_stores

        return [router, router_file_stores]

    def on_seed(self, db: Session) -> None:
        from uniback.contrib.files.models import FileSystemStorage
        from uniback.persistence.models.core import data_object_type_id
        from uniback.persistence.models.sysadmin import (
            ObjectType,
            ObjectTypePermissionType,
            PermissionType,
        )
        from uniback.persistence.seeding import (
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
        load_table_extended(
            db, FileSystemStorage, ["uuid", "storage_type"], _FILE_SYSTEM_STORAGES,
        )
