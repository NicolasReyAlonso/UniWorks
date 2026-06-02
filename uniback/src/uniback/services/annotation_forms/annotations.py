from typing import Any, Tuple, List
from sqlalchemy import select
from ...api.crudie import BasicService, get_orm, get_or_create
from ...persistence.models.core import FunctionalObject
from ...persistence.models.annotations import (
    AnnotationItemFunctionalObject, AnnotationFormTemplate, AnnotationFormField,
    AnnotationTemplate, AnnotationField
)
from ...persistence.query import filter_parse
from ...utils.common import listify

def annots2dict(*data):
    _res = []
    for d in data:
        if d.annotation_type == 'field':
            _res.append({d.form_field.name: d.value})
        elif d.annotation_type == 'template':
            _form_fields = {_.form_field.id: _.form_field.name for _ in d.form_template.form_fields}
            _res.append({d.form_template.name: {_form_fields[int(k)]: v for k, v in d.value.items()}})
    return _res

class Service(BasicService):
    def __init__(self, sess):
        super().__init__(sess)
        self.orm = get_orm('annotations')

    def prepare_values(self, **values) -> dict:
        template = values.get('template')
        field = values.get('field')
        form_template_val = values.pop('form_template', None)
        form_field_val = values.pop('form_field', None)
        if not template and isinstance(form_template_val, str):
            template = form_template_val
        if not field and isinstance(form_field_val, str):
            field = form_field_val

        if template and not values.get('form_template_id'):
            stmt = select(AnnotationFormTemplate).where(AnnotationFormTemplate.name == template)
            res = self.db.execute(stmt).scalar_one_or_none()
            if res: values['form_template_id'] = res.id

        if field and not values.get('form_field_id'):
            stmt = select(AnnotationFormField).where(AnnotationFormField.name == field)
            res = self.db.execute(stmt).scalar_one_or_none()
            if res: values['form_field_id'] = res.id

        return super().prepare_values(**values)

    def after_create(self, new_object, **values):
        if values.get('object_uuid'):
            uuids = listify(values.get('object_uuid'))
            stmt = select(FunctionalObject.id).where(FunctionalObject.uuid.in_(uuids))
            fo_ids = self.db.execute(stmt).scalars().all()
            for fo_id in fo_ids:
                get_or_create(self.db, AnnotationItemFunctionalObject,
                              annotation_item_id=new_object.id, functional_object_id=fo_id)
        return values

    def aux_filter(self, _filter: dict) -> list:
        clauses = []
        if _filter.get('object_uuid'):
            sub_stmt = select(AnnotationItemFunctionalObject.annotation_item_id).join(
                FunctionalObject, AnnotationItemFunctionalObject.functional_object_id == FunctionalObject.id
            ).where(FunctionalObject.uuid.in_(listify(_filter.get('object_uuid'))))
            clauses.append(self.orm.id.in_(sub_stmt))
        return clauses + super().aux_filter(_filter)

    def export_file(self, **kwargs):
        # Placeholder for export logic if needed
        return super().export_file(**kwargs)
