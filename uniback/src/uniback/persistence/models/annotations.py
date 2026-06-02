from __future__ import annotations

"""
Annotation System Models.

The system is divided into two main layers:
1. Form Layer (Definitions): Defines the types of metadata that can be collected.
   - AnnotationFormItem (base)
   - AnnotationFormField (individual fields)
   - AnnotationFormTemplate (groups of fields)

2. Instance Layer (Data): Stores the actual values attached to domain objects.
   - AnnotationItem (base, inherits from FunctionalObject)
   - AnnotationText (simple text)
   - AnnotationField (field values)
   - AnnotationTemplate (template values)

Special Classes:
- AnnotationItemFunctionalObject: Links AnnotationItems to domain FunctionalObjects (Many-to-Many).
- AnnotationFormItemObjectType: Specifies which annotations are applicable to which object types.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from uniback.persistence.base import JSONB, ORMBase, get_table_prefix
from uniback.persistence.models.core import (
    FunctionalObject,
    ObjectType,
    class_to_object_type_id,
    data_object_type_id,
)
from uniback.persistence.models.files import File


def _tn(name: str) -> str:
    """Apply global table prefix to a table name."""

    return f"{get_table_prefix()}{name}"


# =============================================================================
# FORM DEFINITIONS (BLUEPRINTS)
# =============================================================================


class AnnotationFormItem(ORMBase):
    """
    Base class for annotation definitions.
    
    Contains common metadata like name and description for both
    individual fields and templates.
    """

    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_form_item")

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    annotation_type: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str | None] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(String(255))
    default_value: Mapped[dict | None] = mapped_column(JSONB)
    standard: Mapped[bool] = mapped_column(Boolean, default=False)
    creation_time: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    object_types: Mapped[list["AnnotationFormItemObjectType"]] = relationship(
        "AnnotationFormItemObjectType",
        back_populates="form_item",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("name", "standard", "annotation_type", name=__tablename__ + "_c1"),
    )

    __mapper_args__ = {
        "polymorphic_identity": "annotation_form_item",
        "polymorphic_on": annotation_type,
    }


class AnnotationFormItemObjectType(ORMBase):
    """
    Mapping table that defines which annotations apply to which ObjectTypes.
    
    Example: Specifies that 'Leaf Shape' annotation is valid for 'Specimen' objects.
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_form_item_object_types")

    form_item_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_form_item')}.id", ondelete="CASCADE"),
        primary_key=True,
    )
    object_type_id: Mapped[int] = mapped_column(
        ForeignKey(ObjectType.id, ondelete="CASCADE"),
        primary_key=True,
    )

    form_item: Mapped[AnnotationFormItem] = relationship(
        AnnotationFormItem, back_populates="object_types"
    )
    object_type: Mapped[ObjectType] = relationship(ObjectType)


class AnnotationFormField(AnnotationFormItem):
    """
    Definition of a single data field (e.g., 'Color', 'pH', 'Length').
    
    Includes validation rules (range) and UI rendering hints (view_type).
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_form_field")
    __mapper_args__ = {"polymorphic_identity": "annotation-form-field"}

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_form_item')}.id", ondelete="CASCADE"),
        primary_key=True,
    )
    range: Mapped[dict | None] = mapped_column(JSONB)
    view_type: Mapped[str | None] = mapped_column(String(32), default="annotation-text")
    schema: Mapped[dict | None] = mapped_column(JSONB)

    annotation_form_templates: Mapped[list["AnnotationFormTemplateField"]] = relationship(
        "AnnotationFormTemplateField",
        back_populates="form_field",
        cascade="all, delete-orphan",
    )

    annotation_items: Mapped[list["AnnotationField"]] = relationship(
        "AnnotationField", back_populates="form_field"
    )


class AnnotationFormTemplate(AnnotationFormItem):
    """
    Definition of a group of fields that belong together (e.g., 'Sampling Protocol').
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_form_template")
    __mapper_args__ = {"polymorphic_identity": "form-template"}

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_form_item')}.id", ondelete="CASCADE"),
        primary_key=True,
    )

    form_fields: Mapped[list["AnnotationFormTemplateField"]] = relationship(
        "AnnotationFormTemplateField",
        back_populates="form_template",
        cascade="all, delete-orphan",
    )


class AnnotationFormTemplateField(ORMBase):
    """
    Association table linking Fields to Templates.
    
    Determines the selection and ordering (rank) of fields within a template.
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_form_template_field")

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    form_template_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_form_template')}.id"), nullable=False
    )
    form_template: Mapped[AnnotationFormTemplate] = relationship(
        AnnotationFormTemplate, back_populates="form_fields"
    )

    form_field_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_form_field')}.id"), nullable=False
    )
    form_field: Mapped[AnnotationFormField] = relationship(
        AnnotationFormField, back_populates="annotation_form_templates"
    )

    rank: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("form_template_id", "rank", name=__tablename__ + "_c1"),
    )


# =============================================================================
# ANNOTATION INSTANCES (DATA)
# =============================================================================


class AnnotationItem(FunctionalObject):
    """
    Base class for actual annotation data instances.
    
    Inherits from FunctionalObject, meaning every annotation has its own
    identity, ownership, and history.
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_item")
    __mapper_args__ = {"polymorphic_identity": data_object_type_id["annotation_item"]}

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('functional_objects')}.id"), primary_key=True
    )
    annotation_type: Mapped[str | None] = mapped_column(String(80))
    file_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(File.id), nullable=True
    )
    file: Mapped[File | None] = relationship(File, foreign_keys=[file_id])

    objects: Mapped[list["AnnotationItemFunctionalObject"]] = relationship(
        "AnnotationItemFunctionalObject",
        back_populates="annotation_item",
        cascade="all, delete-orphan",
    )


