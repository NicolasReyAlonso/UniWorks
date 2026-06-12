from uniback.api.crud_factory import make_simple_rest_crud
from uniback.contrib.gui_crud.models import Dashboard, View
from uniback.persistence.models.core import EntityLabel
from uniback.persistence.models.screens import AppFlavor, Menu, Screen

router_viewz = make_simple_rest_crud(View, "viewz", tags=["Views"])
router_dashboards = make_simple_rest_crud(Dashboard, "dashboards", tags=["Dashboards"])


# --- Custom Functions: Screens ---

def custom_screens_filter(_filter, session=None):
    clauses = []
    if _filter.get('screen_type'):
        clauses.append(Screen.screen_type == _filter.get('screen_type'))
    if _filter.get('main_entity_type'):
        clauses.append(Screen.main_entity_type == _filter.get('main_entity_type'))
    return clauses

router_screens = make_simple_rest_crud(
    Screen, "screens",
    aux_filter=custom_screens_filter,
    control_acl=True,
    tags=["Screens, Menus and App Flavors"]
)

# --- Custom Functions: App Flavors ---

router_app_flavors = make_simple_rest_crud(
    AppFlavor, "app_flavors",
    control_acl=True,
    tags=["Screens, Menus and App Flavors"]
)

# --- Custom Functions: Menus ---

def custom_menus_filter(_filter, session=None):
    clauses = []
    if _filter.get('app_flavor_id'):
        clauses.append(Menu.app_flavor_id == _filter.get('app_flavor_id'))
    if _filter.get('parent_menu_id'):
        clauses.append(Menu.parent_menu_id == _filter.get('parent_menu_id'))
    if _filter.get('screen_id'):
        clauses.append(Menu.screen_id == _filter.get('screen_id'))
    # Filter for root menus (no parent)
    if _filter.get('root_only'):
        clauses.append(Menu.parent_menu_id == None)
    return clauses

router_menus = make_simple_rest_crud(
    Menu, "menus",
    aux_filter=custom_menus_filter,
    control_acl=True,
    tags=["Screens, Menus and App Flavors"]
)

# --- Internationalization ---

router_entity_labels = make_simple_rest_crud(
    EntityLabel, "entity_labels",
    tags=["Internationalization"]
)
