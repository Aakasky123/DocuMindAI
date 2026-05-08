# Development Notes

## Common Commands

Run the full stack:

```bash
docker compose up --build
```

Rebuild frontend only:

```bash
docker compose up -d --build frontend
```

Rebuild backend and worker:

```bash
docker compose up -d --build backend worker
```

View backend logs:

```bash
docker logs -f documindai-backend-1
```

View worker logs:

```bash
docker logs -f documindai-worker-1
```

View frontend logs:

```bash
docker logs -f documindai-frontend-1
```

Stop containers:

```bash
docker compose down
```

Reset Qdrant volume:

```bash
docker compose down
docker volume rm documindai_qdrant_data
```

Reset all Docker volumes:

```bash
docker compose down -v
```

## Troubleshooting

### Docker Desktop daemon not running

Start Docker Desktop, wait until the daemon is ready, then rerun the Docker Compose command.

### Celery task not registered

Check worker logs and confirm startup lists:

```text
[tasks]
  . app.worker.tasks.process_document
```

If the task is missing, rebuild the worker container and confirm the Celery app includes `app.worker.tasks`.

### Qdrant vector dimension mismatch

Qdrant collections have fixed vector sizes. DocuMind AI uses provider-aware collection names such as `documind_chunks_openai_1536` and `documind_chunks_local_384` to avoid mixing incompatible vectors. If data was indexed before this strategy, reset the Qdrant volume intentionally and reprocess documents.

### OpenAI insufficient quota

Check account billing/quota and verify `OPENAI_API_KEY` in `.env`. The app should not expose API keys in logs or frontend responses.

### React runtime error

Run:

```bash
cd frontend
npm run build
```

If the error mentions `React is not defined`, ensure JSX files import `React` when required by the current build/runtime configuration.

### Empty document list

Confirm the backend is healthy at http://localhost:8000/api/health and that PostgreSQL is running. Upload a new PDF and check task status from the frontend or Swagger docs.

### Streaming endpoint not responding

Verify non-streaming chat first with `POST /api/chat/ask` in Swagger. Then inspect backend logs for `/api/chat/stream` errors and confirm the frontend is using `POST` with a JSON body.
