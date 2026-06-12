from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Tuple, Union

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from uniback.persistence.models import HierarchyType, Hierarchy, HierarchyNode
from uniback.persistence.models.files import FileSystemStorage
from uniback.persistence.models.sysadmin import (
    ACL,
    ACLExpression,
    ACLDetail,
    Authorizable,
    Authenticator,
    Group,
    GroupIdentity,
    Identity,
    IdentityAuthenticator,
    ObjectType,
    ObjectTypePermissionType,
    PermissionType,
    Role,
    RoleIdentity,
    SystemFunction,
)
from uniback.persistence.models.core import (
    FunctionalObject,
    data_object_type_id,
    class_to_object_type_id,
    Collection,
    CaseStudy,
    Dataset
)
from uniback.persistence.models.geographics import GeographicLayer
from uniback.persistence.models.views_dashboards import View, Dashboard
from uniback.persistence.models.screens import Screen, AppFlavor, Menu, ScreenType

from uniback.persistence.utils import (
    load_table as load_table_util,
    load_table_extended as load_table_extended_util,
    load_many_to_many_table as load_many_to_many_table_util,
    create_or_update_acl_reference_object as create_or_update_acl_reference_object_util
)

def load_table(db: Session, model: Any, data: Dict[str, str]):
    load_table_util(db, model, data)
    db.flush()

def load_table_extended(db: Session, model: Any, fields: List[str], values: List[Tuple], update: bool = False):
    load_table_extended_util(db, model, fields, values, update=update)
    db.flush()

def load_many_to_many_table(db: Session, model: Any, left_model: Any, right_model: Any, fields: List[str], values: List[Tuple]):
    load_many_to_many_table_util(db, model, left_model, right_model, fields, values)
    db.flush()

def create_or_update_acl_reference_object(db: Session, model: Any, obj_uuid: str, permissions: List[Tuple]):
    create_or_update_acl_reference_object_util(db, model, obj_uuid, permissions)
    db.flush()

# --- DATA ---

tm_object_type_fields = ["id", "uuid", "name"]
tm_object_types = [  # ObjectType
    (data_object_type_id["dataset"], "a0b81048-a7dd-4d27-8aea-2a276f48d8f6", "dataset"),
    (data_object_type_id["geolayer"], "b7c404e0-8b5d-4327-b830-85f8209c06e3", "geolayer"),
    (data_object_type_id["grid"], "ffb8e897-5df8-4a01-922c-7901b63ef325", "grid"),
    (data_object_type_id["case_study"], "5f4c1666-e509-436b-8844-082ebe88b2b9", "case_study"),
    (data_object_type_id["collection"], "34a339c6-2015-4b0a-a3da-acf6fce335ca", "collection"),
    (data_object_type_id["view"], "4cc3b304-afb4-445b-a9da-6c5ec99aafc8", "view"),
    (data_object_type_id["dashboard"], "633a7f00-4019-4302-9067-611bea1fc934", "dashboard"),
    (data_object_type_id["sys-function"], "ad83dcb0-e479-4a44-acf5-387b9731e8da", "sys-function"),
    (data_object_type_id["none"], "b5371878-582a-4758-9c7c-9e536c477992", "none"),  # Nulled items
    (data_object_type_id["annotation_item"], "848b46b0-8602-42a2-a3fd-1b9be728d729", "annotation_item"),
    (data_object_type_id["annotation_template"], "79668ea7-80fa-4327-a433-721a69582542", "annotation_template"),
    (data_object_type_id["annotation_field"], "35313fd1-484e-48af-b6e2-e4b7464abb64", "annotation_field"),
    (data_object_type_id["annotation_text"], "dc50990e-f4ad-4ef3-80c8-f68fd0b1a412", "annotation_text"),
    (data_object_type_id["dataframe"], "78009a6b-63f5-41df-b20b-5642214b9f03", "dataframe"),
    (data_object_type_id["file_system_object"], "45f747dd-f4b3-4f0c-b2ec-b7d6bd36b070", "file_system_object"),
    (data_object_type_id["folder"], "860fcfb0-b8a5-4b6e-a678-830c2c70f805", "folder"),
    (data_object_type_id["file"], "eafd228c-386a-4910-85c6-5edc188e6b41", "file"),
    (data_object_type_id["screen"], "2a06cec0-0f04-470f-8640-7b86ac023962", "screen"),
    (data_object_type_id["app_flavor"], "c778c6a7-4a96-4bdf-a193-88063d0e6c7d", "app_flavor"),
    (data_object_type_id["menu"], "f8f71917-96cc-4835-888d-2e750019a9eb", "menu"),
]

