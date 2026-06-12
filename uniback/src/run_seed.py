import os

from uniback.config.settings import Settings
from uniback.persistence.session import create_session_factory
from uniback.persistence.seeding import initialize_kernel_data
from uniback.plugins import plugin_manager

settings = Settings()
node_type = os.getenv("UNIBACK_NODE_TYPE", "monolith")
plugin_manager.discover_internal()
plugin_dir = os.getenv(
    "UNIBACK_PLUGINS_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "plugins"),
)
plugin_manager.discover_plugins(plugin_dir)

session_manager = create_session_factory(settings.database.url)
with session_manager.session_scope() as db:
    initialize_kernel_data(db)
    plugin_manager.emit_on_seed(db, node_type)
    print("Database seeded successfully.")
