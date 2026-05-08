import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import Chunk, Document, ProcessingTask
from app.schemas.document import ChunkResponse, DocumentResponse, DocumentUploadResponse
from app.services.qdrant_service import QdrantService
from app.worker.tasks import process_document

router = APIRouter(prefix="/documents", tags=["documents"])
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)) -> DocumentUploadResponse:
    settings = get_settings()
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported")

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    document_id = str(uuid.uuid4())
    safe_name = Path(file.filename or f"upload{suffix}").name
    file_path = settings.upload_dir / f"{document_id}_{safe_name}"
    file_path.write_bytes(await file.read())

    document = Document(id=document_id, filename=safe_name, file_type=suffix.lstrip("."), status="queued", file_path=str(file_path))
    task_id = str(uuid.uuid4())
    task = ProcessingTask(id=task_id, document_id=document_id, status="queued", progress=0)
    db.add_all([document, task])
    db.commit()
    process_document.delay(document_id, task_id)
    return DocumentUploadResponse(document_id=document_id, task_id=task_id, status="queued", message="Document queued for processing")


@router.get("", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)) -> list[Document]:
    return db.query(Document).order_by(Document.created_at.desc()).all()


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)) -> Document:
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.delete("/{document_id}", response_model=dict)
def delete_document(document_id: str, db: Session = Depends(get_db)) -> dict:
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        QdrantService().delete_document(document_id)
    except Exception:
        pass
    db.delete(document)
    db.commit()
    try:
        Path(document.file_path).unlink(missing_ok=True)
    except Exception:
        pass
    return {"status": "deleted", "document_id": document_id}


@router.get("/{document_id}/chunks", response_model=list[ChunkResponse])
def list_chunks(document_id: str, db: Session = Depends(get_db)) -> list[Chunk]:
    return db.query(Chunk).filter(Chunk.document_id == document_id).order_by(Chunk.chunk_index).all()
