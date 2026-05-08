from pydantic import BaseModel


class Citation(BaseModel):
    document_id: str
    document_name: str
    page_number: int | None = None
    chunk_id: str
    score: float
    text_preview: str
