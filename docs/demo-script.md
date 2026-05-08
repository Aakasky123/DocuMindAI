# Demo Script

## Demo Setup

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:5173
- Swagger docs: http://localhost:8000/docs
- Qdrant dashboard: http://localhost:6333/dashboard
- MLflow: http://localhost:5000

## Demo Flow

1. Open the frontend.
2. Upload a PDF.
3. Watch async processing move from queued to processing to completed.
4. View extracted chunks in the chunk drawer.
5. Ask a question in Chat.
6. Show the streamed response.
7. Show citation cards and source previews.
8. Open Swagger docs and show the API surface.
9. Open Qdrant dashboard and show vector storage.
10. Mention the MLflow/RAGAS evaluation foundation.

## 60-Second Spoken Demo

DocuMind AI is a production-grade RAG document intelligence assistant. Users can upload documents, the backend queues processing work asynchronously with Celery and Redis, and the worker parses, chunks, embeds, and indexes the content into Qdrant while metadata is stored in PostgreSQL.

The important part is that this is not a basic PDF chatbot. Uploading returns quickly because processing happens in the background, and every answer is grounded in retrieved chunks with citations so users can trace the answer back to the source document.

When I ask a question, the frontend sends the selected document IDs, retrieval mode, model provider, and top-k value to the FastAPI backend. The system retrieves relevant chunks, assembles a grounded prompt, and streams the answer back token by token so the experience feels responsive like a modern AI product.

Qdrant stores vectors in provider-aware collections, which prevents dimension mismatches between OpenAI embeddings and local fallback embeddings. The project also includes an evaluation foundation with RAGAS and MLflow, so retrieval and answer quality can be tracked over time.
