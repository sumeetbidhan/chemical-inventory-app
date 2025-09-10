from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), nullable=True)
    admin_phone_number = Column(String(20), nullable=True)  # For receiving OTPs
    
    # Relationships
    role = relationship("Role", back_populates="users")
    purchases = relationship("Purchase", back_populates="added_by_user")
    chemical_products = relationship("ChemicalProduct", back_populates="created_by_user")
    activity_logs = relationship("ActivityLog", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role_id={self.role_id})>"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
