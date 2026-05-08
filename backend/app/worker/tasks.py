from datetime import datetime

from celery.utils.log import get_task_logger

from app.core.chunker import chunk_text
from app.core.document_parser import parse_document
from app.db.database import SessionLocal
from app.db.models import Chunk, Document, ProcessingTask
from app.services.ollama_service import OllamaService
from app.services.openai_service import OpenAIService
from app.services.qdrant_service import QdrantService
from app.worker.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(name="app.worker.tasks.process_document", bind=True)
def process_document(self, document_id: str, task_id: str, provider: str = "openai") -> None:
    logger.info(
        "Starting document processing task_id=%s document_id=%s provider=%s celery_task_id=%s",
        task_id,
        document_id,
        provider,
        self.request.id,
    )
    db = SessionLocal()
    try:
        task = db.get(ProcessingTask, task_id)
        doc = db.get(Document, document_id)
        if not task or not doc:
            logger.warning(
                "Skipping document processing because task or document is missing task_id=%s document_id=%s",
                task_id,
                document_id,
            )
            return
        task.status = "processing"
        task.progress = 10
        task.started_at = datetime.utcnow()
        doc.status = "processing"
        db.commit()

        pages, num_pages = parse_document(doc.file_path)
        task.progress = 35
        doc.num_pages = num_pages
        db.commit()

        chunk_payloads = []
        for page in pages:
            for item in chunk_text(page["text"], page.get("page_number")):
                chunk = Chunk(
                    document_id=doc.id,
                    chunk_index=len(chunk_payloads),
                    page_number=item["page_number"],
                    text=item["text"],
                    token_count=item["token_count"],
                    metadata_json={"filename": doc.filename},
                )
                db.add(chunk)
                db.flush()
                chunk_payloads.append(chunk)
        task.progress = 55
        db.commit()

        embedder = OllamaService() if provider == "ollama" else OpenAIService()
        embedding_provider = provider
        if provider == "openai" and isinstance(embedder, OpenAIService) and not embedder.is_configured():
            embedding_provider = "local"
        embeddings = embedder.embed([chunk.text for chunk in chunk_payloads])
        collection_name, point_ids = QdrantService().upsert_chunks(
            embeddings,
            [
                {
                    "chunk_id": chunk.id,
                    "document_id": chunk.document_id,
                    "filename": doc.filename,
                    "page_number": chunk.page_number,
                }
                for chunk in chunk_payloads
            ],
            provider=embedding_provider,
        )
        for chunk, point_id in zip(chunk_payloads, point_ids, strict=True):
            chunk.qdrant_point_id = point_id
            chunk.metadata_json = {
                **(chunk.metadata_json or {}),
                "embedding_provider": embedding_provider,
                "vector_size": len(embeddings[0]) if embeddings else 0,
                "qdrant_collection": collection_name,
            }

        task.status = "completed"
        task.progress = 100
        task.completed_at = datetime.utcnow()
        doc.status = "completed"
        doc.processed_at = datetime.utcnow()
        db.commit()
        logger.info(
            "Completed document processing task_id=%s document_id=%s chunks=%s",
            task_id,
            document_id,
            len(chunk_payloads),
        )
    except Exception as exc:
        logger.exception(
            "Failed document processing task_id=%s document_id=%s error=%s",
            task_id,
            document_id,
            exc,
        )
        task = db.get(ProcessingTask, task_id)
        doc = db.get(Document, document_id)
        if task:
            task.status = "failed"
            task.error_message = str(exc)
            task.completed_at = datetime.utcnow()
        if doc:
            doc.status = "failed"
            doc.error_message = str(exc)
        db.commit()
        raise
    finally:
        db.close()
