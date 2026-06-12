from celery import Celery
from uniback.config.settings import get_settings

# Initialize settings
settings = get_settings()

# Create Celery instance
celery_app = Celery(
    "uniback",
    broker=settings.worker.broker_url,
    backend=settings.worker.backend_url
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Autodiscover tasks from uniback modules
celery_app.autodiscover_tasks([
    "uniback.services.sys",
    "uniback.contrib.files",
])

if __name__ == "__main__":
    celery_app.start()