tm_permissions_fields = ["uuid", "name", "rank"]
tm_permissions = [  # PermissionType
    ("5ac8ed2c-20d7-4905-9184-f584947719dd", "view", 1),
    ("f19ad19f-0a74-44e8-bd4e-4762404a35aa", "read", 1),
    ("feb13f20-4223-4602-a195-a3ea14615982", "export", 2),
    ("04cac7ca-a90b-4d12-a966-d8b0c77fca70", "annotate", 3),
    ("d0924822-32fa-4456-8143-0fd48da33fd7", "contribute", 3),
    ("83d837ab-01b2-4260-821b-8c4a3c52e9ab", "share", 3),
    ("91a5b4a7-3359-4eed-98df-497c42d0c3c1", "execute", 3),
    ("1ed12b31-b34b-4620-9b9d-6f171695b845", "submit", 3),
    ("640de355-f58e-4446-a12a-2a99f2cfb2eb", "import", 4),  # Modify data of existing object
    ("981b9576-2445-444b-9515-a5a05744c2f1", "create", 4),
    ("fb1bdaec-3379-4930-b3f8-fea67d0783b7", "edit", 4),
    ("62885891-db3c-4a06-bc28-a407ffdb08a4", "permissions", 5),
    ("d3137471-84a0-4bcf-8dd8-16387ea46a30", "delete", 6)
]

tm_object_types_permissions = [
                               ["dataset", "read"],
                               ["dataset", "annotate"],
                               ["dataset", "create"],
                               ["dataset", "edit"],
                               ["dataset", "delete"],
                               ["geolayer", "view"],
                               ["geolayer", "read"],
                               ["geolayer", "export"],
                               ["geolayer", "edit"],
                               ["geolayer", "delete"],
                               ["geolayer", "permissions"],
                               ["collection", "read"],
                               ["collection", "annotate"],
                               ["collection", "create"],
                               ["collection", "edit"],
                               ["collection", "delete"],
                               ["case_study", "read"],
                               ["case_study", "annotate"],
                               ["case_study", "create"],
                               ["case_study", "edit"],
                               ["case_study", "delete"],
                               ["view", "read"],
                               ["view", "annotate"],
                               ["view", "create"],
                               ["view", "edit"],
                               ["view", "delete"],
                               ["dashboard", "read"],
                               ["dashboard", "annotate"],
                               ["dashboard", "create"],
                               ["dashboard", "edit"],
                               ["dashboard", "delete"],
                               ["folder", "read"],
                               ["folder", "annotate"],
                               ["folder", "create"],
                               ["folder", "edit"],
                               ["folder", "delete"],
                               ["file", "read"],
                               ["file", "annotate"],
                               ["file", "create"],
                               ["file", "edit"],
                               ["file", "delete"],
]

tm_default_users = {  # Identities
    "0fc2b361-847c-4b2e-8fbd-533092133eef": "admin",
    "74d20b2c-5b49-462c-8d19-8a72f47b5d1b": "_anonymous",
    "91c8008e-97d5-440c-b3fc-f5a409a44768": "test_user",
    "1c8b0500-32d2-40ce-8da0-4fc772f4c3a3": "celery_user"
}

tm_default_groups = {
    "cad9f7e0-8a91-491c-9012-8900177e132b": "all-identified",  # All except anonymous (not implemented)
    "d62bd35a-b34b-43bb-a359-323d57f95f78": "cc-lab",
    "ff5d8e35-01e8-450c-b0b5-7e4487ba4811": "governance-planning",
}

tm_default_roles = {
    "c79b4ff7-9576-45f6-a439-551ac23c563b": "sys-admin",
    "4cc73d65-f491-4199-a52d-fc05dd45c923": "research",
    "a6e1d17f-f2a3-428a-b24c-6e7b7d71fff4": "acl-admin",
    "038f28e3-8374-4bf1-b1aa-0d63c5920294": "metadata-admin",
    "feb13f20-4223-4602-a195-a3ea14615982": "guest",
    "6e7ff87f-056b-46b0-b636-c7c0eb48cabe": "owner",
    "1fa175e8-28c2-4f59-a0b9-f07649ab924b": "read-geo-api",
    "ec1a58b9-5f99-454c-a3fb-85b38dd70ccc": "write-geo-api",
    "e8244111-04dc-4697-a8f5-3468c0fbdfe5": "read-files-api",
    "9a5e8265-38c8-4607-bff2-85f5bebe6d3a": "write-files-api",
    "b9fb4863-6c7b-4a32-aa59-c9d956009fe2": "jupyterlab"
}

tm_authenticators = {  # Authenticator
    "5b7e9e40-040b-40fc-9db3-7d707fe9617f": "firebase",
    "5f32a593-306f-4b69-983c-0a5680556fae": "local",
    "15aa399f-dd58-433f-8e94-5b2222cd06c9": "local-api-key"
}

