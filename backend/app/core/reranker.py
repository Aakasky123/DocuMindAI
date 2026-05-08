class Reranker:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model = None

    def rerank(self, question: str, candidates: list[dict], top_k: int) -> list[dict]:
        if not candidates:
            return []
        try:
            if self._model is None:
                from sentence_transformers import CrossEncoder

                self._model = CrossEncoder(self.model_name)
            pairs = [(question, candidate["text"]) for candidate in candidates]
            scores = self._model.predict(pairs)
            for candidate, score in zip(candidates, scores, strict=True):
                candidate["score"] = float(score)
        except Exception:
            pass
        return sorted(candidates, key=lambda item: item["score"], reverse=True)[:top_k]
