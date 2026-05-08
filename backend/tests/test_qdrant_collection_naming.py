from app.services.qdrant_service import QdrantService


def test_provider_specific_collection_name_includes_dimension():
    service = QdrantService.__new__(QdrantService)
    service.settings = type("Settings", (), {"qdrant_collection": "documind_chunks"})()

    assert service.collection_name("openai", 1536) == "documind_chunks_openai_1536"
    assert service.collection_name("local", 384) == "documind_chunks_local_384"
    assert service.collection_name("nomic-embed-text", 768) == "documind_chunks_nomic_embed_text_768"
