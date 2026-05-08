from app.core.config import get_settings


def chunk_text(text: str, page_number: int | None = None) -> list[dict]:
    settings = get_settings()
    normalized = " ".join(text.split())
    if not normalized:
        return []

    chunks: list[dict] = []
    start = 0
    index = 0
    while start < len(normalized):
        end = min(start + settings.chunk_size, len(normalized))
        if end < len(normalized):
            boundary = normalized.rfind(" ", start, end)
            if boundary > start + settings.chunk_size // 2:
                end = boundary
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(
                {
                    "chunk_index": index,
                    "page_number": page_number,
                    "text": chunk,
                    "token_count": max(1, len(chunk.split())),
                }
            )
            index += 1
        if end >= len(normalized):
            break
        start = max(0, end - settings.chunk_overlap)
    return chunks
