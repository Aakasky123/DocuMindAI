import math
import re
from collections import Counter, defaultdict

from sqlalchemy.orm import Session

from app.db.models import Chunk


TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+")


def tokenize(text: str) -> list[str]:
    return [match.group(0).lower() for match in TOKEN_RE.finditer(text)]


class BM25Service:
    def search(self, db: Session, query: str, document_ids: list[str], limit: int) -> list[dict]:
        rows = db.query(Chunk)
        if document_ids:
            rows = rows.filter(Chunk.document_id.in_(document_ids))
        chunks = rows.all()
        if not chunks:
            return []

        tokenized = [tokenize(chunk.text) for chunk in chunks]
        doc_freq: dict[str, int] = defaultdict(int)
        for tokens in tokenized:
            for token in set(tokens):
                doc_freq[token] += 1

        avgdl = sum(len(tokens) for tokens in tokenized) / len(tokenized)
        query_tokens = tokenize(query)
        scored = []
        for chunk, tokens in zip(chunks, tokenized, strict=True):
            frequencies = Counter(tokens)
            score = 0.0
            for token in query_tokens:
                if token not in frequencies:
                    continue
                idf = math.log(1 + (len(chunks) - doc_freq[token] + 0.5) / (doc_freq[token] + 0.5))
                denom = frequencies[token] + 1.5 * (1 - 0.75 + 0.75 * len(tokens) / (avgdl or 1))
                score += idf * frequencies[token] * 2.5 / denom
            if score > 0:
                scored.append({"chunk_id": chunk.id, "score": score})
        max_score = max((item["score"] for item in scored), default=1)
        return [
            {"chunk_id": item["chunk_id"], "score": item["score"] / max_score}
            for item in sorted(scored, key=lambda item: item["score"], reverse=True)[:limit]
        ]