tm_system_functions = {
    "06a0606c-bc13-4cad-bebf-73cb7f409239": "gui-collections",
    "1d0c423a-a776-4a48-9cb8-d71416e289bf": "gui-collection-create",
    "1a610222-a907-4041-952b-30e56addc0c8": "gui-collection-read",
    "a08fecfd-9332-426c-9348-cd69db044bb4": "gui-collection-edit",
    "6c70fddd-8684-4da5-9d7d-ef39570e3bc2": "gui-collection-delete",
    "6f1810a4-2985-4e37-b8cc-7635e32d9e4c": "gui-collection-acl",
    "2797775a-cab3-47b5-979c-2f3d9b2f2b5b": "gui-layers",
    "442343a6-16e8-4e41-9e75-57f770945e98": "gui-layer-import",
    "4a4f7238-0b30-45d2-bbb0-9c5f67bedda3": "gui-layer-export",
    "d8bc90a8-a3bf-4384-8121-fbeaa2b0650f": "gui-layer-read",
    "a203b85b-badb-4a7d-b239-49cc17b2aff2": "gui-layer-edit",
    "eb06f829-7535-4532-a886-f5b1042ef66b": "gui-layer-delete",
    "437de350-96d1-4a04-8c1c-7468b2f4eda4": "gui-layer-acl",
    "ffa83589-d5c5-4648-86f5-f07a5277defb": "gui-layers-graphical",
    "d0e908f4-f0fb-4229-8f79-96fc62c24aee": "gui-case-studies",
    "c7a38c19-a6d3-4e9d-9cd4-407063ce5e5d": "gui-case-study-create",
    "3f2b5c80-97fd-47e8-a65e-7cd86a2e3148": "gui-case-study-read",
    "127ca7b6-9754-4c8c-83c1-e82f30942891": "gui-case-study-delete",
    "7ddcafe0-b735-446e-b158-5f90e3b6c546": "gui-case-study-edit",
    "d5f6f175-f8b6-4957-983c-d2aea19478d1": "gui-case-study-acl",
    "511402cd-07e7-44da-8508-9fc43d64e02f": "gui-subjects",
    "c110de6e-2c7d-4c20-9040-fb188f9d12cc": "gui-subject-create",
    "eeee6567-49b2-4c8e-a6ef-7c5edd995c15": "gui-subject-delete",
    "02c87f97-657a-4b31-a1df-1912f1297aa1": "gui-sources",
    "ea43bdc7-cbde-40ea-b5b8-278bfbcc8288": "gui-source-create",
    "fec90eb5-27d4-452f-86d2-14cea32010a2": "gui-source-delete",
    "0f5d3b99-3814-4def-ad6f-1adb71e0d4de": "gui-crs",
    "0900e28e-a797-4f52-9dd8-5f246c670b14": "gui-crs-read",
    "3b137996-c1a4-47bc-9235-108ee9bb9d41": "gui-crs-create",
    "2b13fe5e-0ce3-40ef-a069-211dceb9feda": "gui-crs-delete",
    "611d124e-2fae-4833-bcdd-79cd26eb4c99": "gui-crs-edit",
    "6d4de88e-5081-444d-b9c0-ca8fcaee45cf": "gui-ontologies",
    "279be182-09c4-4693-b802-24c64125a844": "gui-ontology-import",
    "101adefe-36cb-4e49-b99f-afe687da9f3e": "gui-ontology-read",
    "c0d2cca9-4b25-4f1b-880d-e9cfafe5771e": "gui-ontology-edit",
    "af963780-2eff-4233-9d5a-ef40c59a2387": "gui-ontology-delete",
    "623ed5ae-5d56-400a-9efc-ad2a98c46a21": "gui-terms",
    "b899a92f-3167-413d-9f7c-abea684d5d52": "gui-term-read",
    "fdd71d58-256c-4dee-ac11-1fd14ef324e2": "gui-term-delete",
    "dc01b386-29bf-48c6-b7c8-912b3ef7a4b7": "gui-publications",
    "c81ff697-ab62-4a62-b3bb-1626dc41a0e7": "gui-publication-create",
    "1f2cd272-5bd0-4c31-8482-2ef63814bff8": "gui-publication-read",
    "1a3f8a6f-a025-43aa-a93e-0d8fb8caffd7": "gui-publication-edit",
    "8008882a-db9a-4a21-93f3-8c8f6cafcc81": "gui-publication-delete",
    "3d3d506e-07b9-4946-87be-4463add566e6": "gui-taxonomies",
    "2a19277e-db56-47be-bfa4-8b22ea4a3fc3": "gui-taxonomy-import",
    "747150ac-088d-49d1-b24e-4b8f2af5f6bf": "gui-taxonomy-read",
    "4b94e284-805b-4b2d-a07b-5ca09f62d5ea": "gui-taxonomy-edit",
    "7bf11028-068d-4d2b-8700-4435b558f2d7": "gui-taxonomy-delete",
    "5984dfae-f28f-4ad3-a365-a52b8e221a50": "gui-users",
    "ee930ee9-506a-4a14-838e-5c71cd32538d": "gui-users-authorize",
    "931a0e70-649d-40f9-97f7-482cfbc4d52b": "gui-user-read",
    "2dbd9961-0e54-4851-a1bf-8776accb79f4": "gui-user-create",
    "325e40b8-09c6-4c42-9a52-fb6a63d961d9": "gui-user-edit",
    "f89cd65a-965a-4aff-9ce5-a1e808d02625": "gui-user-edit-roles",
    "37905319-2abc-4ec8-aee9-f8e870953c59": "gui-user-delete",
    "78743d6e-811d-481d-9cf1-74b9ab4c2f4f": "gui-roles",
    "977c2811-531c-4af3-a3b3-1c31c9908625": "gui-role-create",
    "70a68ca9-01f0-40cc-a036-92496c54a4e0": "gui-role-edit",
    "69089521-febd-466a-b6a5-1101b9711da2": "gui-role-delete",
    "bbbbbbbb-1111-2222-3333-444444444444": "gui-organisms",
    "a829593d-9dc3-469d-8788-11ebb5fb811a": "gui-organizations",
    "f5180884-87ba-4a73-aaec-92de5b29ac9a": "gui-organization-read",
    "984c8dbb-da76-4b58-9aed-8f1036634496": "gui-organization-create",
    "82667972-1cbf-4ce7-80c3-07ed23af703a": "gui-organization-edit",
    "1557fcab-0a14-4717-95e3-b5bf191edde7": "gui-organization-delete",
    "af324875-8d7a-4110-bf29-b4ea0459de42": "gui-groups",
    "6e228af6-2edc-408d-9c1c-546d68908274": "gui-authenticators",
    "f308f62b-d8a1-45f6-9532-12096369c8e7": "gui-permission-types",
    "880042e1-ca8a-4008-828a-e16fbb1d1a27": "gui-system-functions",
    "ec681f18-2373-440b-910f-adb49e0b869a": "gui-references-acl",
    "617a1423-0798-407e-b668-c8e32f6a9436": "gui-reference-acl-read",
    "665bd175-3daf-4e19-86cb-9adb99cff57e": "gui-annotation-fields",
    "0596e736-c822-4408-9141-a008bc884f30": "gui-annotation-field-create",
    "09b5c5be-eef0-49a8-90a7-99fd2c5ac652": "gui-annotation-field-read",
    "312b9ea0-0783-47ad-aa73-84ee04584b05": "gui-annotation-field-edit",
    "0b58b8ca-8a7f-4110-9b91-d33fd92c45e1": "gui-annotation-field-delete",
    "7368633c-9a8b-4656-9f08-35cfcb7af5ff": "gui-annotation-field-acl",
    "c8680b4b-79c9-4d5d-8e41-2d3f20a1cc24": "gui-annotation-templates",
    "435c8dd4-6166-487a-8bc6-83b58549991f": "gui-annotation-template-create",
    "972d0e09-822c-4a4b-b5ca-8078e7833aed": "gui-annotation-template-read",
    "28785e43-d3d3-48f8-ba6d-104538eac193": "gui-annotation-template-edit",
    "d7a2b610-6b9f-414a-9db2-34072707d710": "gui-annotation-template-delete",
    "9d6d81a2-5b81-425f-a97e-46c54a9e6bbc": "gui-annotation-template-acl",
    "3ffae793-ee26-4173-813f-026168c22b57": "gui-viewers",
    "4130599f-a901-4aae-b09e-ffaf18a7c911": "gui-viewer-create",
    "474eea32-8379-4c16-a7e2-8a7a1a0fa8b7": "gui-viewer-delete",
    "bd810ce9-5892-4cce-8517-06c1b74c9310": "gui-viewer-acl",
    "d1b71528-bdc5-44d0-b7f5-2c34ecad8890": "gui-status-checkers",
}


