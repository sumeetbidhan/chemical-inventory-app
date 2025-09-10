from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.notification import NotificationCategory, NotificationPriority

class NotificationBase(BaseModel):
    message: str
    category: NotificationCategory
    priority: NotificationPriority = NotificationPriority.MEDIUM
    role_id: int

class NotificationCreate(NotificationBase):
    pass

class NotificationSend(BaseModel):
    message: str
    category: NotificationCategory
    priority: NotificationPriority = NotificationPriority.MEDIUM
    role_id: int

class NotificationUpdate(BaseModel):
    message: Optional[str] = None
    category: Optional[NotificationCategory] = None
    priority: Optional[NotificationPriority] = None
    role_id: Optional[int] = None
    is_read: Optional[bool] = None

class NotificationResponse(NotificationBase):
    id: int
    is_read: bool
    timestamp: datetime
    
    class Config:
        from_attributes = True

class NotificationFilter(BaseModel):
    category: Optional[NotificationCategory] = None
    priority: Optional[NotificationPriority] = None
    is_read: Optional[bool] = None
    role_id: Optional[int] = None
    skip: int = 0
    limit: int = 50

class NotificationDeleteRequest(BaseModel):
    notification_ids: list[int] 