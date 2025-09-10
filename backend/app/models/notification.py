from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum

class NotificationCategory(str, enum.Enum):
    ALERT = "alert"
    SYSTEM = "system"
    PURCHASE = "purchase"
    FORMULATION = "formulation"

class NotificationPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, nullable=False)
    category = Column(Enum(NotificationCategory), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.MEDIUM)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification(id={self.id}, category={self.category}, priority={self.priority})>" 