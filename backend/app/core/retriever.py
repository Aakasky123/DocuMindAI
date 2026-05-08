from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.reranker import Reranker
from app.db.models import Chunk, Document
from app.services.bm25_service import BM25Service
from app.services.ollama_service import OllamaService
from app.services.openai_service import OpenAIService
from app.services.qdrant_service import QdrantDimensionError, QdrantService


class HybridRetriever:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.bm25 = BM25Service()
        self.reranker = Reranker(self.settings.reranker_model)

    def retrieve(
        self,
        db: Session,
        question: str,
        document_ids: list[str],
        retrieval_mode: str,
        provider: str,
        top_k: int,
    ) -> list[dict]:
        scores: dict[str, float] = {}
        if retrieval_mode in {"vector", "hybrid"}:
            try:
                embedder = OllamaService() if provider == "ollama" else OpenAIService()
                embedding_provider = provider
                if provider == "openai" and isinstance(embedder, OpenAIService) and not embedder.is_configured():
                    embedding_provider = "local"
                query_vector = embedder.embed([question])[0]
                for item in QdrantService().search(query_vector, document_ids, self.settings.vector_top_k, provider=embedding_provider):
                    scores[item["chunk_id"]] = scores.get(item["chunk_id"], 0) + item["score"] * 0.65
            except QdrantDimensionError:
                raise
            except Exception as exc:
                if retrieval_mode == "vector":
                    raise RuntimeError(f"Vector retrieval failed: {exc}") from exc
        if retrieval_mode in {"keyword", "hybrid"}:
            for item in self.bm25.search(db, question, document_ids, self.settings.bm25_top_k):
                weight = 1.0 if retrieval_mode == "keyword" else 0.35
                scores[item["chunk_id"]] = scores.get(item["chunk_id"], 0) + item["score"] * weight

        if not scores and retrieval_mode == "vector":
            return []

        chunks = db.query(Chunk, Document).join(Document, Chunk.document_id == Document.id).filter(Chunk.id.in_(scores)).all()
        candidates = [
            {
                "chunk_id": chunk.id,
                "document_id": doc.id,
                "document_name": doc.filename,
                "page_number": chunk.page_number,
                "text": chunk.text,
                "score": scores.get(chunk.id, 0.0),
            }
            for chunk, doc in chunks
        ]
        reranked = self.reranker.rerank(question, candidates, min(top_k, self.settings.rerank_top_k))
        return reranked[:top_k]
