# Architecture

DocuMind AI is organized as a full-stack RAG system with a React frontend, FastAPI backend, asynchronous Celery workers, PostgreSQL metadata storage, Redis queueing, Qdrant vector indexing, OpenAI generation, and an MLflow/RAGAS evaluation foundation.

## High-Level System Architecture

```mermaid
flowchart LR
    A["React Frontend"] --> B["FastAPI API"]
    B --> C["PostgreSQL"]
    B --> D["Redis"]
    D --> E["Celery Worker"]
    E --> C
    E --> F["Qdrant"]
    B --> F
    B --> G["OpenAI"]
    E --> G
    B --> H["MLflow"]
```

## Document Ingestion Flow

```mermaid
flowchart TD
    A["User uploads file"] --> B["FastAPI stores metadata"]
    B --> C["Task queued in Redis"]
    C --> D["Celery worker processes file"]
    D --> E["Parser extracts text"]
    E --> F["Chunker splits text"]
    F --> G["Embedder creates vectors"]
    G --> H["Chunks stored in PostgreSQL"]
    G --> I["Vectors stored in Qdrant"]
    H --> J["Task marked completed"]
    I --> J
```

## RAG Query Flow

```mermaid
flowchart TD
    A["User asks question"] --> B["Frontend sends chat request"]
    B --> C["FastAPI validates request"]
    C --> D["Retriever fetches candidate chunks"]
    D --> E["Hybrid retrieval combines keyword and vector results"]
    E --> F["Prompt assembled"]
    F --> G["OpenAI generates answer"]
    G --> H["Answer streamed to UI"]
    D --> I["Citations displayed"]
    H --> I
```

## Provider-Aware Vector Collection Strategy

```mermaid
flowchart LR
    A["OpenAI provider"] --> B["1536 dimensions"]
    B --> C["documind_chunks_openai_1536"]

    D["Local provider"] --> E["384 dimensions"]
    E --> F["documind_chunks_local_384"]
```

Qdrant collections have a fixed vector dimension. Mixing embeddings from different providers or models in a single collection can cause dimension mismatch errors. DocuMind AI avoids this by deriving collection names from the active provider and vector size, so OpenAI and local fallback embeddings are indexed separately.
