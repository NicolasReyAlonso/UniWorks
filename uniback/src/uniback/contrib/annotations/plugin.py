"""
Plugin de serie del sistema de anotaciones: formularios (definiciones) e
instancias de anotacion sobre FunctionalObject.

Ademas de modelos y routers, registra sus entidades CRUDIE en el registro
extensible del kernel (``uniback.api.crudie.register_crudie_entity``) con
loaders perezosos: el kernel no conoce el dominio, solo resuelve prefijos.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter
from sqlalchemy.orm import Session

from uniback.api.crudie import register_crudie_entity
from uniback.plugins.base import UnibackPlugin

_OBJECT_TYPES = [
    ("annotation_item", "848b46b0-8602-42a2-a3fd-1b9be728d729"),
    ("annotation_template", "79668ea7-80fa-4327-a433-721a69582542"),
    ("annotation_field", "35313fd1-484e-48af-b6e2-e4b7464abb64"),
    ("annotation_text", "dc50990e-f4ad-4ef3-80c8-f68fd0b1a412"),
]


def _register_crudie_entities() -> None:
    def _orm(name):
        def loader():
            import uniback.contrib.annotations.models as m
            return getattr(m, name)
        return loader

    def _service(module, name="Service"):
        def loader():
            import importlib
            m = importlib.import_module(f"uniback.contrib.annotations.forms.{module}")
            return getattr(m, name)
        return loader

    register_crudie_entity("form_template", _orm("AnnotationFormTemplate"), _service("templates"))
    register_crudie_entity("form_field", _orm("AnnotationFormField"), _service("fields"))
    register_crudie_entity("form_relationship", _orm("AnnotationFormTemplateField"),
                           _service("relationships", "FormRelationshipService"))
    register_crudie_entity("annotation", _orm("AnnotationItem"), _service("annotations"))
    register_crudie_entity("annotation_template", _orm("AnnotationTemplate"))
    register_crudie_entity("annotation_field", _orm("AnnotationField"))
    register_crudie_entity("annotation_text", _orm("AnnotationText"))
    register_crudie_entity("relationship", _orm("AnnotationRelationship"),
                           _service("relationships", "RelationshipService"))


class AnnotationsPlugin(UnibackPlugin):
    name = "uniback.annotations"
    description = "Sistema de anotaciones (formularios e instancias)"
    version = "1.0.0"

    node_types = {"annotations"}
    seed_priority = 50
    openapi_tags = [
        {"name": "Annotations", "description": "Annotation templates and instances"},
    ]

    def __init__(self) -> None:
        # En el momento de descubrir el plugin registramos los loaders CRUDIE:
        # son perezosos, asi que no importan modelos todavia, pero quedan
        # disponibles en TODOS los nodos (el bundle de /sys/schemas del core
        # resuelve los ORMs de anotaciones a traves de ellos).
        _register_crudie_entities()

    def get_model_modules(self) -> List[str]:
        return ["uniback.contrib.annotations.models"]

    def get_routers(self) -> List[APIRouter]:
        from uniback.contrib.annotations.routers import router

        return [router]

    def on_seed(self, db: Session) -> None:
        from uniback.persistence.models.core import data_object_type_id
        from uniback.persistence.models.sysadmin import ObjectType
        from uniback.persistence.seeding import load_table_extended

        object_types = [
            (data_object_type_id[name], uid, name) for name, uid in _OBJECT_TYPES
        ]
        load_table_extended(db, ObjectType, ["id", "uuid", "name"], object_types)
