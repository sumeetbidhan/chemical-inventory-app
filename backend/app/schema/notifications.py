from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class NotificationBase(BaseModel):
    type: str
    severity: str
    message: str
    chemical_id: Optional[int] = None
    recipients: Optional[List[str]] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: int
    user_id: Optional[str] = None
    timestamp: datetime
    is_read: bool
    is_dismissed: bool
    
    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_dismissed: Optional[bool] = None

class NotificationSend(BaseModel):
    type: str
    severity: str
    message: str
    chemical_id: Optional[int] = None
    timestamp: Optional[datetime] = None
    recipients: List[str] = ['admin', 'product'] 