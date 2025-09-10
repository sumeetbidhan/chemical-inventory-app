from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ProductAssignment(Base):
    __tablename__ = "product_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("chemical_products.id"), nullable=False)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_type = Column(String(20), nullable=False)  # LAB_STAFF or PRODUCT_TEAM
    quantity_requested = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    status = Column(String(20), default="ASSIGNED")  # ASSIGNED, IN_PROGRESS, COMPLETED, EXPIRED
    
    # Time Management
    time_allotted_minutes = Column(Integer, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    otp_token = Column(String(255), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Progress Tracking
    progress_percentage = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    product = relationship("ChemicalProduct", back_populates="assignments")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to_user_id])
    assigned_by_admin = relationship("User", foreign_keys=[assigned_by_admin_id])
    extension_requests = relationship("ExtensionRequest", back_populates="assignment")
    progress_tracking = relationship("FormulationProgress", back_populates="assignment")
    
    def __repr__(self):
        return f"<ProductAssignment(id={self.id}, product_id={self.product_id}, team_type='{self.team_type}', status='{self.status}')>"
    
    @property
    def is_expired(self):
        """Check if assignment has expired"""
        if self.expires_at:
            from datetime import datetime, timezone
            return datetime.now(timezone.utc) > self.expires_at
        return False
    
    @property
    def time_remaining_minutes(self):
        """Get time remaining in minutes"""
        if self.expires_at:
            from datetime import datetime, timezone
            remaining = self.expires_at - datetime.now(timezone.utc)
            return max(0, int(remaining.total_seconds() / 60))
        return 0

