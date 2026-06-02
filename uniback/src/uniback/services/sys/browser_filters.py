from typing import Any, Tuple, Dict, List
from sqlalchemy import select, func
from . import SysService
from ...api.crudie import get_orm

# Constants for hierarchy names (ported from bcs-backend rest)
H_SUBJECTS_NAME = "Temas"
H_SOURCES_NAME = "Fuentes"
H_CRS_NAME = "CRS"

class Service(SysService):
    def __init__(self, sess):
        super().__init__(sess)
        self.orm = get_orm('browser_filter')

    def check_values(self, **values) -> dict:
        if not values.get('name') or not values.get('object_type'):
            raise ValueError("Browser filter must have a name and an object_type")
        return super().check_values(**values)

    def after_create(self, new_object, **values):
        # Set the owner of the filter to the current identity
        new_object.user_id = self.sess.identity_id
        return super().after_create(new_object, **values)

class FormService(SysService):
    def __init__(self, sess):
        super().__init__(sess)
        self.orm = get_orm('browser_filter_form')

    def read(self, **kwargs) -> Tuple[Any, int]:
        # Generate the filter schema for the requested object type
        subject = kwargs.get('object_type')
        schema = get_filter_schema(subject, self.db)
        return schema, 1

# =============================================================================
# FILTER SCHEMA GENERATION (Ported from filter_forms.py and filter_json.py)
# =============================================================================

def _get_seqlen(s): return True if s and any(s.startswith(x) for x in ('sequence', 'feature', 'alignment')) else []
def _get_annotation_fields(s): return True if s and any(s.startswith(x) for x in ('sequence', 'feature', 'alignment', 'analysis', 'individual', 'stock')) else []
def _get_analyses(s): return True if s and any(s.startswith(x) for x in ('sequence', 'feature', 'alignment', 'analysis', 'analyses', 'phylotree')) else []
def _get_organisms(s): return True if s and any(s.startswith(x) for x in ('sequence', 'feature', 'alignment', 'analysis', 'analyses', 'phylotree', 'individual', 'stock', 'taxonomy', 'organism')) else []
def _get_taxnodes(s): return True if s and any(s.startswith(x) for x in ('sequence', 'feature')) else []
def _get_annotation_form_templates(s): return True if s and any(s.startswith(x) for x in ('sequence', 'feature', 'alignment', 'analysis', 'individual', 'stock', 'annotation_form_field')) else []
def _get_annotation_form_fields(s): return True if s and any(s.startswith(x) for x in ('sequence', 'feature', 'alignment', 'analysis', 'individual', 'stock', 'annotation_form_template')) else []

def get_filter_schema(subject: str, session) -> List[Dict[str, Any]]:
    """Generates a Formly-compatible JSON schema for filters based on the subject."""
    
    kwargs = {
        'case_studies': True, 
        'collections': True, 
        'seqlen': _get_seqlen(subject),
        'annotation_fields': _get_annotation_fields(subject), 
        'analyses': _get_analyses(subject),
        'organisms': _get_organisms(subject), 
        'tax_nodes': _get_taxnodes(subject)
    }

    if subject and subject.startswith('organism'):
        kwargs['organisms'] = []

    if subject and subject.startswith('sequence'):
        kwargs['is_analysis'] = [
            {'label': 'FILTER.FORM.IS_ANALYSIS.TRUE', 'value': True},
            {'label': 'FILTER.FORM.IS_ANALYSIS.FALSE', 'value': False}
        ]
    elif kwargs.get('analyses'):
        kwargs['programs'] = True
        kwargs['programversions'] = True
        kwargs['algorithms'] = True
        if subject in ('alignment', 'analysis', 'alignments', 'analyses'):
            kwargs['analyses'] = []

    kwargs.update({
        'annotation_form_templates': _get_annotation_form_templates(subject),
        'annotation_form_fields': _get_annotation_form_fields(subject)
    })

    if subject and subject.startswith('annotation_form_'):
        from ...persistence.models.annotations import AnnotationFormItem
        orm_cls = AnnotationFormItem
        if subject.startswith('annotation_form_template'):
            from ...persistence.models.annotations import AnnotationFormTemplate
            orm_cls = AnnotationFormTemplate
        elif subject.startswith('annotation_form_field'):
            from ...persistence.models.annotations import AnnotationFormField
            orm_cls = AnnotationFormField
        
        stmt = select(orm_cls.standard).distinct()
        standards = session.execute(stmt).scalars().all()
        kwargs['standards'] = [{'label': str(s), 'value': s} for s in standards]

    elif subject == "layers":
        from ...persistence.models.hierarchies import Hierarchy, HierarchyNode
        from ...persistence.models.core import CaseStudy
        
        def get_nodes(h_name):
            stmt = select(HierarchyNode).join(Hierarchy).where(Hierarchy.name == h_name)
            return session.execute(stmt).scalars().all()

        for key, h_name, label in [
            ("subjects", H_SUBJECTS_NAME, "Temas:"),
            ("sources", H_SOURCES_NAME, "Fuentes:"),
            ("crs", H_CRS_NAME, "CRS:")
        ]:
            nodes = get_nodes(h_name)
            kwargs[key] = {
                'key': key,
                'type': 'customSelect',
                'templateOptions': {
                    'nzMode': 'multiple' if key == "subjects" else 'default',
                    'label': label,
                    'nzAllowClear': True,
                    'nzShowSearch': True,
                    'value': [],
                    'options': [dict(label=n.name, value=n.id) for n in nodes]
                }
            }
            
        case_studies = session.execute(select(CaseStudy)).scalars().all()
        kwargs["case_studies_"] = {
            'key': 'case_studies_',
            'type': 'customSelect',
            'templateOptions': {
                'nzMode': 'multiple',
                'label': 'Casos de estudio:',
                'nzAllowClear': True,
                'nzShowSearch': True,
                'value': [],
                'options': [dict(label=cs.name, value=cs.id) for cs in case_studies]
            }
        }

    return get_json_schema(**kwargs)

