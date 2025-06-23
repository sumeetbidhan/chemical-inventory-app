from sqlalchemy import Column, String, Boolean, Integer, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    LAB_STAFF = "lab_staff"
    PRODUCT = "product"
    ACCOUNT = "account"
    ALL_USERS = "all_users"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, index=True)  # Firebase UID
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)  # User phone number
    role = Column(Enum(UserRole), default=UserRole.LAB_STAFF)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    activity_logs = relationship("ActivityLog", back_populates="user")