# To update "tm_system_functions_rules" using Google Sheets:
#    https://docs.google.com/spreadsheets/d/1fXj_nF640mDUSGClA_d7AEzCCLKtmwIww9xiHWmR2qs/edit#gid=0
# ** Export to an XLSX file
# ** Uncomment the following "print" statement, and put a breakpoint in it,
# ** Then execute in Debug mode, using "main.py", "Step over" and
# ** Copy-Paste resulting string from the console, replacing the current "tm_system_functions_rules"
# def prepare_system_functions_rules(xlsx_file_name):
#     """
#     Prepare "tm_system_functions_rules" system functions rules, below
#     """
#     from openpyxl import load_workbook
#     wb = load_workbook(xlsx_file_name)
#     ws = wb.get_sheet_by_name('Funciones por rol')
#     system_functions = "tm_system_functions = {\n"
#     system_functions_rules = {}
#     cols = {3: "sys-admin",
#             4: "guest",
#             6: "geo-admin",
#             7: "acl-admin",
#             9: "metadata-admin",
#             11: "geo-guest"
#             }
#     for row in ws.iter_rows(min_row=3, max_row=ws.max_row, min_col=1, max_col=ws.max_column):
#         if row[1].value is not None:
#             roles = []
#             for col, role in cols.items():
#                 if row[col].value is not None:
#                     roles.append(f"'{role}'")
#             if len(roles) == 0:
#                 roles = ["'dont-show'"]
#             system_functions += f"    \"{row[0].value}\": \"{row[1].value}\",\n"
#             system_functions_rules[row[1].value] = f"role in ({','.join(roles)})"
#     system_functions += "}\n\n"
#     _ = "tm_system_functions_rules = {\n" + ",\n".join([f'    "{k}": "{v}"' for k, v in system_functions_rules.items()]) + "\n}"
#     return f"{system_functions}\n\n{_}"
#
#print(prepare_system_functions_rules("/home/rnebot/Downloads/Lista de permisos - NEXTGENDEM.xlsx"))

