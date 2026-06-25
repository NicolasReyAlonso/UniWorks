from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Tuple, Union

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

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
)

from uniback.persistence.utils import (
    load_table as load_table_util,
    load_table_extended as load_table_extended_util,
    load_many_to_many_table as load_many_to_many_table_util,
    create_or_update_acl_reference_object as create_or_update_acl_reference_object_util
)
from uniback.utils.common import hash_password

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
    (data_object_type_id["case_study"], "5f4c1666-e509-436b-8844-082ebe88b2b9", "case_study"),
    (data_object_type_id["collection"], "34a339c6-2015-4b0a-a3da-acf6fce335ca", "collection"),
    (data_object_type_id["sys-function"], "ad83dcb0-e479-4a44-acf5-387b9731e8da", "sys-function"),
    (data_object_type_id["none"], "b5371878-582a-4758-9c7c-9e536c477992", "none"),  # Nulled items
    (data_object_type_id["dataframe"], "78009a6b-63f5-41df-b20b-5642214b9f03", "dataframe"),
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
]

tm_default_users = {  # Identities
    "0fc2b361-847c-4b2e-8fbd-533092133eef": "admin",
    "74d20b2c-5b49-462c-8d19-8a72f47b5d1b": "_anonymous",
    "91c8008e-97d5-440c-b3fc-f5a409a44768": "test_user",
    "1c8b0500-32d2-40ce-8da0-4fc772f4c3a3": "celery_user",
    "2b6d4f8a-1c3e-4d5b-8a9f-0e1d2c3b4a56": "demo"
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
    "15aa399f-dd58-433f-8e94-5b2222cd06c9": "local-api-key",
    "8d1f0a2c-3b4e-4a6d-9c0f-2e7a1b5c9d34": "basic",
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


def initialize_kernel_data(db: Session):
    load_table(db, Identity, tm_default_users)
    load_table(db, Authenticator, tm_authenticators)
    load_table_extended(db, ObjectType, tm_object_type_fields, tm_object_types)
    load_table_extended(db, PermissionType, tm_permissions_fields, tm_permissions, update=True)
    load_many_to_many_table(db, ObjectTypePermissionType, ObjectType, PermissionType, ["object_type_id", "permission_type_id"], tm_object_types_permissions)
    load_table(db, SystemFunction, tm_system_functions)
    load_table(db, Group, tm_default_groups)
    load_table(db, Role, tm_default_roles)

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

    # Demo user for the built-in "basic" (username/password) provider, so the
    # multi-provider login can be showcased out of the box (demo / demo1234).
    demo_user_id = "demo"
    basic_authenticator_uuid = "8d1f0a2c-3b4e-4a6d-9c0f-2e7a1b5c9d34"
    stmt = select(Identity).where(Identity.name == demo_user_id)
    iden = session.scalar(stmt)
    if iden:
        iden.can_login = True
        stmt = select(Authenticator).where(Authenticator.uuid == basic_authenticator_uuid)
        basic_authenticator = session.scalar(stmt)
        stmt = select(IdentityAuthenticator).where(
            and_(IdentityAuthenticator.identity == iden,
                 IdentityAuthenticator.authenticator == basic_authenticator))
        iden_authentication = session.scalar(stmt)
        if not iden_authentication and basic_authenticator:
            iden_authentication = IdentityAuthenticator()
            iden_authentication.identity = iden
            iden_authentication.authenticator = basic_authenticator
            iden_authentication.name = demo_user_id
            iden_authentication.email = "demo@demo.org"
            iden_authentication.authenticator_info = {"password_hash": hash_password("demo1234")}
            session.add(iden_authentication)

    # Set test_user roles and groups
    load_many_to_many_table(db, RoleIdentity, Role, Identity, ["role_id", "identity_id"],
                            [("sys-admin", test_user_id),
                             ("sys-admin", celery_user_id),
                             ("guest", anonymous_user_id),
                             ("guest", demo_user_id)])
    load_many_to_many_table(db, GroupIdentity, Group, Identity, ["group_id", "identity_id"],
                            [("all-identified", test_user_id)])


    db.commit()


# Alias deprecado: la semilla "de todo" pre-micronucleo. Hoy la semilla de
# dominios vive en el on_seed de cada plugin contrib y esta funcion solo
# siembra el kernel.
initialize_database_data = initialize_kernel_data
