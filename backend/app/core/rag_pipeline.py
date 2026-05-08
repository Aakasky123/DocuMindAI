import time
from collections.abc import Iterator

from sqlalchemy.orm import Session

from app.core.retriever import HybridRetriever
from app.db.models import ChatQuery, CitationRecord
from app.schemas.chat import AskRequest, AskResponse
from app.schemas.citation import Citation
from app.services.ollama_service import OllamaService
from app.services.openai_service import OpenAIService


class RAGPipeline:
    def __init__(self) -> None:
        self.retriever = HybridRetriever()

    def ask(self, db: Session, request: AskRequest) -> AskResponse:
        start = time.perf_counter()
        contexts = self._retrieve(db, request)
        generator = OllamaService() if request.model_provider == "ollama" else OpenAIService()
        answer = generator.answer(request.question, [item["text"] for item in contexts])
        latency_ms = int((time.perf_counter() - start) * 1000)
        citations = self._build_citations(contexts)
        self._persist_chat(db, request, answer, citations, latency_ms)
        return AskResponse(
            answer=answer,
            citations=citations,
            latency_ms=latency_ms,
            model_provider=request.model_provider,
            retrieval_mode=request.retrieval_mode,
        )

    def stream_ask(self, db: Session, request: AskRequest) -> Iterator[tuple[str, dict]]:
        start = time.perf_counter()
        contexts = self._retrieve(db, request)
        citations = self._build_citations(contexts)
        yield (
            "metadata",
            {
                "model_provider": request.model_provider,
                "retrieval_mode": request.retrieval_mode,
                "latency_start_ms": 0,
                "citation_count": len(citations),
            },
        )
        for citation in citations:
            yield ("citation", citation.model_dump())

        answer_parts: list[str] = []
        try:
            generator = OllamaService() if request.model_provider == "ollama" else OpenAIService()
            for text in generator.stream_answer(request.question, [item["text"] for item in contexts]):
                if not text:
                    continue
                answer_parts.append(text)
                yield ("token", {"text": text})
        except Exception:
            yield ("error", {"message": "The answer stream failed after retrieval. Try again or use the non-streaming fallback."})
            return

        answer = "".join(answer_parts).strip()
        if not answer and citations:
            answer = "Retrieved relevant context, but no generated answer was returned."
            yield ("token", {"text": answer})

        latency_ms = int((time.perf_counter() - start) * 1000)
        self._persist_chat(db, request, answer, citations, latency_ms)
        yield (
            "done",
            {
                "latency_ms": latency_ms,
                "model_provider": request.model_provider,
                "retrieval_mode": request.retrieval_mode,
                "citations": [citation.model_dump() for citation in citations],
            },
        )

    def _retrieve(self, db: Session, request: AskRequest) -> list[dict]:
        return self.retriever.retrieve(
            db,
            request.question,
            request.document_ids,
            request.retrieval_mode,
            request.model_provider,
            request.top_k,
        )

    def _build_citations(self, contexts: list[dict]) -> list[Citation]:
        return [
            Citation(
                document_id=item["document_id"],
                document_name=item["document_name"],
                page_number=item["page_number"],
                chunk_id=item["chunk_id"],
                score=float(item["score"]),
                text_preview=item["text"][:280],
            )
            for item in contexts
        ]

    def _persist_chat(
        self,
        db: Session,
        request: AskRequest,
        answer: str,
        citations: list[Citation],
        latency_ms: int,
    ) -> None:
        query = ChatQuery(
            question=request.question,
            answer=answer,
            retrieval_mode=request.retrieval_mode,
            model_provider=request.model_provider,
            latency_ms=latency_ms,
        )
        db.add(query)
        db.flush()
        for rank, citation in enumerate(citations, start=1):
            db.add(
                CitationRecord(
                    query_id=query.id,
                    document_id=citation.document_id,
                    chunk_id=citation.chunk_id,
                    page_number=citation.page_number,
                    score=citation.score,
                    rank=rank,
                )
            )
        db.commit()