tm_system_functions_rules = {
    "gui-collections": "role in ('sys-admin','molecular-admin','acl-admin')",
    "gui-collection-create": "role in ('sys-admin','molecular-admin')",
    "gui-collection-read": "role in ('sys-admin','molecular-admin','acl-admin')",
    "gui-collection-edit": "role in ('sys-admin','molecular-admin')",
    "gui-collection-delete": "role in ('sys-admin','molecular-admin')",
    "gui-collection-acl": "role in ('sys-admin','molecular-admin','acl-admin')",
    "gui-layers": "role in ('sys-admin','guest','molecular-admin','geo-admin','acl-admin')",
    "gui-layer-import": "role in ('sys-admin','geo-admin')",
    "gui-layer-export": "role in ('sys-admin','geo-admin','geo-guest')",
    "gui-layer-read": "role in ('sys-admin','guest','molecular-admin','geo-admin','acl-admin')",
    "gui-layer-edit": "role in ('sys-admin','geo-admin')",
    "gui-layer-delete": "role in ('sys-admin','geo-admin')",
    "gui-layer-acl": "role in ('sys-admin','geo-admin','acl-admin')",
    "gui-layers-graphical": "role in ('sys-admin','guest','molecular-admin','geo-admin','acl-admin')",
    "gui-case-studies": "role in ('sys-admin','guest','molecular-admin','acl-admin')",
    "gui-case-study-create": "role in ('sys-admin','molecular-admin','geo-admin')",
    "gui-case-study-read": "role in ('sys-admin','guest','molecular-admin','geo-admin','acl-admin')",
    "gui-case-study-delete": "role in ('sys-admin','molecular-admin','geo-admin')",
    "gui-case-study-edit": "role in ('sys-admin','molecular-admin','geo-admin')",
    "gui-case-study-acl": "role in ('sys-admin','molecular-admin','geo-admin','acl-admin')",
    "gui-subjects": "role in ('sys-admin','geo-admin','metadata-admin')",
    "gui-subject-create": "role in ('sys-admin')",
    "gui-subject-delete": "role in ('sys-admin')",
    "gui-sources": "role in ('sys-admin','geo-admin','metadata-admin')",
    "gui-source-create": "role in ('sys-admin')",
    "gui-source-delete": "role in ('sys-admin')",
    "gui-crs": "role in ('sys-admin','geo-admin','metadata-admin')",
    "gui-crs-read": "role in ('metadata-admin')",
    "gui-crs-create": "role in ('sys-admin','metadata-admin')",
    "gui-crs-delete": "role in ('sys-admin','metadata-admin')",
    "gui-crs-edit": "role in ('metadata-admin')",
    "gui-ontologies": "role in ('sys-admin','metadata-admin')",
    "gui-ontology-import": "role in ('sys-admin','metadata-admin')",
    "gui-ontology-read": "role in ('sys-admin','metadata-admin')",
    "gui-ontology-edit": "role in ('sys-admin','metadata-admin')",
    "gui-ontology-delete": "role in ('sys-admin','metadata-admin')",
    "gui-terms": "role in ('sys-admin','metadata-admin')",
    "gui-term-read": "role in ('sys-admin','metadata-admin')",
    "gui-term-delete": "role in ('sys-admin','metadata-admin')",
    "gui-publications": "role in ('sys-admin')",
    "gui-publication-create": "role in ('sys-admin')",
    "gui-publication-read": "role in ('sys-admin')",
    "gui-publication-edit": "role in ('sys-admin')",
    "gui-publication-delete": "role in ('sys-admin')",
    "gui-taxonomies": "role in ('sys-admin','metadata-admin')",
    "gui-taxonomy-import": "role in ('sys-admin','metadata-admin')",
    "gui-taxonomy-read": "role in ('sys-admin','metadata-admin')",
    "gui-taxonomy-edit": "role in ('sys-admin','metadata-admin')",
    "gui-taxonomy-delete": "role in ('sys-admin','metadata-admin')",
    "gui-users": "role in ('sys-admin','acl-admin')",
    "gui-users-authorize": "role in ('sys-admin','acl-admin')",
    "gui-user-read": "role in ('sys-admin','acl-admin')",
    "gui-user-create": "role in ('sys-admin','acl-admin')",
    "gui-user-edit": "role in ('sys-admin','acl-admin')",
    "gui-user-edit-roles": "role in ('sys-admin','acl-admin')",
    "gui-user-delete": "role in ('sys-admin','acl-admin')",
    "gui-roles": "role in ('sys-admin','acl-admin')",
    "gui-role-create": "role in ('sys-admin','acl-admin')",
    "gui-role-edit": "role in ('sys-admin','acl-admin')",
    "gui-role-delete": "role in ('sys-admin','acl-admin')",
    "gui-organisms": "role in ('sys-admin','acl-admin')",
    "gui-organizations": "role in ('sys-admin','acl-admin')",
    "gui-organization-read": "role in ('sys-admin','acl-admin')",
    "gui-organization-create": "role in ('sys-admin','acl-admin')",
    "gui-organization-edit": "role in ('sys-admin','acl-admin')",
    "gui-organization-delete": "role in ('sys-admin','acl-admin')",
    "gui-groups": "role in ('sys-admin')",
    "gui-authenticators": "role in ('sys-admin')",
    "gui-permission-types": "role in ('sys-admin')",
    "gui-system-functions": "role in ('sys-admin')",
    "gui-references-acl": "role in ('sys-admin')",
    "gui-reference-acl-read": "role in ('sys-admin')",
    "gui-annotation-fields": "role in ('sys-admin')",
    "gui-annotation-field-create": "role in ('sys-admin')",
    "gui-annotation-field-read": "role in ('sys-admin')",
    "gui-annotation-field-edit": "role in ('sys-admin')",
    "gui-annotation-field-delete": "role in ('sys-admin')",
    "gui-annotation-field-acl": "role in ('sys-admin')",
    "gui-annotation-templates": "role in ('sys-admin')",
    "gui-annotation-template-create": "role in ('sys-admin')",
    "gui-annotation-template-read": "role in ('sys-admin')",
    "gui-annotation-template-edit": "role in ('sys-admin')",
    "gui-annotation-template-delete": "role in ('sys-admin')",
    "gui-annotation-template-acl": "role in ('sys-admin')",
    "gui-viewers": "role in ('sys-admin')",
    "gui-viewer-create": "role in ('sys-admin')",
    "gui-viewer-delete": "role in ('sys-admin')",
    "gui-viewer-acl": "role in ('sys-admin')",
    "gui-status-checkers": "role in ('sys-admin')",
}

