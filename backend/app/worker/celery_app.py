import logging

from celery import Celery
from celery.signals import worker_ready

from app.core.config import get_settings

settings = get_settings()
celery_app = Celery(
    "documind",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.worker.tasks"],
)
celery_app.conf.task_routes = {"app.worker.tasks.*": {"queue": "documents"}}

logger = logging.getLogger(__name__)


@worker_ready.connect
def log_registered_tasks(sender=None, **_: object) -> None:
    registered_tasks = sorted(
        task_name
        for task_name in celery_app.tasks.keys()
        if not task_name.startswith("celery.")
    )
    logger.info("Registered Celery tasks: %s", registered_tasks)
