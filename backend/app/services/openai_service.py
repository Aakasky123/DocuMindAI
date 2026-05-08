from app.core.config import get_settings


class OpenAIService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        key = (self.settings.openai_api_key or "").strip()
        return bool(key and not key.startswith("your_") and "api_key_here" not in key)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not self.is_configured():
            return [_hash_embedding(text) for text in texts]
        from openai import OpenAI

        client = OpenAI(api_key=self.settings.openai_api_key)
        response = client.embeddings.create(model=self.settings.openai_embedding_model, input=texts)
        return [item.embedding for item in response.data]

    def answer(self, question: str, contexts: list[str]) -> str:
        if not self.is_configured():
            return fallback_answer(question, contexts, "OpenAI API key is not configured")
        from openai import OpenAI

        client = OpenAI(api_key=self.settings.openai_api_key)
        response = client.chat.completions.create(
            model=self.settings.openai_chat_model,
            messages=[{"role": "user", "content": build_rag_prompt(question, contexts)}],
            temperature=0.1,
        )
        return response.choices[0].message.content or ""

    def stream_answer(self, question: str, contexts: list[str]):
        if not self.is_configured():
            yield from stream_text(fallback_answer(question, contexts, "OpenAI API key is not configured"))
            return
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.settings.openai_api_key)
            stream = client.chat.completions.create(
                model=self.settings.openai_chat_model,
                messages=[{"role": "user", "content": build_rag_prompt(question, contexts)}],
                temperature=0.1,
                stream=True,
            )
            for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                text = getattr(delta, "content", None)
                if text:
                    yield text
        except Exception as exc:
            yield from stream_text(f"OpenAI streaming failed, so no live model output was returned. {friendly_openai_error(exc)}")


def build_rag_prompt(question: str, contexts: list[str]) -> str:
    context = "\n\n".join(f"[{idx + 1}] {text}" for idx, text in enumerate(contexts))
    return (
        "Answer only using the provided context. If the context does not contain the answer, "
        "say you could not find enough evidence. Always cite document name and page number when available.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}"
    )


def fallback_answer(question: str, contexts: list[str], reason: str) -> str:
    if not contexts:
        return "I could not find enough evidence in the indexed documents to answer that question."
    preview = contexts[0][:600]
    return (
        f"{reason}. Based on the strongest retrieved context for '{question}', the relevant evidence is: "
        f"{preview}"
    )


def stream_text(text: str):
    for token in text.split(" "):
        if token:
            yield f"{token} "


def friendly_openai_error(exc: Exception) -> str:
    message = str(exc).lower()
    if "authentication" in message or "api key" in message or "401" in message:
        return "Check the configured OpenAI API key."
    if "quota" in message or "insufficient_quota" in message or "429" in message:
        return "The OpenAI quota or rate limit was reached."
    if "timeout" in message or "connection" in message or "network" in message:
        return "The OpenAI request could not reach the service."
    return "Please retry or use the non-streaming fallback."


def _hash_embedding(text: str, dimensions: int = 384) -> list[float]:
    import hashlib
    import math

    values = []
    seed = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
    for idx in range(dimensions):
        byte = seed[idx % len(seed)]
        values.append((byte / 255.0) - 0.5)
    norm = math.sqrt(sum(v * v for v in values)) or 1.0
    return [v / norm for v in values]
