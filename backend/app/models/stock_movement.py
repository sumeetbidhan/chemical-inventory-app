from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum


class ChangeType(str, enum.Enum):
    INCREASE = "INCREASE"
    DECREASE = "DECREASE"


class StockMovement(Base):
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"), nullable=False)
    change_type = Column(Enum(ChangeType), nullable=False)
    quantity_changed = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    action = Column(String(255), nullable=False)  # e.g., "Purchase", "Formulation Usage", "Manual Adjustment"
    reference_id = Column(Integer, nullable=True)  # FK to purchase.id or formulation.id
    reference_type = Column(String(50), nullable=True)  # "purchase", "formulation", etc.
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    chemical = relationship("Chemical", back_populates="stock_movements")
    # purchase_reference relationship removed - will handle in application logic
    
    def __repr__(self):
        return f"<StockMovement(id={self.id}, chemical_id={self.chemical_id}, change_type={self.change_type}, quantity={self.quantity_changed}{self.unit})>" 