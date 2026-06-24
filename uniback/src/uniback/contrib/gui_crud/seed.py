"""
Semilla del dominio GUI: pantallas y menus bootstrap (el frontend los pinta
dinamicamente con DynamicPageComponent), object types de UI y ACLs de
referencia de View/Dashboard.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from uniback.contrib.gui_crud.models import Dashboard, View
from uniback.persistence.models.core import data_object_type_id
from uniback.persistence.models.screens import AppFlavor, Menu, Screen, ScreenType
from uniback.persistence.models.sysadmin import ObjectType, ObjectTypePermissionType, PermissionType

# ---------------------------------------------------------------------------
# Dynamic Screens – the frontend will render these dynamically
# ---------------------------------------------------------------------------
# Each screen defines *what* to show (columns, fields, entity, endpoint).
# The frontend's universal DynamicPageComponent reads the definition and
# renders the appropriate view (browser table, form, editable table).
# ---------------------------------------------------------------------------

_PAGINATION_DEFAULT = {"pageSize": 25, "pageSizeOptions": [10, 25, 50, 100]}

tm_bootstrap_screens = [
    # ===== Collections =====
    {
        "uuid": "00000001-0001-0000-0000-000000000001",
        "name": "collections_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "Collection",
        "endpoint": "/api/collections",
        "definition": {
            "type": "browser",
            "title": "SCREENS.COLLECTIONS.BROWSER_TITLE",
            "permission": "gui-collections",
            "permissions": {
                "create": "gui-collection-create",
                "edit": "gui-collection-edit",
                "delete": "gui-collection-delete",
            },
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    {
        "uuid": "00000001-0002-0000-0000-000000000001",
        "name": "collections_form",
        "screen_type": ScreenType.FORM.value,
        "main_entity_type": "Collection",
        "endpoint": "/api/collections",
        "definition": {
            "type": "form",
            "title": "SCREENS.COLLECTIONS.FORM_TITLE",
            "permission": "gui-collection-read",
            "permissions": {
                "create": "gui-collection-create",
                "edit": "gui-collection-edit",
            },
            "sections": [
                {
                    "name": "basic", "title": "SECTIONS.BASIC",
                    "fields": [
                        {"field": "name", "label": "FIELDS.NAME", "type": "text", "required": True},
                    ],
                }
            ],
        },
    },
    # ===== Case Studies =====
    {
        "uuid": "00000001-0003-0000-0000-000000000002",
        "name": "case_studies_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "CaseStudy",
        "endpoint": "/api/case_studies",
        "definition": {
            "type": "browser",
            "title": "SCREENS.CASE_STUDIES.BROWSER_TITLE",
            "permission": "gui-case-studies",
            "permissions": {
                "create": "gui-case-study-create",
                "edit": "gui-case-study-edit",
                "delete": "gui-case-study-delete",
            },
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Identities =====
    {
        "uuid": "00000001-0004-0000-0000-000000000003",
        "name": "identities_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "Identity",
        "endpoint": "/api/identities",
        "definition": {
            "type": "browser",
            "title": "SCREENS.IDENTITIES.BROWSER_TITLE",
            "permission": "gui-users",
            "permissions": {
                "create": "gui-user-create",
                "edit": "gui-user-edit",
                "delete": "gui-user-delete",
            },
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "email", "header": "FIELDS.EMAIL", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    {
        "uuid": "00000001-0005-0000-0000-000000000003",
        "name": "identities_form",
        "screen_type": ScreenType.FORM.value,
        "main_entity_type": "Identity",
        "endpoint": "/api/identities",
        "definition": {
            "type": "form",
            "title": "SCREENS.IDENTITIES.FORM_TITLE",
            "permission": "gui-user-read",
            "permissions": {
                "create": "gui-user-create",
                "edit": "gui-user-edit",
            },
            "sections": [
                {
                    "name": "basic", "title": "SECTIONS.BASIC",
                    "fields": [
                        {"field": "name", "label": "FIELDS.NAME", "type": "text", "required": True},
                        {"field": "email", "label": "FIELDS.EMAIL", "type": "text"},
                    ],
                }
            ],
        },
    },
    # ===== Roles =====
    {
        "uuid": "00000001-0006-0000-0000-000000000004",
        "name": "roles_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "Role",
        "endpoint": "/api/roles",
        "definition": {
            "type": "browser",
            "title": "SCREENS.ROLES.BROWSER_TITLE",
            "permission": "gui-roles",
            "permissions": {
                "create": "gui-role-create",
                "edit": "gui-role-edit",
                "delete": "gui-role-delete",
            },
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Organizations =====
    {
        "uuid": "00000001-0007-0000-0000-000000000005",
        "name": "organizations_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "Organization",
        "endpoint": "/api/organizations",
        "definition": {
            "type": "browser",
            "title": "SCREENS.ORGANIZATIONS.BROWSER_TITLE",
            "permission": "gui-organizations",
            "permissions": {
                "create": "gui-organization-create",
                "edit": "gui-organization-edit",
                "delete": "gui-organization-delete",
            },
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Groups =====
    {
        "uuid": "00000001-0008-0000-0000-000000000006",
        "name": "groups_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "Group",
        "endpoint": "/api/groups",
        "definition": {
            "type": "browser",
            "title": "SCREENS.GROUPS.BROWSER_TITLE",
            "permission": "gui-groups",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== System Functions =====
    {
        "uuid": "00000001-0009-0000-0000-000000000007",
        "name": "system_functions_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "SystemFunction",
        "endpoint": "/api/system_functions",
        "definition": {
            "type": "browser",
            "title": "SCREENS.SYSTEM_FUNCTIONS.BROWSER_TITLE",
            "permission": "gui-system-functions",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "uuid", "header": "FIELDS.UUID"},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Annotation Fields =====
    {
        "uuid": "00000001-0010-0000-0000-000000000008",
        "name": "annotation_fields_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "AnnotationFormField",
        "endpoint": "/api/annotation_form_fields",
        "definition": {
            "type": "browser",
            "title": "SCREENS.ANNOTATION_FIELDS.BROWSER_TITLE",
            "permission": "gui-annotation-fields",
            "permissions": {
                "create": "gui-annotation-field-create",
                "edit": "gui-annotation-field-edit",
                "delete": "gui-annotation-field-delete",
            },
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Annotation Templates =====
    {
        "uuid": "00000001-0011-0000-0000-000000000009",
        "name": "annotation_templates_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "AnnotationFormTemplate",
        "endpoint": "/api/annotation_form_templates",
        "definition": {
            "type": "browser",
            "title": "SCREENS.ANNOTATION_TEMPLATES.BROWSER_TITLE",
            "permission": "gui-annotation-templates",
            "permissions": {
                "create": "gui-annotation-template-create",
                "edit": "gui-annotation-template-edit",
                "delete": "gui-annotation-template-delete",
            },
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Views =====
    {
        "uuid": "00000001-0012-0000-0000-00000000000a",
        "name": "views_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "View",
        "endpoint": "/api/viewz",
        "definition": {
            "type": "browser",
            "title": "SCREENS.VIEWS.BROWSER_TITLE",
            "permission": "gui-viewers",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Dashboards =====
    {
        "uuid": "00000001-0013-0000-0000-00000000000b",
        "name": "dashboards_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "Dashboard",
        "endpoint": "/api/dashboards",
        "definition": {
            "type": "browser",
            "title": "SCREENS.DASHBOARDS.BROWSER_TITLE",
            "permission": "gui-viewers",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Hierarchy Nodes =====
    {
        "uuid": "00000001-0014-0000-0000-00000000000c",
        "name": "hierarchy_nodes_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "HierarchyNode",
        "endpoint": "/api/hierarchy_nodes",
        "definition": {
            "type": "browser",
            "title": "SCREENS.HIERARCHY_NODES.BROWSER_TITLE",
            "permission": "gui-system-functions",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "hierarchy_id", "header": "FIELDS.HIERARCHY", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Entity Labels (i18n) =====
    {
        "uuid": "00000001-0015-0000-0000-00000000000d",
        "name": "entity_labels_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "EntityLabel",
        "endpoint": "/api/entity_labels",
        "definition": {
            "type": "browser",
            "title": "SCREENS.ENTITY_LABELS.BROWSER_TITLE",
            "permission": "gui-system-functions",
            "fieldId": "id",
            "columns": [
                {"field": "language_id", "header": "FIELDS.LANGUAGE", "sortable": True},
                {"field": "entity_type", "header": "FIELDS.ENTITY_TYPE", "sortable": True},
                {"field": "entity_id", "header": "FIELDS.ENTITY_ID", "sortable": True},
                {"field": "label", "header": "FIELDS.LABEL", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "language_id", "order": "asc"},
        },
    },
    # ===== Screens (meta – manage screens themselves) =====
    {
        "uuid": "00000001-0016-0000-0000-00000000000e",
        "name": "screens_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "Screen",
        "endpoint": "/api/screens",
        "definition": {
            "type": "browser",
            "title": "SCREENS.SCREENS.BROWSER_TITLE",
            "permission": "gui-system-functions",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "screen_type", "header": "FIELDS.TYPE", "sortable": True},
                {"field": "main_entity_type", "header": "FIELDS.ENTITY"},
                {"field": "endpoint", "header": "FIELDS.ENDPOINT"},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== App Flavors =====
    {
        "uuid": "00000001-0017-0000-0000-00000000000f",
        "name": "app_flavors_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "AppFlavor",
        "endpoint": "/api/app_flavors",
        "definition": {
            "type": "browser",
            "title": "SCREENS.APP_FLAVORS.BROWSER_TITLE",
            "permission": "gui-system-functions",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Menus =====
    {
        "uuid": "00000001-0018-0000-0000-000000000010",
        "name": "menus_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "Menu",
        "endpoint": "/api/menus",
        "definition": {
            "type": "browser",
            "title": "SCREENS.MENUS.BROWSER_TITLE",
            "permission": "gui-system-functions",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "icon", "header": "FIELDS.ICON"},
                {"field": "order", "header": "FIELDS.ORDER", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "order", "order": "asc"},
        },
    },
    # ===== Datasets =====
    {
        "uuid": "00000001-0019-0000-0000-000000000011",
        "name": "datasets_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "Dataset",
        "endpoint": "/api/functional_objects",
        "definition": {
            "type": "browser",
            "title": "SCREENS.DATASETS.BROWSER_TITLE",
            "permission": "gui-collections",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "creation_time", "header": "FIELDS.CREATED", "type": "datetime", "sortable": True},
            ],
            "actions": ["view", "edit", "delete", "create"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "name", "order": "asc"},
        },
    },
    # ===== Permission Types =====
    {
        "uuid": "00000001-0020-0000-0000-000000000012",
        "name": "permission_types_browser",
        "screen_type": ScreenType.BROWSER.value,
        "main_entity_type": "PermissionType",
        "endpoint": "/api/acl/permission_types",
        "definition": {
            "type": "browser",
            "title": "SCREENS.PERMISSION_TYPES.BROWSER_TITLE",
            "permission": "gui-permission-types",
            "fieldId": "id",
            "columns": [
                {"field": "name", "header": "FIELDS.NAME", "sortable": True},
                {"field": "rank", "header": "FIELDS.RANK", "sortable": True},
            ],
            "actions": ["view"],
            "pagination": _PAGINATION_DEFAULT,
            "defaultSort": {"field": "rank", "order": "asc"},
        },
    },
]

# ---------------------------------------------------------------------------
# Dynamic Menus – hierarchical navigation seeded into DB
# ---------------------------------------------------------------------------
# Each top-level menu is a "submenu group" (icon + label).
# Children are leaf items that point to a Screen.
# The definition.route tells the frontend which URL path to use.
# The definition.permission (or screen definition.permission) controls
# visibility based on the user's ACL.
# ---------------------------------------------------------------------------

tm_bootstrap_menus = [
    # ── Data ──────────────────────────────────────────────
    {
        "uuid": "00000002-0001-0000-0000-000000000001",
        "name": "Data",
        "icon": "database",
        "order": 10,
        "parent_uuid": None,
        "screen_name": None,
        "definition": {"code": "SIDEBAR.DATA.TITLE"},
    },
    {
        "uuid": "00000002-0001-0001-0000-000000000001",
        "name": "Collections",
        "icon": None,
        "order": 1,
        "parent_uuid": "00000002-0001-0000-0000-000000000001",
        "screen_name": "collections_browser",
        "definition": {"route": "/d/collections_browser", "code": "SIDEBAR.DATA.COLLECTIONS"},
    },
    {
        "uuid": "00000002-0001-0002-0000-000000000001",
        "name": "Case Studies",
        "icon": None,
        "order": 2,
        "parent_uuid": "00000002-0001-0000-0000-000000000001",
        "screen_name": "case_studies_browser",
        "definition": {"route": "/d/case_studies_browser", "code": "SIDEBAR.DATA.CASE_STUDIES"},
    },
    {
        "uuid": "00000002-0001-0003-0000-000000000001",
        "name": "Datasets",
        "icon": None,
        "order": 3,
        "parent_uuid": "00000002-0001-0000-0000-000000000001",
        "screen_name": "datasets_browser",
        "definition": {"route": "/d/datasets_browser", "code": "SIDEBAR.DATA.DATASETS"},
    },
    {
        "uuid": "00000002-0001-0004-0000-000000000001",
        "name": "Hierarchy Nodes",
        "icon": None,
        "order": 4,
        "parent_uuid": "00000002-0001-0000-0000-000000000001",
        "screen_name": "hierarchy_nodes_browser",
        "definition": {"route": "/d/hierarchy_nodes_browser", "code": "SIDEBAR.DATA.HIERARCHY_NODES"},
    },
    # ── Annotations ───────────────────────────────────────
    {
        "uuid": "00000002-0002-0000-0000-000000000002",
        "name": "Annotations",
        "icon": "form",
        "order": 20,
        "parent_uuid": None,
        "screen_name": None,
        "definition": {"code": "SIDEBAR.ANNOTATIONS.TITLE"},
    },
    {
        "uuid": "00000002-0002-0001-0000-000000000002",
        "name": "Annotation Fields",
        "icon": None,
        "order": 1,
        "parent_uuid": "00000002-0002-0000-0000-000000000002",
        "screen_name": "annotation_fields_browser",
        "definition": {"route": "/d/annotation_fields_browser", "code": "SIDEBAR.ANNOTATIONS.FIELDS"},
    },
    {
        "uuid": "00000002-0002-0002-0000-000000000002",
        "name": "Annotation Templates",
        "icon": None,
        "order": 2,
        "parent_uuid": "00000002-0002-0000-0000-000000000002",
        "screen_name": "annotation_templates_browser",
        "definition": {"route": "/d/annotation_templates_browser", "code": "SIDEBAR.ANNOTATIONS.TEMPLATES"},
    },
    # ── Views & Dashboards ────────────────────────────────
    {
        "uuid": "00000002-0003-0000-0000-000000000003",
        "name": "Views & Dashboards",
        "icon": "appstore",
        "order": 30,
        "parent_uuid": None,
        "screen_name": None,
        "definition": {"code": "SIDEBAR.VIEWS_DASHBOARDS.TITLE"},
    },
    {
        "uuid": "00000002-0003-0001-0000-000000000003",
        "name": "Views",
        "icon": None,
        "order": 1,
        "parent_uuid": "00000002-0003-0000-0000-000000000003",
        "screen_name": "views_browser",
        "definition": {"route": "/d/views_browser", "code": "SIDEBAR.VIEWS_DASHBOARDS.VIEWS"},
    },
    {
        "uuid": "00000002-0003-0002-0000-000000000003",
        "name": "Dashboards",
        "icon": None,
        "order": 2,
        "parent_uuid": "00000002-0003-0000-0000-000000000003",
        "screen_name": "dashboards_browser",
        "definition": {"route": "/d/dashboards_browser", "code": "SIDEBAR.VIEWS_DASHBOARDS.DASHBOARDS"},
    },
    # ── Security ──────────────────────────────────────────
    {
        "uuid": "00000002-0004-0000-0000-000000000004",
        "name": "Security",
        "icon": "lock",
        "order": 40,
        "parent_uuid": None,
        "screen_name": None,
        "definition": {"code": "SIDEBAR.SECURITY.TITLE"},
    },
    {
        "uuid": "00000002-0004-0001-0000-000000000004",
        "name": "Identities",
        "icon": None,
        "order": 1,
        "parent_uuid": "00000002-0004-0000-0000-000000000004",
        "screen_name": "identities_browser",
        "definition": {"route": "/d/identities_browser", "code": "SIDEBAR.SECURITY.IDENTITIES"},
    },
    {
        "uuid": "00000002-0004-0002-0000-000000000004",
        "name": "Roles",
        "icon": None,
        "order": 2,
        "parent_uuid": "00000002-0004-0000-0000-000000000004",
        "screen_name": "roles_browser",
        "definition": {"route": "/d/roles_browser", "code": "SIDEBAR.SECURITY.ROLES"},
    },
    {
        "uuid": "00000002-0004-0003-0000-000000000004",
        "name": "Organizations",
        "icon": None,
        "order": 3,
        "parent_uuid": "00000002-0004-0000-0000-000000000004",
        "screen_name": "organizations_browser",
        "definition": {"route": "/d/organizations_browser", "code": "SIDEBAR.SECURITY.ORGANIZATIONS"},
    },
    {
        "uuid": "00000002-0004-0004-0000-000000000004",
        "name": "Groups",
        "icon": None,
        "order": 4,
        "parent_uuid": "00000002-0004-0000-0000-000000000004",
        "screen_name": "groups_browser",
        "definition": {"route": "/d/groups_browser", "code": "SIDEBAR.SECURITY.GROUPS"},
    },
    {
        "uuid": "00000002-0004-0005-0000-000000000004",
        "name": "Permission Types",
        "icon": None,
        "order": 5,
        "parent_uuid": "00000002-0004-0000-0000-000000000004",
        "screen_name": "permission_types_browser",
        "definition": {"route": "/d/permission_types_browser", "code": "SIDEBAR.SECURITY.PERMISSION_TYPES"},
    },
    # ── System ────────────────────────────────────────────
    {
        "uuid": "00000002-0005-0000-0000-000000000005",
        "name": "System",
        "icon": "setting",
        "order": 50,
        "parent_uuid": None,
        "screen_name": None,
        "definition": {"code": "SIDEBAR.SYSTEM.TITLE"},
    },
    {
        "uuid": "00000002-0005-0001-0000-000000000005",
        "name": "System Functions",
        "icon": None,
        "order": 1,
        "parent_uuid": "00000002-0005-0000-0000-000000000005",
        "screen_name": "system_functions_browser",
        "definition": {"route": "/d/system_functions_browser", "code": "SIDEBAR.SYSTEM.FUNCTIONS"},
    },
    {
        "uuid": "00000002-0005-0002-0000-000000000005",
        "name": "Screens",
        "icon": None,
        "order": 2,
        "parent_uuid": "00000002-0005-0000-0000-000000000005",
        "screen_name": "screens_browser",
        "definition": {"route": "/d/screens_browser", "code": "SIDEBAR.SYSTEM.SCREENS"},
    },
    {
        "uuid": "00000002-0005-0003-0000-000000000005",
        "name": "App Flavors",
        "icon": None,
        "order": 3,
        "parent_uuid": "00000002-0005-0000-0000-000000000005",
        "screen_name": "app_flavors_browser",
        "definition": {"route": "/d/app_flavors_browser", "code": "SIDEBAR.SYSTEM.APP_FLAVORS"},
    },
    {
        "uuid": "00000002-0005-0004-0000-000000000005",
        "name": "Menus",
        "icon": None,
        "order": 4,
        "parent_uuid": "00000002-0005-0000-0000-000000000005",
        "screen_name": "menus_browser",
        "definition": {"route": "/d/menus_browser", "code": "SIDEBAR.SYSTEM.MENUS"},
    },
    {
        "uuid": "00000002-0005-0005-0000-000000000005",
        "name": "Entity Labels",
        "icon": None,
        "order": 5,
        "parent_uuid": "00000002-0005-0000-0000-000000000005",
        "screen_name": "entity_labels_browser",
        "definition": {"route": "/d/entity_labels_browser", "code": "SIDEBAR.SYSTEM.ENTITY_LABELS"},
    },
]


def _load_bootstrap_screens(db: Session):
    """Load bootstrap screen definitions."""
    for screen_data in tm_bootstrap_screens:
        screen_uuid = screen_data["uuid"]
        # Check if screen already exists
        stmt = select(Screen).where(Screen.uuid == screen_uuid)
        existing = db.scalar(stmt)
        if not existing:
            screen = Screen(
                uuid=screen_uuid,
                name=screen_data["name"],
                screen_type=screen_data["screen_type"],
                main_entity_type=screen_data["main_entity_type"],
                endpoint=screen_data["endpoint"],
                definition=screen_data["definition"]
            )
            db.add(screen)
        else:
            # Update existing screen
            existing.name = screen_data["name"]
            existing.screen_type = screen_data["screen_type"]
            existing.main_entity_type = screen_data["main_entity_type"]
            existing.endpoint = screen_data["endpoint"]
            existing.definition = screen_data["definition"]
    db.flush()


def _load_bootstrap_menus(db: Session):
    """
    Load hierarchical menu definitions.

    This creates the sidebar navigation structure that the frontend reads
    from ``GET /api/gui/navigation``.  Each menu item may point to a Screen
    (leaf) or contain children (submenu group).
    """
    # Build a uuid→id lookup for screens so we can link them
    screen_lookup: Dict[str, int] = {}
    for s in db.scalars(select(Screen)).all():
        screen_lookup[s.name] = s.id

    # Build a uuid→id lookup for parent resolution (two-pass)
    menu_uuid_to_id: Dict[str, int] = {}

    # Pass 1 – Create / update menu rows
    for m_data in tm_bootstrap_menus:
        m_uuid = m_data["uuid"]
        stmt = select(Menu).where(Menu.uuid == m_uuid)
        existing = db.scalar(stmt)

        if not existing:
            menu = Menu(
                uuid=m_uuid,
                name=m_data["name"],
                icon=m_data.get("icon"),
                order=m_data.get("order", 0),
                definition=m_data.get("definition"),
            )
            # Link to screen
            if m_data.get("screen_name") and m_data["screen_name"] in screen_lookup:
                menu.screen_id = screen_lookup[m_data["screen_name"]]
            db.add(menu)
            db.flush()
            menu_uuid_to_id[m_uuid] = menu.id
        else:
            existing.name = m_data["name"]
            existing.icon = m_data.get("icon")
            existing.order = m_data.get("order", 0)
            existing.definition = m_data.get("definition")
            if m_data.get("screen_name") and m_data["screen_name"] in screen_lookup:
                existing.screen_id = screen_lookup[m_data["screen_name"]]
            db.flush()
            menu_uuid_to_id[m_uuid] = existing.id

    # Pass 2 – wire parent_menu_id
    for m_data in tm_bootstrap_menus:
        if m_data.get("parent_uuid"):
            child_id = menu_uuid_to_id.get(m_data["uuid"])
            parent_id = menu_uuid_to_id.get(m_data["parent_uuid"])
            if child_id and parent_id:
                child = db.get(Menu, child_id)
                if child and child.parent_menu_id != parent_id:
                    child.parent_menu_id = parent_id
    db.flush()



# --- Object types y permisos propios del dominio GUI ---

_OBJECT_TYPES = [
    ("view", "4cc3b304-afb4-445b-a9da-6c5ec99aafc8"),
    ("dashboard", "633a7f00-4019-4302-9067-611bea1fc934"),
    ("screen", "2a06cec0-0f04-470f-8640-7b86ac023962"),
    ("app_flavor", "c778c6a7-4a96-4bdf-a193-88063d0e6c7d"),
    ("menu", "f8f71917-96cc-4835-888d-2e750019a9eb"),
]

_OBJECT_TYPE_PERMISSIONS = [
    ["view", "read"], ["view", "annotate"], ["view", "create"],
    ["view", "edit"], ["view", "delete"],
    ["dashboard", "read"], ["dashboard", "annotate"], ["dashboard", "create"],
    ["dashboard", "edit"], ["dashboard", "delete"],
]


def seed_gui(db: Session) -> None:
    from uniback.persistence.seeding import (
        create_or_update_acl_reference_object,
        load_many_to_many_table,
        load_table_extended,
    )

    object_types = [
        (data_object_type_id[name], uid, name) for name, uid in _OBJECT_TYPES
    ]
    load_table_extended(db, ObjectType, ["id", "uuid", "name"], object_types)
    load_many_to_many_table(
        db, ObjectTypePermissionType, ObjectType, PermissionType,
        ["object_type_id", "permission_type_id"], _OBJECT_TYPE_PERMISSIONS,
    )

    _load_bootstrap_screens(db)
    _load_bootstrap_menus(db)

    refs = [
        (View, "f9e5bbe1-0acf-4d9b-a564-db180f106695", [("role", "sys-admin", "read")]),
        (Dashboard, "ae4e074c-3dd9-4eae-8fc3-6b54a623cbc7", [("role", "sys-admin", "read")]),
    ]
    for model, uid, perms in refs:
        create_or_update_acl_reference_object(db, model, uid, perms)
