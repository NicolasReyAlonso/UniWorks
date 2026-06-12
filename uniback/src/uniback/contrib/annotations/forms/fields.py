from . import FormItemService
from uniback.api.crudie import get_orm, get_or_create
from uniback.persistence.query import filter_parse
from uniback.utils.common import listify
from uniback.contrib.annotations.models import AnnotationFormTemplate, AnnotationFormTemplateField

class Service(FormItemService):
    def __init__(self, sess):
        super().__init__(sess)
        self.orm = get_orm('form_fields')

    def prepare_external_values(self, **kwargs) -> dict:
        template = kwargs.get('template')
        values = super().prepare_external_values(**kwargs)
        if template is not None and not values.get('template_id'):
            from sqlalchemy import select
            stmt = select(AnnotationFormTemplate.id).where(AnnotationFormTemplate.name.in_(listify(template)))
            values['template_id'] = self.db.execute(stmt).scalars().all()
        return values

    def after_create(self, new_object, **values):
        super().after_create(new_object, **values)
        if values.get('template_id'):
            ids = listify(values.get('template_id'))
            for i in ids:
                get_or_create(self.db, AnnotationFormTemplateField,
                              form_field_id=new_object.id, form_template_id=i, rank=0)
        return values

    def after_update(self, new_object, **values) -> dict:
        super().after_update(new_object, **values)
        if values.get('template_id') is not None:
            from sqlalchemy import delete
            ids = listify(values.get('template_id'))
            stmt = delete(AnnotationFormTemplateField).where(
                AnnotationFormTemplateField.form_field_id == new_object.id,
                AnnotationFormTemplateField.form_template_id.notin_(ids)
            )
            self.db.execute(stmt)
            for i in ids:
                get_or_create(self.db, AnnotationFormTemplateField,
                              form_field_id=new_object.id, form_template_id=i, rank=0)
        return values

    def aux_filter(self, _filter: dict) -> list:
        clauses = []
        template_id = _filter.get('template_id', _filter.get('form_template_id', _filter.get('annotation_form_template_id')))
        if template_id:
            from sqlalchemy import select
            sub_stmt = select(AnnotationFormTemplateField.form_field_id).where(
                filter_parse(AnnotationFormTemplateField, {'form_template_id': template_id})
            )
            clauses.append(self.orm.id.in_(sub_stmt))
        return clauses + super().aux_filter(_filter)
