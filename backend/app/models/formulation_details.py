from sqlalchemy import Column, String, Integer, DateTime, Text, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class FormulationDetails(Base):
    __tablename__ = "formulation_details"

    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemical_inventory.id"), nullable=False)
    component_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    unit = Column(String, nullable=False)
    available_quantity = Column(Float, nullable=False, default=0.0)
    required_quantity = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)
    updated_by = Column(String, ForeignKey("users.uid"), nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    chemical = relationship("ChemicalInventory", back_populates="formulation_details")
    user = relationship("User", foreign_keys=[updated_by]) 