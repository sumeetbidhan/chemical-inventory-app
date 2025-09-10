from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"), nullable=False)
    message = Column(Text, nullable=False)
    threshold = Column(Float, nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    chemical = relationship("Chemical", back_populates="alerts")
    resolved_by_user = relationship("User")
    
    def __repr__(self):
        return f"<Alert(id={self.id}, chemical_id={self.chemical_id}, message='{self.message}')>" 