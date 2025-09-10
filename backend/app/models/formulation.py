from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Formulation(Base):
    __tablename__ = "formulations"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("chemical_products.id"), nullable=False)
    component_chemical_id = Column(Integer, ForeignKey("chemicals.id"), nullable=False)  # FK to chemicals.id
    quantity_required = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    product = relationship("ChemicalProduct", back_populates="formulations")
    component_chemical = relationship("Chemical", back_populates="formulations_as_component")
    
    def __repr__(self):
        return f"<Formulation(id={self.id}, product_id={self.product_id}, component_chemical_id={self.component_chemical_id}, quantity={self.quantity_required}{self.unit})>" 