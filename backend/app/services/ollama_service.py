import httpx

from app.core.config import get_settings
from app.services.openai_service import _hash_embedding, build_rag_prompt, fallback_answer, stream_text


class OllamaService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def embed(self, texts: list[str]) -> list[list[float]]:
        embeddings: list[list[float]] = []
        try:
            for text in texts:
                response = httpx.post(
                    f"{self.settings.ollama_base_url}/api/embeddings",
                    json={"model": self.settings.ollama_embedding_model, "prompt": text},
                    timeout=60,
                )
                response.raise_for_status()
                embeddings.append(response.json()["embedding"])
            return embeddings
        except Exception:
            return [_hash_embedding(text) for text in texts]

    def answer(self, question: str, contexts: list[str]) -> str:
        prompt = build_rag_prompt(question, contexts)
        try:
            response = httpx.post(
                f"{self.settings.ollama_base_url}/api/generate",
                json={
                    "model": self.settings.ollama_chat_model,
                    "prompt": prompt,
                    "stream": False,
                    "keep_alive": self.settings.ollama_keep_alive,
                },
                timeout=120,
            )
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception:
            return fallback_answer(question, contexts, "Ollama is not reachable or the model is not loaded")

    def stream_answer(self, question: str, contexts: list[str]):
        prompt = build_rag_prompt(question, contexts)
        try:
            with httpx.stream(
                "POST",
                f"{self.settings.ollama_base_url}/api/generate",
                json={
                    "model": self.settings.ollama_chat_model,
                    "prompt": prompt,
                    "stream": True,
                    "keep_alive": self.settings.ollama_keep_alive,
                },
                timeout=120,
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line:
                        continue
                    import json

                    payload = json.loads(line)
                    text = payload.get("response")
                    if text:
                        yield text
        except Exception:
            yield from stream_text(fallback_answer(question, contexts, "Ollama streaming is not reachable"))