tm_browser_filter_form_fields = ("id", "uuid")
tm_browser_filter_forms = [
    (data_object_type_id["geolayer"], "b4d58b86-114d-47fd-b813-ce3fcf18cbf1"),
    (data_object_type_id["grid"], "dda18cf6-0449-4824-9a6d-3b86760f27ff"),
    (data_object_type_id["dataframe"], "c645a547-49c4-49d9-a151-a81ad404c38e"),
]

ht_cl_name = "Code List"
tm_hierarchy_types = {
    "45e91fea-6ca3-40c8-a798-98ca6a8e0e2a": ht_cl_name,
    "f3625ee6-99e1-4db9-82e4-adb6c1a01762": "Hierarchical Code List",
}

h_subjects_name = "Temas"
h_sources_name = "Fuentes"
h_crs_name = "CRS"
h_base_maps_name = "Mapas Base"
tm_hierarchies_fields = ((HierarchyType, "name", "id", "h_type_id"), "uuid", "name")
tm_hierarchies = [
    (ht_cl_name, "9975f4a0-a321-409a-bb2b-7afd05a60117", h_subjects_name),
    (ht_cl_name, "8267366d-97c7-47d8-83b5-68fe763c5e81", h_sources_name),
    (ht_cl_name, "7cdc80c7-739d-4787-8529-b52f83994930", h_crs_name),
    (ht_cl_name, "7ece7ead-4de9-436f-a12d-86350129e444", h_base_maps_name),
]

tm_code_list_fields = ((Hierarchy, "name", "id", "hierarchy_id"), "uuid", "name")
tm_code_list_subjects = [
    (h_subjects_name, "2d1d71be-2e7e-4c0a-8d4c-21d2bc5bdad6", "Altimetría y modelos digitales"),
    (h_subjects_name, "eb85c308-61e3-4be6-b2c4-4d86b46a62f8", "Ámbitos de Ordenación Específicos"),
    (h_subjects_name, "68ecc77c-bc78-4352-a407-ee7bb06c04d1", "Áreas de Especial Protección"),
    (h_subjects_name, "08bd7b77-a977-4447-962b-78c0796bc06a", "Cartografía Específica"),
    (h_subjects_name, "dd1cd206-a45c-43d4-95aa-a0f1ac3c5f96", "Catastro"),
    (h_subjects_name, "1247d2cd-dcd1-4238-b44f-ea816c97b084", "Clima"),
    (h_subjects_name, "cb6b0956-4511-42d9-a75b-3b45f094a786", "Coberturas físicas y biológicas"),
    (h_subjects_name, "fdef90ae-c9c1-4415-8bf8-19b31799beb5", "Datos Estadísticos"),
    (h_subjects_name, "343e8354-925f-4c8e-aefa-7834ff2c3cc6", "Edafología"),
    (h_subjects_name, "763a0def-dc78-4561-9f8d-042d09b36ff9", "Elementos hidrográficos"),
    (h_subjects_name, "c5832d73-ba79-46e0-9448-21d0c101927f", "Entidades de población"),
    (h_subjects_name, "efc017c3-45f8-4811-9262-bfb92efc3204", "Equipamientos y servicios"),
    (h_subjects_name, "3fa8c241-05e8-40a3-8f75-e193bfe69999", "Geocodificaciones"),
    (h_subjects_name, "a26d12d3-ead3-4681-95d6-c6fb0c6cbb10", "Infraestructuras y redes de transporte"),
    (h_subjects_name, "1bfd9a77-891d-4863-aa33-09c5976ee823", "Instalaciones agrarias y acuicultura"),
    (h_subjects_name, "57acf475-21d0-4270-a947-5b20ab299539", "Instalaciones Industriales"),
    (h_subjects_name, "f5c2afb6-27ff-4118-91a5-75e6a9541763", "Malla demográfica"),
    (h_subjects_name, "42a78b57-b610-4b66-af4d-ebf090666cba", "Nomenclator de Población"),
    (h_subjects_name, "86ee31c5-bb1a-4c88-af9c-298084920c19", "Ortofotos"),
    (h_subjects_name, "d57653c7-cf75-4333-8677-c58bdf9b0a93", "Otros sin asignación"),
    (h_subjects_name, "809b6d03-db8f-4543-bc4d-93a93dca1839", "Protección Territorial"),
    (h_subjects_name, "8d746d7f-2309-4389-92d1-54ae6015a78f", "Referencias Geográficas"),
    (h_subjects_name, "0afe9d50-7ce8-41ec-9ef2-55712258c43f", "Riesgos"),
    (h_subjects_name, "1497662c-e31a-418c-ae5e-e0eb8e98888e", "Salud y seguridad humana"),
    (h_subjects_name, "ffadcde3-60bf-43e5-9aec-1b54d89370c9", "Unidades Estadísticas"),
    (h_subjects_name, "b8e58143-fe0e-440a-995b-576d2e1e9d51", "Usos del Suelo")
]

