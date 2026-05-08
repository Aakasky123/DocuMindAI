from datetime import datetime
from typing import Literal

from pydantic import BaseModel


DocumentStatus = Literal["queued", "processing", "completed", "failed"]


class DocumentUploadResponse(BaseModel):
    document_id: str
    task_id: str
    status: DocumentStatus
    message: str


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    status: str
    num_pages: int | None = None
    created_at: datetime
    processed_at: datetime | None = None
    error_message: str | None = None

    model_config = {"from_attributes": True}


class ChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    page_number: int | None = None
    text: str
    token_count: int
    metadata_json: dict

    model_config = {"from_attributes": True}
