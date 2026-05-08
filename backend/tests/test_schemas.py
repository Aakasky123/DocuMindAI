import pytest
from pydantic import ValidationError

from app.schemas.chat import AskRequest


def test_ask_request_defaults():
    request = AskRequest(question="What is this?", document_ids=[])
    assert request.retrieval_mode == "hybrid"
    assert request.model_provider == "openai"
    assert request.top_k == 5


def test_ask_request_rejects_bad_mode():
    with pytest.raises(ValidationError):
        AskRequest(question="What is this?", retrieval_mode="bad")
