from uniback import initialize
from uniback.config.settings import get_settings

def create_initialized_app():
    # This calls the initializer which configures mappers and session factory
    _, _, app = initialize(get_settings())
    return app
