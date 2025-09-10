from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Purchase(Base):
    __tablename__ = "purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"), nullable=False)
    quantity_purchased = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    amount = Column(Float, nullable=True)  # Cost of purchase
    purchase_date = Column(DateTime(timezone=True), nullable=False)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    chemical = relationship("Chemical", back_populates="purchases")
    added_by_user = relationship("User", back_populates="purchases")
    # stock_movements relationship removed - will handle in application logic
    
    def __repr__(self):
        return f"<Purchase(id={self.id}, chemical_id={self.chemical_id}, quantity={self.quantity_purchased}{self.unit}, amount={self.amount})>" 