class AnnotationItemFunctionalObject(ORMBase):
    """
    Many-to-Many association linking Annotations to domain Objects.
    
    This allows a single annotation to be attached to multiple files or objects,
    and a single object to have multiple annotations.
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_item_functional_object")

    annotation_item_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_item')}.id", ondelete="CASCADE"),
        primary_key=True,
    )
    functional_object_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('functional_objects')}.id", ondelete="CASCADE"),
        primary_key=True,
    )

    annotation_item: Mapped[AnnotationItem] = relationship(
        AnnotationItem, back_populates="objects", foreign_keys=[annotation_item_id]
    )
    functional_object: Mapped[FunctionalObject] = relationship(
        FunctionalObject, foreign_keys=[functional_object_id]
    )


class AnnotationText(AnnotationItem):
    """
    Instance of a simple free-text annotation.
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_text")
    __mapper_args__ = {"polymorphic_identity": data_object_type_id["annotation_text"]}

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_item')}.id", ondelete="CASCADE"), primary_key=True
    )
    value: Mapped[str | None] = mapped_column(String(4096))


class AnnotationTemplate(AnnotationItem):
    """
    Instance of an annotation template.
    
    Stores values for a group of fields defined by an AnnotationFormTemplate,
    typically in a JSONB dictionary.
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_template")
    __mapper_args__ = {"polymorphic_identity": data_object_type_id["annotation_template"]}

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_item')}.id", ondelete="CASCADE"), primary_key=True
    )
    form_template_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_form_template')}.id", ondelete="CASCADE"), nullable=False
    )
    form_template: Mapped[AnnotationFormTemplate] = relationship(AnnotationFormTemplate)
    value: Mapped[dict | None] = mapped_column(JSONB)

    __table_args__ = (
        UniqueConstraint(
            "form_template_id",
            "value",
            name=__tablename__ + "_c1",
        ),
    )


class AnnotationField(AnnotationItem):
    """
    Instance of a single annotation field.
    
    Links to an AnnotationFormField definition and stores the provided value.
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_field")
    __mapper_args__ = {"polymorphic_identity": data_object_type_id["annotation_field"]}

    id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_item')}.id", ondelete="CASCADE"), primary_key=True
    )
    form_field_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_form_field')}.id", ondelete="CASCADE"), nullable=False
    )
    form_field: Mapped[AnnotationFormField] = relationship(
        AnnotationFormField, back_populates="annotation_items"
    )
    value: Mapped[dict | None] = mapped_column(JSONB)

    __table_args__ = (
        UniqueConstraint(
            "form_field_id",
            "value",
            name=__tablename__ + "_c1",
        ),
    )


class AnnotationRelationship(ORMBase):
    """
    Instance of a relationship between two FunctionalObjects.
    
    Unlike standard annotations that describe one object, this describes
    a link between a 'subject' and an 'object' (e.g., 'Specimen A is part of Project B').
    """
    __versioned__ = {}
    __tablename__ = _tn("sa_annotation_relationship")

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    subject_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('functional_objects')}.id", ondelete="CASCADE"),
        nullable=False,
    )
    object_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('functional_objects')}.id", ondelete="CASCADE"),
        nullable=False,
    )
    form_rl_id: Mapped[int] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_form_template_field')}.id", ondelete="CASCADE"),
        nullable=False,
    )
    form_rev_rl_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{_tn('sa_annotation_form_template_field')}.id"),
        nullable=True,
    )
    value: Mapped[dict | None] = mapped_column(JSONB)

    subject: Mapped[FunctionalObject] = relationship(
        FunctionalObject,
        foreign_keys=[subject_id],
        backref=backref("related_objects", cascade="all, delete-orphan"),
    )
    object: Mapped[FunctionalObject] = relationship(
        FunctionalObject,
        foreign_keys=[object_id],
        backref=backref("related_subjects", cascade="all, delete-orphan"),
    )
    form_rl: Mapped[AnnotationFormTemplateField] = relationship(
        AnnotationFormTemplateField, foreign_keys=[form_rl_id]
    )
    form_rev_rl: Mapped[AnnotationFormTemplateField | None] = relationship(
        AnnotationFormTemplateField, foreign_keys=[form_rev_rl_id]
    )

    __table_args__ = (
        UniqueConstraint(
            "subject_id",
            "object_id",
            "form_rl_id",
            name=__tablename__ + "_c1",
        ),
    )


# Register object type mappings for FunctionalObject descendants
class_to_object_type_id.update(
    {
        AnnotationItem: data_object_type_id["annotation_item"],
        AnnotationTemplate: data_object_type_id["annotation_template"],
        AnnotationText: data_object_type_id["annotation_text"],
        AnnotationField: data_object_type_id["annotation_field"],
    }
)