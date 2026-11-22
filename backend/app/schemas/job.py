from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ProcessingJobOut(BaseModel):
    id: str
    project_id: str
    stage: str
    status: str
    progress: int
    message: Optional[str] = None
    error_code: Optional[str] = None
    error_details: Optional[str] = None
    retry_count: int = 0
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
