from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class FormulationProgress(Base):
    __tablename__ = "formulation_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("product_assignments.id"), nullable=False)
    component_chemical_id = Column(Integer, ForeignKey("chemicals.id"), nullable=False)
    quantity_required = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    status = Column(String(20), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    assignment = relationship("ProductAssignment", back_populates="progress_tracking")
    component_chemical = relationship("Chemical")
    completed_by_user = relationship("User", foreign_keys=[completed_by])
    
    def __repr__(self):
        return f"<FormulationProgress(id={self.id}, assignment_id={self.assignment_id}, status='{self.status}')>"
    
    @property
    def is_completed(self):
        """Check if component is completed"""
        return self.status == "COMPLETED"
    
    @property
    def is_pending(self):
        """Check if component is pending"""
        return self.status == "PENDING"
    
    @property
    def is_in_progress(self):
        """Check if component is in progress"""
        return self.status == "IN_PROGRESS"

