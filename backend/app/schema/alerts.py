from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertBase(BaseModel):
    chemical_id: int
    message: str
    threshold: float

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    message: Optional[str] = None
    threshold: Optional[float] = None
    is_resolved: Optional[bool] = None
    resolved_by: Optional[int] = None

class AlertResponse(AlertBase):
    id: int
    triggered_at: datetime
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    
    class Config:
        from_attributes = True

class AlertFilter(BaseModel):
    chemical_id: Optional[int] = None
    is_resolved: Optional[bool] = None
    skip: int = 0
    limit: int = 50 