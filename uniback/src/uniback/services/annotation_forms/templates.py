from . import FormItemService
from ...api.crudie import get_orm, get_or_create
from ...persistence.query import filter_parse
from ...utils.common import listify
from ...persistence.models.annotations import AnnotationFormField, AnnotationFormTemplateField

class Service(FormItemService):
    def __init__(self, sess):
        super().__init__(sess)
        self.orm = get_orm('form_templates')

    def prepare_external_values(self, **kwargs) -> dict:
        field = kwargs.get('field')
        required_field = kwargs.get('required_field')
        values = super().prepare_external_values(**kwargs)

        if field is not None and not values.get('field_id'):
            from sqlalchemy import select
            stmt = select(AnnotationFormField.id).where(AnnotationFormField.name.in_(listify(field)))
            values['field_id'] = self.db.execute(stmt).scalars().all()

        if required_field is not None and not values.get('required_field_id'):
            from sqlalchemy import select
            stmt = select(AnnotationFormField.id).where(AnnotationFormField.name.in_(listify(required_field)))
            values['required_field_id'] = self.db.execute(stmt).scalars().all()

        return values

    def after_create(self, new_object, **values):
        super().after_create(new_object, **values)

        if values.get('field_id'):
            ids = listify(values.get('field_id'))
            for i in ids:
                get_or_create(self.db, AnnotationFormTemplateField,
                              form_template_id=new_object.id, form_field_id=i, rank=0)

        if values.get('required_field_id'):
            ids = listify(values.get('required_field_id'))
            for i in ids:
                get_or_create(self.db, AnnotationFormTemplateField,
                              form_template_id=new_object.id, form_field_id=i, rank=0)
        return values

    def aux_filter(self, _filter: dict) -> list:
        clauses = []
        field_id = _filter.get('field_id', _filter.get('form_field_id', _filter.get('annotation_form_field_id')))
        if field_id:
            from sqlalchemy import select
            sub_stmt = select(AnnotationFormTemplateField.form_template_id).where(
                filter_parse(AnnotationFormTemplateField, {'form_field_id': field_id})
            )
            clauses.append(self.orm.id.in_(sub_stmt))
        return clauses + super().aux_filter(_filter)
