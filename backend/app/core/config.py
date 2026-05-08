from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "DocuMind AI"
    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    frontend_url: str = "http://localhost:5173"

    database_url: str = "postgresql+psycopg://postgres:postgres@postgres:5432/documind"
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    qdrant_url: str = "http://qdrant:6333"
    qdrant_collection: str = "documind_chunks"

    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"

    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "llama3.1:8b"
    ollama_embedding_model: str = "nomic-embed-text"
    ollama_keep_alive: str = "30m"

    default_retrieval_mode: str = "hybrid"
    vector_top_k: int = 20
    bm25_top_k: int = 20
    rerank_top_k: int = 5
    reranker_model: str = "BAAI/bge-reranker-base"

    chunk_size: int = 800
    chunk_overlap: int = 150

    mlflow_tracking_uri: str = "http://localhost:5000"
    ragas_eval_model: str = "gpt-4o-mini"

    upload_dir: Path = Field(default=Path("data/uploads"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
