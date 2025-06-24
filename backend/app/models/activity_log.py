from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for system events
    action = Column(String, index=True)  # e.g., "login", "invite_user", "approve_user"
    description = Column(Text)
    table_modified = Column(String, nullable=True)  # e.g., "chemical_inventory", "formulation_details"
    field_modified = Column(String, nullable=True)  # e.g., "quantity", "notes"
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(Text, nullable=True)  # Optional admin notes
    
    # Relationship
    user = relationship("User", back_populates="activity_logs") 