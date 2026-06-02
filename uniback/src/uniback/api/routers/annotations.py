from fastapi import APIRouter
from ..crudie import make_crudie_rest_crud

router = APIRouter(tags=["Annotations"])

entities = [
    ('form_template', '/annotation_form_templates'),
    ('form_field', '/annotation_form_fields'),
    ('form_relationship', '/annotation_form_relationships'),
    ('annotations', '/annotations'),
    ('relationship', '/relationships')
]

for entity, path in entities:
    # We include each entity's router into the main annotations router
    router.include_router(make_crudie_rest_crud(entity, prefix=path, tags=["Annotations"]))