tm_code_list_crs = [
    (h_crs_name, "9c534897-2fd6-4165-b161-c0317ff59718", "EPSG:4326"),
    (h_crs_name, "9cbb027f-e532-4d81-bb66-467a06008429", "EPSG:32628"),
]

tm_code_list_sources = [
    (h_sources_name, "d77abee2-17ff-4063-8b54-a8e35647a5f0", "Grafcan"),
    (h_sources_name, "d05c68e7-5674-4b10-8cea-7b9cb8f1b798", "ISTAC"),
    (h_sources_name, "b2be8a7a-67f2-4fd1-afee-cb89164767a9", "ITC"),
    (h_sources_name, "55e9958c-2f73-47c4-afa6-37bf23c683f9", "EUROSTAT"),
]

tm_code_list_base_maps = [
    (h_base_maps_name, "d77abee2-17ff-4063-8b54-a8e35647a5f0", "Grafcan OrtoExpress - https://idecan1.grafcan.es/ServicioWMS/OrtoExpress"),
    (h_base_maps_name, "071a22e8-1d90-4900-936a-0466880480d4", "Grafcan Mapa Topográfico Integrado - https://idecan2.grafcan.es/ServicioWMS/MTI"),
    (h_base_maps_name, "faec0128-c0e3-4c2c-bbb2-bd852430eed3", "Grafcan Ortofoto Urbana alta resolución - https://idecan1.grafcan.es/ServicioWMS/OrtoUrb"),
    (h_base_maps_name, "b4f90851-250e-425f-9a94-b677b593c842", "Grafcan Modelo LIDAR - https://idecan1.grafcan.es/ServicioWMS/MTL"),
    (h_base_maps_name, "d04fc218-8dea-4938-a4d0-49e3d8174715", "Grafcan Modelo Sombras - https://idecan2.grafcan.es/ServicioWMS/MDSombras"),
    (h_base_maps_name, "07c7512b-d7ce-4162-85c4-cda2503f290c", "Grafcan Alta Resolución - https://idecan2.grafcan.es/ServicioWMS/Gigapan")
]

tm_file_system_storages_fields = ["uuid", "storage_type"]
tm_file_system_storages = [
    ("20fbce2d-17a6-400a-8a34-73a6fc07a098", "embedded")
]

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


