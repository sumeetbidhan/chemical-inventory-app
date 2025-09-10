from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Chemical(Base):
    __tablename__ = "chemicals"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    unit = Column(String(50), nullable=False)  # g, kg, ml, l, etc.
    available_qty = Column(Float, default=0.0, nullable=False)
    threshold_qty = Column(Float, default=0.0, nullable=False)
    is_manufactured = Column(Boolean, default=False)  # True if manufactured, False if raw
    last_purchase = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    purchases = relationship("Purchase", back_populates="chemical")
    stock_movements = relationship("StockMovement", back_populates="chemical")
    alerts = relationship("Alert", back_populates="chemical")
    # Formulations where this chemical is used as a component
    formulations_as_component = relationship("Formulation", back_populates="component_chemical")
    # Chemical products that reference this chemical
    chemical_products = relationship("ChemicalProduct", back_populates="chemical")
    
    def __repr__(self):
        return f"<Chemical(id={self.id}, name='{self.name}', available_qty={self.available_qty}{self.unit}, is_manufactured={self.is_manufactured})>"
    
    @property
    def is_low_stock(self):
        """Check if chemical is below threshold"""
        return self.available_qty <= self.threshold_qty 