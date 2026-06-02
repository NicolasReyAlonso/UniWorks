import redis
from uniback.config.settings import Settings

class RedisManager:
    """Manages Redis connections for sessions and locking."""
    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = None

    @property
    def client(self) -> redis.Redis:
        """Get or create the Redis client."""
        if self._client is None:
            r_settings = self.settings.redis
            self._client = redis.Redis(
                host=r_settings.host,
                port=r_settings.port,
                db=r_settings.db,
                password=r_settings.password,
                decode_responses=r_settings.decode_responses
            )
        return self._client

    def lock(self, name: str, timeout: int = 10):
        """Get a distributed lock."""
        return self.client.lock(name, timeout=timeout)

_redis_manager = None

def get_redis_manager(settings: Settings | None = None) -> RedisManager:
    """Get the global Redis manager instance."""
    global _redis_manager
    if _redis_manager is None and settings:
        _redis_manager = RedisManager(settings)
    if _redis_manager is None:
        # Try to get settings from global instance if not provided
        from uniback.config.settings import get_settings
        _redis_manager = RedisManager(get_settings())
    return _redis_manager
