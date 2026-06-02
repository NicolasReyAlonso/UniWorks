from ...api.crudie import BasicService, get_orm
from sqlalchemy import select
from ...persistence.models.annotations import AnnotationFormTemplate, AnnotationFormField
from ...persistence.models.core import FunctionalObject

class FormRelationshipService(BasicService):
    def __init__(self, sess):
        super().__init__(sess)
        self.orm = get_orm('form_relationship')

    def prepare_values(self, **values) -> dict:
        template = values.get('template') or values.pop('form_template', None)
        field = values.get('field') or values.pop('form_field', None)

        if template and not values.get('form_template_id'):
            stmt = select(AnnotationFormTemplate.id).where(AnnotationFormTemplate.name == template)
            res = self.db.execute(stmt).scalar_one_or_none()
            if res: values['form_template_id'] = res

        if field and not values.get('form_field_id'):
            stmt = select(AnnotationFormField.id).where(AnnotationFormField.name == field)
            res = self.db.execute(stmt).scalar_one_or_none()
            if res: values['form_field_id'] = res

        return super().prepare_values(**values)

class RelationshipService(BasicService):
    def __init__(self, sess):
        super().__init__(sess)
        self.orm = get_orm('relationship')

    def prepare_values(self, **values) -> dict:
        subject_uuid = values.get('subject_uuid')
        object_uuid = values.get('object_uuid')

        if subject_uuid and not values.get('subject_id'):
            stmt = select(FunctionalObject.id).where(FunctionalObject.uuid == subject_uuid)
            res = self.db.execute(stmt).scalar_one_or_none()
            if res: values['subject_id'] = res

        if object_uuid and not values.get('object_id'):
            stmt = select(FunctionalObject.id).where(FunctionalObject.uuid == object_uuid)
            res = self.db.execute(stmt).scalar_one_or_none()
            if res: values['object_id'] = res

        return super().prepare_values(**values)
