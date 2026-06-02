from __future__ import annotations

from enum import Enum
from typing import Any, TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from uniback.persistence.base import JSONB, get_table_prefix
from uniback.persistence.models.core import (
    FunctionalObject,
    data_object_type_id,
    class_to_object_type_id,
)

if TYPE_CHECKING:
    from typing import List


def _tn(name: str) -> str:
    """Apply global table prefix to a table name."""
    return f"{get_table_prefix()}gui_{name}"


class ScreenType(str, Enum):
    """Screen type enumeration."""
    BROWSER = "browser"                    # Read-only grid/list view
    EDITABLE_TABLE = "editable_table"      # Editable grid/table
    FORM = "form"                          # Detail form (single entity or master-detail)


class Screen(FunctionalObject):
    """
    Screen definition for UI rendering.

    Stores the specification for how to view and edit information,
    including:
    - Screen type (browser, editable table, form)
    - Main entity reference
    - UI specification (layout, field mappings, etc.)
    - Data endpoint configuration
    """
    __tablename__ = _tn("screens")
    __mapper_args__ = {
        'polymorphic_identity': data_object_type_id['screen'],
    }

    # Primary key (inherited from FunctionalObject)
    id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{get_table_prefix()}functional_objects.id", ondelete='CASCADE'),
        primary_key=True
    )

    # Screen type discriminator (browser, editable_table, form)
    screen_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default=ScreenType.BROWSER.value
    )

    # Reference to the main entity type this screen manages
    main_entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Endpoint for CRUD operations on the main entity type
    endpoint: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # JSONB field for screen-specific configuration
    # Contains: layout, columns, fields, validations, relations, etc.
    definition: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)


class AppFlavor(FunctionalObject):
    """
    Application flavor/theme definition.

    Defines a way to show the application, including visual theme,
    layout preferences, and other application-wide UI settings.
    """
    __tablename__ = _tn("app_flavors")
    __mapper_args__ = {
        'polymorphic_identity': data_object_type_id['app_flavor'],
    }

    # Primary key (inherited from FunctionalObject)
    id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{get_table_prefix()}functional_objects.id", ondelete='CASCADE'),
        primary_key=True
    )

    # JSONB field for flavor-specific configuration
    # Contains: theme settings, colors, layout preferences, etc.
    definition: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # Relationship to menus (one app flavor can have multiple menus)
    menus: Mapped["List[Menu]"] = relationship(
        "Menu",
        back_populates="app_flavor",
        foreign_keys="Menu.app_flavor_id"
    )


class Menu(FunctionalObject):
    """
    Menu definition for application navigation.

    Represents a hierarchical menu structure that can contain:
    - Other menus (submenus)
    - Screens (leaf items that open a screen)
    
    Each menu belongs to an AppFlavor.
    """
    __tablename__ = _tn("menus")
    __mapper_args__ = {
        'polymorphic_identity': data_object_type_id['menu'],
    }

    # Primary key (inherited from FunctionalObject)
    id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{get_table_prefix()}functional_objects.id", ondelete='CASCADE'),
        primary_key=True
    )

    # Reference to the app flavor this menu belongs to
    app_flavor_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(f"{_tn('app_flavors')}.id", ondelete='CASCADE'),
        nullable=True
    )

    # Self-referential parent menu (for hierarchical structure)
    parent_menu_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(f"{_tn('menus')}.id", ondelete='CASCADE'),
        nullable=True
    )

    # Reference to a screen (if this menu item opens a screen)
    screen_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(f"{_tn('screens')}.id", ondelete='SET NULL'),
        nullable=True
    )

    # Order/position within parent menu
    order: Mapped[int | None] = mapped_column(BigInteger, nullable=True, default=0)

    # Icon for the menu item
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # JSONB field for additional menu configuration
    definition: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    app_flavor: Mapped["AppFlavor | None"] = relationship(
        "AppFlavor",
        back_populates="menus",
        foreign_keys=[app_flavor_id]
    )

    parent_menu: Mapped["Menu | None"] = relationship(
        "Menu",
        remote_side=[id],
        foreign_keys=[parent_menu_id],
        backref="submenus"
    )

    screen: Mapped["Screen | None"] = relationship(
        "Screen",
        foreign_keys=[screen_id]
    )


# Register object type mappings
class_to_object_type_id.update({
    Screen: data_object_type_id['screen'],
    AppFlavor: data_object_type_id['app_flavor'],
    Menu: data_object_type_id['menu'],
})
