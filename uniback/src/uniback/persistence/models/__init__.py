"""
Pre-built ORM models for Uniback.

This module exports all model classes that can be used directly
or extended by the calling backend.
"""

from uniback.persistence.models.core import (
    ObjectType,
    FunctionalObject,
    Collection,
    CollectionDetail,
    data_object_type_id,
    class_to_object_type_id,
)
from uniback.persistence.models.sysadmin import (
    # Authentication
    Authenticator,
    IdentityAuthenticator,
    # Authorization
    Authorizable,
    Identity,
    IdentityStoreEntry,
    Organization,
    OrganizationIdentity,
    Group,
    GroupIdentity,
    Role,
    RoleIdentity,
    authorizable_type_id,
    # System Functions
    SystemFunction,
    SystemFunctionRelation,
    # Permissions
    PermissionType,
    ObjectTypePermissionType,
    ACL,
    ACLExpression,
    ACLDetail,
    # Tasks
    TaskStatus,
    SystemProcess,
    SystemProcessRuns,
    # Browser
    BrowserFilter,
)
from uniback.persistence.models.annotations import (
    # Form definitions
    AnnotationFormItem,
    AnnotationFormItemObjectType,
    AnnotationFormField,
    AnnotationFormTemplate,
    AnnotationFormTemplateField,
    # Annotation instances
    AnnotationItem,
    AnnotationItemFunctionalObject,
    AnnotationText,
    AnnotationTemplate,
    AnnotationField,
    AnnotationRelationship,
)
from uniback.persistence.models.hierarchies import (
    HierarchyType,
    Hierarchy,
    HierarchyLevel,
    HierarchyNode,
)
from uniback.persistence.models.geographics import (
    GeographicLayer,
    Grid,
)
from uniback.persistence.models.views_dashboards import (
    View,
    Dashboard,
)
from uniback.persistence.models.species import DwcTaxon

__all__ = [
    # Core
    "ObjectType",
    "FunctionalObject",
    "Collection",
    "CollectionDetail",
    "data_object_type_id",
    "class_to_object_type_id",
    # Authentication
    "Authenticator",
    "IdentityAuthenticator",
    # Authorization
    "Authorizable",
    "Identity",
    "IdentityStoreEntry",
    "Organization",
    "OrganizationIdentity",
    "Group",
    "GroupIdentity",
    "Role",
    "RoleIdentity",
    "authorizable_type_id",
    # System Functions
    "SystemFunction",
    "SystemFunctionRelation",
    # Permissions
    "PermissionType",
    "ObjectTypePermissionType",
    "ACL",
    "ACLExpression",
    "ACLDetail",
    # Tasks
    "TaskStatus",
    "SystemProcess",
    "SystemProcessRuns",
    # Browser
    "BrowserFilter",
    # Annotation Form definitions
    "AnnotationFormItem",
    "AnnotationFormItemObjectType",
    "AnnotationFormField",
    "AnnotationFormTemplate",
    "AnnotationFormTemplateField",
    # Annotation instances
    "AnnotationItem",
    "AnnotationItemFunctionalObject",
    "AnnotationText",
    "AnnotationTemplate",
    "AnnotationField",
    "AnnotationRelationship",
    # Hierarchies
    "HierarchyType",
    "Hierarchy",
    "HierarchyLevel",
    "HierarchyNode",
    # Geographics
    "GeographicLayer",
    "Grid",
    # Views/Dashboards
    "View",
    "Dashboard",
]
