from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ChemicalProduct(Base):
    __tablename__ = "chemical_products"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"), nullable=False)  # Reference to chemicals table
    name = Column(String(255), unique=True, nullable=False, index=True)
    base_composition_qty = Column(Float, nullable=False)  # Base composition total (e.g., 100.15g = 100%)
    unit = Column(String(50), nullable=False)  # g, kg, ml, l, etc.
    note = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    chemical = relationship("Chemical", back_populates="chemical_products")
    created_by_user = relationship("User", back_populates="chemical_products")
    formulations = relationship("Formulation", back_populates="product")
    assignments = relationship("ProductAssignment", back_populates="product")
    
    def __repr__(self):
        return f"<ChemicalProduct(id={self.id}, name='{self.name}', base_composition_qty={self.base_composition_qty}{self.unit})>" 