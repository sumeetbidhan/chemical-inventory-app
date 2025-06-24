from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # 'low_stock', 'out_of_stock', 'expiry', etc.
    severity = Column(String, nullable=False)  # 'critical', 'warning', 'info'
    message = Column(Text, nullable=False)
    chemical_id = Column(Integer, ForeignKey("chemical_inventory.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.uid"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    recipients = Column(Text, nullable=True)  # JSON string of recipient roles
    
    # Relationships
    chemical = relationship("ChemicalInventory", foreign_keys=[chemical_id])
    user = relationship("User", foreign_keys=[user_id]) 