# Logic consolidated from filter_json.py

DATETIME_FILTER_FIELDS = [{
    'key': 'added-from',
    'type': 'customInput',
    'props': {'type': 'date', 'label': 'FILTER.FORM.DATETIME_LABEL.ADDED_FROM.LABEL', 'filterStyle': True},
}, {
    'key': 'added-to',
    'type': 'customInput',
    'props': {'type': 'date', 'label': 'FILTER.FORM.DATETIME_LABEL.ADDED_TO.LABEL', 'filterStyle': True}
}, {
    'key': 'lastmodified-from',
    'type': 'customInput',
    'props': {'type': 'date', 'label': 'FILTER.FORM.DATETIME_LABEL.MODIFIED_FROM.LABEL', 'filterStyle': True},
}, {
    'key': 'lastmodified-to',
    'type': 'customInput',
    'props': {'type': 'date', 'label': 'FILTER.FORM.DATETIME_LABEL.MODIFIED_TO.LABEL', 'filterStyle': True}
}]

FORMLY_CONFIG = {
    'case_studies': {
        'key': 'case_study_id', 'type': 'select-lazy-loading',
        'props': {
            'label': 'FILTER.FORM.CASE_STUDIES.LABEL', 'object_type': 'case_study', 'multiple': True, 
            'customParams': {'order': {'field': 'name', 'order': 'asc'}},
            'variableValue': 'id', 'variableLabel': 'name', 'filterStyle': True,
        }
    },
    'collections': {
        'key': 'collection_id', 'type': 'select-lazy-loading',
        'props': {
            'label': 'FILTER.FORM.COLLECTIONS.LABEL', 'object_type': 'collection', 'multiple': True, 
            'customParams': {'order': {'field': 'name', 'order': 'asc'}},
            'variableValue': 'id', 'variableLabel': 'name', 'filterStyle': True,
        }
    },
    'is_analysis': {
        'key': 'is_analysis', 'type': 'customSelect', 'defaultValue': False,
        'props': {'label': 'FILTER.FORM.IS_ANALYSIS.LABEL', 'options': [], 'filterStyle': True}
    },
    'standards': {
        'key': 'standard', 'type': 'customSelect',
        'props': {'label': 'FILTER.FORM.STANDARDS.LABEL', 'nzMode': 'multiple', 'options': [], 'filterStyle': True}
    },
    'annotation_form_templates': {
        'key': 'annotation_form_template_id', 'type': 'select-lazy-loading',
        'props': {
            'label': 'FILTER.FORM.ANNOTATION_FORM_TEMPLATES.LABEL', 'object_type': 'annotation_form_template', 
            'multiple': True, 'customParams': {'order': [{'field': 'standard', 'order': 'asc'}, {'field': 'name', 'order': 'asc'}]},
            'variableGroup': 'standard', 'variableValue': 'id', 'variableLabel': 'name', 'filterStyle': True
        }
    },
    'annotation_form_fields': {
        'key': 'annotation_form_field_id', 'type': 'select-lazy-loading',
        'props': {
            'label': 'FILTER.FORM.ANNOTATION_FORM_FIELDS.LABEL', 'object_type': 'annotation_form_field', 
            'multiple': True, 'customParams': {'order': [{'field': 'standard', 'order': 'asc'}, {'field': 'name', 'order': 'asc'}]},
            'variableGroup': 'standard', 'variableValue': 'id', 'variableLabel': 'name', 'filterStyle': True
        }
    },
    'annotation_fields': {
        'key': 'annotation_field_id', 'type': 'select-lazy-loading',
        'props': {
            'label':  'FILTER.FORM.ANNOTATION_FIELDS.LABEL', 'object_type': 'annotation', 'multiple': True, 
            'customFilter': {'annotation_type': 'field'},
            'customParams': {'order': [{'field': 'form_field_id', 'order': 'asc'}, {'field': 'value', 'order': 'asc'}]},
            'variableGroup': 'form_field_name', 'variableValue': 'id', 'variableLabel': 'value', 'filterStyle': True
        }
    },
    'organisms': {
        'key': 'organism_id', 'type': 'select-lazy-loading',
        'props': {
            'label': 'FILTER.FORM.ORGANISMS.LABEL', 'object_type': 'organism', 'multiple': True, 
            'customFilter': {'genus': {'op': 'ne', 'unary': ''}},
            'customParams': {'order': [{'field': 'genus', 'order': 'asc'}, {'field': 'name', 'order': 'asc'}]},
            'variableGroup': 'genus', 'variableValue': 'organism_id', 'variableLabel': 'name', 'filterStyle': True
        }
    },
    'tax_nodes': {
        'key': 'tax_node_id', 'type': 'select-lazy-loading',
        'props': {
            'label': 'FILTER.FORM.TAX_NODES.LABEL', 'object_type': 'organism', 'multiple': True, 
            'customFilter': {'genus': ''},
            'customParams': {'order': [{'field': 'type_id', 'order': 'asc'}, {'field': 'name', 'order': 'asc'}]},
            'variableGroup': 'type', 'variableValue': 'organism_id', 'variableLabel': 'name', 'filterStyle': True
        }
    },
    'analyses': {
        'key': 'analysis_id', 'type': 'select-lazy-loading',
        'props': {
            'label': 'FILTER.FORM.ANALYSES.LABEL', 'object_type': 'analysis', 'multiple': True, 
            'customParams': {'order': [{'field': 'program', 'order': 'asc'}, {'field': 'name', 'order': 'asc'}]},
            'variableGroup': 'program', 'variableValue': 'analysis_id', 'variableLabel': 'name', 'filterStyle': True
        }
    },
    'programs': {
        'key': 'program', 'type': 'select-lazy-loading',
        'props': {'label': 'FILTER.FORM.PROGRAMS.LABEL', 'object_type': 'analysis', 'multiple': True, 'variableValue': 'program', 'variableLabel': 'program', 'filterStyle': True}
    },
    'programversions': {
        'key': 'programversion', 'type': 'select-lazy-loading',
        'props': {
            'label': 'FILTER.FORM.PROGRAMVERSIONS.LABEL', 'object_type': 'analysis', 'multiple': True, 
            'customParams': {'order': [{'field': 'program', 'order': 'asc'}, {'field': 'name', 'order': 'asc'}]},
            'variableGroup': 'program', 'variableValue': 'programversion', 'variableLabel': 'programversion', 'filterStyle': True
        }
    },
    'algorithms': {
        'key': 'algorithm', 'type': 'select-lazy-loading',
        'props': {'label': 'FILTER.FORM.ALGORITHMS.LABEL', 'object_type': 'analysis', 'multiple': True, 'variableValue': 'algorithm', 'variableLabel': 'algorithm', 'filterStyle': True}
    },
    'seqlen': {
        "key": "seqlen", "type": "customRange", "defaultValue": (1, None),
        "props": {"label": "FILTER.FORM.SEQLEN.LABEL", "filterStyle": True}
    },
    'seqnum': {
        "key": "seqnum", "type": "customRange",
        "props": {"label": "FILTER.FORM.SEQNUM.LABEL", "filterStyle": True}
    }
}

def _get_json_filter(field_type, value):
    if field_type not in FORMLY_CONFIG:
        return None
    config = FORMLY_CONFIG[field_type].copy()
    config['props'] = config['props'].copy()
    config['props']['options'] = value
    return config

def get_json_schema(**kwargs) -> List[Dict]:
    schema = []
    for key, value in kwargs.items():
        if key not in FORMLY_CONFIG:
            if isinstance(value, dict) and 'key' in value:
                schema.append(value)
        elif value:
            if isinstance(value, list) and len(value) > 0:
                schema.append(_get_json_filter(key, value))
            elif value is True:
                schema.append(FORMLY_CONFIG[key])
    
    return [x for x in schema if x] + DATETIME_FILTER_FIELDS
