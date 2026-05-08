import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.rag_pipeline import RAGPipeline
from app.db.database import get_db
from app.schemas.chat import AskRequest, AskResponse
from app.services.qdrant_service import QdrantDimensionError

router = APIRouter(prefix="/chat", tags=["chat"])


def sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/ask", response_model=AskResponse)
def ask(request: AskRequest, db: Session = Depends(get_db)) -> AskResponse:
    try:
        return RAGPipeline().ask(db, request)
    except QdrantDimensionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/stream")
def stream(request: AskRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    def events():
        try:
            for event, data in RAGPipeline().stream_ask(db, request):
                yield sse_event(event, data)
        except QdrantDimensionError as exc:
            yield sse_event("error", {"message": str(exc)})
        except RuntimeError as exc:
            yield sse_event("error", {"message": str(exc)})
        except Exception:
            yield sse_event("error", {"message": "Streaming failed unexpectedly. Please retry or use the non-streaming endpoint."})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
