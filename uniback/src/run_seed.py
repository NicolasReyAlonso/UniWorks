import sys
from uniback.config.settings import Settings
from uniback.persistence.session import create_session_factory
from uniback.persistence.seeding import initialize_database_data

settings = Settings()
session_manager = create_session_factory(settings.database.url)
with session_manager.session_scope() as db:
    initialize_database_data(db)
    print("Database seeded successfully.")
