from datetime import datetime

from pydantic import BaseModel


class EvaluationRunRequest(BaseModel):
    run_name: str = "MVP Evaluation"
    retrieval_mode: str = "hybrid"
    model_provider: str = "openai"


class EvaluationRunResponse(BaseModel):
    id: str
    run_name: str
    embedding_model: str
    chunking_strategy: str
    retrieval_mode: str
    reranker_model: str
    faithfulness: float
    answer_relevancy: float
    context_precision: float
    context_recall: float
    avg_latency_ms: int
    created_at: datetime

    model_config = {"from_attributes": True}
