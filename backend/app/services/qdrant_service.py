import re
import uuid

from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, FieldCondition, Filter, FilterSelector, MatchAny, MatchValue, PointStruct, VectorParams

from app.core.config import get_settings


class QdrantDimensionError(RuntimeError):
    pass


class QdrantService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = QdrantClient(url=self.settings.qdrant_url)

    def collection_name(self, provider: str, vector_size: int) -> str:
        provider_slug = self._slug(provider or "local")
        return f"{self.settings.qdrant_collection}_{provider_slug}_{vector_size}"

    def ensure_collection(self, provider: str, vector_size: int) -> str:
        collection_name = self.collection_name(provider, vector_size)
        existing_names = {item.name for item in self.client.get_collections().collections}
        if collection_name not in existing_names:
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            return collection_name

        existing_size = self._collection_vector_size(collection_name)
        if existing_size != vector_size:
            raise QdrantDimensionError(
                f"Qdrant collection '{collection_name}' expects vectors of size {existing_size}, "
                f"but the active embedding provider produced size {vector_size}. "
                "Use a provider/model-specific collection or rebuild the mismatched collection."
            )
        return collection_name

    def upsert_chunks(self, embeddings: list[list[float]], payloads: list[dict], provider: str) -> tuple[str, list[str]]:
        if not embeddings:
            return self.collection_name(provider, 0), []
        vector_size = self._validate_embedding_sizes(embeddings)
        collection_name = self.ensure_collection(provider, vector_size)
        point_ids = [str(uuid.uuid4()) for _ in embeddings]
        self.client.upsert(
            collection_name=collection_name,
            points=[
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={**payload, "embedding_provider": provider, "vector_size": vector_size, "collection_name": collection_name},
                )
                for point_id, embedding, payload in zip(point_ids, embeddings, payloads, strict=True)
            ],
        )
        return collection_name, point_ids

    def search(self, query_vector: list[float], document_ids: list[str], limit: int, provider: str) -> list[dict]:
        vector_size = len(query_vector)
        collection_name = self.collection_name(provider, vector_size)
        existing_names = {item.name for item in self.client.get_collections().collections}
        if collection_name not in existing_names:
            return []

        existing_size = self._collection_vector_size(collection_name)
        if existing_size != vector_size:
            raise QdrantDimensionError(
                f"Qdrant collection '{collection_name}' expects vectors of size {existing_size}, "
                f"but the active query embedding has size {vector_size}."
            )

        query_filter = None
        if document_ids:
            query_filter = Filter(must=[FieldCondition(key="document_id", match=MatchAny(any=document_ids))])
        results = self.client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=limit,
        )
        return [{"chunk_id": hit.payload["chunk_id"], "score": float(hit.score)} for hit in results]

    def delete_document(self, document_id: str) -> None:
        for collection_name in self._managed_collection_names():
            self.client.delete(
                collection_name=collection_name,
                points_selector=FilterSelector(
                    filter=Filter(must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))])
                ),
            )

    def _managed_collection_names(self) -> list[str]:
        prefix = f"{self.settings.qdrant_collection}_"
        return [
            item.name
            for item in self.client.get_collections().collections
            if item.name == self.settings.qdrant_collection or item.name.startswith(prefix)
        ]

    def _collection_vector_size(self, collection_name: str) -> int:
        collection = self.client.get_collection(collection_name=collection_name)
        vectors = collection.config.params.vectors
        if hasattr(vectors, "size"):
            return int(vectors.size)
        if isinstance(vectors, dict):
            first_vector = next(iter(vectors.values()))
            return int(first_vector.size if hasattr(first_vector, "size") else first_vector["size"])
        raise QdrantDimensionError(f"Unable to determine vector size for Qdrant collection '{collection_name}'.")

    def _validate_embedding_sizes(self, embeddings: list[list[float]]) -> int:
        vector_size = len(embeddings[0])
        if vector_size <= 0:
            raise QdrantDimensionError("Embedding provider returned an empty vector.")
        mismatched = [len(embedding) for embedding in embeddings if len(embedding) != vector_size]
        if mismatched:
            raise QdrantDimensionError(
                f"Embedding provider returned mixed vector sizes. Expected {vector_size}, got {sorted(set(mismatched))}."
            )
        return vector_size

    def _slug(self, value: str) -> str:
        slug = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower()).strip("_")
        return slug or "local"
