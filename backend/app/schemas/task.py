from datetime import datetime

from pydantic import BaseModel


class TaskResponse(BaseModel):
    id: str
    document_id: str
    status: str
    progress: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None

    model_config = {"from_attributes": True}
