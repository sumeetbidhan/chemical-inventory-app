from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ExtensionRequest(Base):
    __tablename__ = "extension_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("product_assignments.id"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    current_expiry = Column(DateTime(timezone=True), nullable=False)
    requested_extension_minutes = Column(Integer, nullable=False)
    status = Column(String(20), default="PENDING")  # PENDING, APPROVED, REJECTED
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    assignment = relationship("ProductAssignment", back_populates="extension_requests")
    requested_by_user = relationship("User", foreign_keys=[requested_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    
    def __repr__(self):
        return f"<ExtensionRequest(id={self.id}, assignment_id={self.assignment_id}, status='{self.status}')>"
    
    @property
    def is_pending(self):
        """Check if request is still pending"""
        return self.status == "PENDING"
    
    @property
    def is_approved(self):
        """Check if request was approved"""
        return self.status == "APPROVED"
    
    @property
    def is_rejected(self):
        """Check if request was rejected"""
        return self.status == "REJECTED"
