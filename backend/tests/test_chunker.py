from app.core.chunker import chunk_text


def test_chunk_text_respects_overlap():
    chunks = chunk_text(" ".join(["alpha"] * 400))
    assert chunks
    assert chunks[0]["token_count"] > 0
