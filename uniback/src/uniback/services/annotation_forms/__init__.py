from typing import Any, Tuple, List
from sqlalchemy import select, delete
from ...api.crudie import BasicService, get_orm, get_or_create
from ...persistence.models.core import ObjectType
from ...persistence.models.annotations import AnnotationFormItemObjectType
from ...persistence.query import filter_parse
from ...utils.common import listify

class FormItemService(BasicService):
    def prepare_values(self, **values) -> dict:
        if values.get("type"):
            new_orm = get_orm(f'{values.get("type")}')
            if new_orm:
                self.orm = new_orm
        return super().prepare_values(**values)

    def prepare_external_values(self, **kwargs) -> dict:
        object_type = kwargs.get('object_type')
        values = super().prepare_external_values(**kwargs)
        if object_type and not values.get('object_type_id'):
            object_types = listify(object_type)
            stmt = select(ObjectType.id).where(ObjectType.name.in_(object_types))
            values['object_type_id'] = self.db.execute(stmt).scalars().all()
        return values

    def after_create(self, new_object, **values):
        if values.get('object_type_id'):
            ids = listify(values.get('object_type_id'))
            for i in ids:
                get_or_create(self.db, AnnotationFormItemObjectType,
                              form_item_id=new_object.id, object_type_id=i)
        return values

    def after_update(self, new_object, **values) -> dict:
        if values.get('object_type_id'):
            ids = listify(values.get('object_type_id'))
            stmt = delete(AnnotationFormItemObjectType).where(
                AnnotationFormItemObjectType.form_item_id == new_object.id,
                AnnotationFormItemObjectType.object_type_id.notin_(ids)
            )
            self.db.execute(stmt)
            for i in ids:
                get_or_create(self.db, AnnotationFormItemObjectType,
                              form_item_id=new_object.id, object_type_id=i)
        return values

    def aux_filter(self, _filter: dict) -> list:
        clauses = []
        if _filter.get('object_type') and not _filter.get('object_type_id'):
            stmt = select(ObjectType.id).where(filter_parse(ObjectType, {'name': _filter.get('object_type')}))
            _filter['object_type_id'] = {'op': 'in', 'value': stmt}
        if _filter.get('object_type_id'):
            sub_stmt = select(AnnotationFormItemObjectType.form_item_id).where(
                filter_parse(AnnotationFormItemObjectType, {'object_type_id': _filter.get('object_type_id')})
            )
            clauses.append(self.orm.id.in_(sub_stmt))
        return clauses + super().aux_filter(_filter)
