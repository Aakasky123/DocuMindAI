from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.citation import Citation


RetrievalMode = Literal["vector", "keyword", "hybrid"]
ModelProvider = Literal["openai", "ollama"]


class AskRequest(BaseModel):
    question: str = Field(..., min_length=2)
    document_ids: list[str] = Field(default_factory=list)
    retrieval_mode: RetrievalMode = "hybrid"
    model_provider: ModelProvider = "openai"
    top_k: int = Field(default=5, ge=1, le=20)


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    latency_ms: int
    model_provider: str
    retrieval_mode: str