def initialize_kernel_data(db: Session):
    load_table(db, Identity, tm_default_users)
    load_table(db, Authenticator, tm_authenticators)
    load_table_extended(db, ObjectType, tm_object_type_fields, tm_object_types)
    load_table_extended(db, PermissionType, tm_permissions_fields, tm_permissions, update=True)
    load_many_to_many_table(db, ObjectTypePermissionType, ObjectType, PermissionType, ["object_type_id", "permission_type_id"], tm_object_types_permissions)
    load_table(db, SystemFunction, tm_system_functions)
    load_table(db, Group, tm_default_groups)
    load_table(db, Role, tm_default_roles)
    load_table(db, HierarchyType, tm_hierarchy_types)
    load_table_extended(db, Hierarchy, tm_hierarchies_fields, tm_hierarchies)
    load_table_extended(db, HierarchyNode, tm_code_list_fields, tm_code_list_subjects)
    load_table_extended(db, HierarchyNode, tm_code_list_fields, tm_code_list_sources)
    load_table_extended(db, HierarchyNode, tm_code_list_fields, tm_code_list_crs)
    load_table_extended(db, HierarchyNode, tm_code_list_fields, tm_code_list_base_maps)
    load_table_extended(db, FileSystemStorage, tm_file_system_storages_fields, tm_file_system_storages)

    # Load bootstrap screens for UI management
    _load_bootstrap_screens(db)

    # Load bootstrap menus for dynamic sidebar navigation
    _load_bootstrap_menus(db)

    # Create or update reference objects and set their permissions
    refs = [
        (CaseStudy, "c2880b3b-65f1-44b1-940b-a3769eb16499", [("role", "sys-admin", "read")]),
        (Dataset, "95c9e713-092b-4068-af3a-d9ae2059c5d2", [("role", "sys-admin", "read")]),
        (GeographicLayer, "d0f0ee40-7595-4581-8f5b-bccac087c8b9", [("role", "sys-admin", "read")]),
        (View, "f9e5bbe1-0acf-4d9b-a564-db180f106695", [("role", "sys-admin", "read")]),
        (Dashboard, "ae4e074c-3dd9-4eae-8fc3-6b54a623cbc7", [("role", "sys-admin", "read")]),
    ]
    for model, uid, perms in refs:
        create_or_update_acl_reference_object(db, model, uid, perms)

    # Long DB session
    session = db
    # ACLs for system functions
    stmt = select(SystemFunction).where(SystemFunction.name.in_(tm_system_functions_rules.keys()))
    system_functions = session.scalars(stmt).all()
    system_function = {f.name: f for f in system_functions}

    stmt = select(ObjectType).where(ObjectType.name == "sys-function")
    sys_function_obj_type = session.scalar(stmt)

    for function, expression in tm_system_functions_rules.items():
        uuid = system_function[function].uuid
        stmt = select(ACL).where(and_(ACL.object_type == sys_function_obj_type.id, ACL.object_uuid == uuid))
        acl = session.scalar(stmt)

        if not acl:
            # f = system_function[function]
            # f.can_execute_rule = expression
            # session.add(f)
            acl = ACL()
            acl.object_type = sys_function_obj_type.id
            acl.object_uuid = uuid
            session.add(acl)
            acl_expression = ACLExpression()
            acl_expression.acl = acl
            acl_expression.expression = expression
            session.add(acl_expression)
        else:
            stmt = select(ACLExpression).where(ACLExpression.acl == acl)
            acl_expression = session.scalar(stmt)

            if not acl_expression:
                f = system_function[function]
                f.can_execute_rule = expression
                session.add(f)
                acl_expression = ACLExpression()
                acl_expression.acl = acl
                acl_expression.expression = expression
                session.add(acl_expression)
            # DISABLED: "expression" can be modified using the GUI, by a sys-admin
            # else:
            #     acl_expression.expression = expression
    # load_table_extended(db, BrowserFilterForm, tm_browser_filter_form_fields, tm_browser_filter_forms)

    # Load default authentication for "test_user"
    test_user_id = "test_user"
    authenticator_id = "5f32a593-306f-4b69-983c-0a5680556fae"  # "local". Just the user name is good to be authorized

    stmt = select(Identity).where(Identity.name == test_user_id)
    iden = session.scalar(stmt)

    stmt = select(Authenticator).where(Authenticator.uuid == authenticator_id)
    authentication = session.scalar(stmt)

    stmt = select(IdentityAuthenticator).where(
        and_(IdentityAuthenticator.identity == iden, IdentityAuthenticator.authenticator == authentication))
    iden_authentication = session.scalar(stmt)

    if not iden_authentication:
        iden_authentication = IdentityAuthenticator()
        iden_authentication.identity = iden
        iden_authentication.authenticator = authentication
        iden_authentication.name = test_user_id
        iden_authentication.email = "test@test.org"
        session.add(iden_authentication)

    # Celery user, also with local authentication
    celery_user_id = "celery_user"
    stmt = select(Identity).where(Identity.name == celery_user_id)
    iden = session.scalar(stmt)

    stmt = select(IdentityAuthenticator).where(
        and_(IdentityAuthenticator.identity == iden, IdentityAuthenticator.authenticator == authentication))
    iden_authentication = session.scalar(stmt)

    if not iden_authentication:
        iden_authentication = IdentityAuthenticator()
        iden_authentication.identity = iden
        iden_authentication.authenticator = authentication
        iden_authentication.name = celery_user_id
        iden_authentication.email = "celery@celery.org"
        session.add(iden_authentication)

    # _anonymous user, also with local authentication
    anonymous_user_id = "_anonymous"
    stmt = select(Identity).where(Identity.name == anonymous_user_id)
    iden = session.scalar(stmt)

    stmt = select(IdentityAuthenticator).where(
        and_(IdentityAuthenticator.identity == iden, IdentityAuthenticator.authenticator == authentication))
    iden_authentication = session.scalar(stmt)

    if not iden_authentication:
        iden_authentication = IdentityAuthenticator()
        iden_authentication.identity = iden
        iden_authentication.authenticator = authentication
        iden_authentication.name = anonymous_user_id
        iden_authentication.email = "_@anonymous.org"
        session.add(iden_authentication)
    # Set test_user roles and groups
    load_many_to_many_table(db, RoleIdentity, Role, Identity, ["role_id", "identity_id"],
                            [("sys-admin", test_user_id),
                             ("sys-admin", celery_user_id),
                             ("guest", anonymous_user_id)])
    load_many_to_many_table(db, GroupIdentity, Group, Identity, ["group_id", "identity_id"],
                            [("all-identified", test_user_id)])


    db.commit()


# Alias deprecado: la semilla "de todo" pre-micronucleo. Hoy la semilla de
# dominios vive en el on_seed de cada plugin contrib y esta funcion solo
# siembra el kernel.
initialize_database_data = initialize_kernel_data
