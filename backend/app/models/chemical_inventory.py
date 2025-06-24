from sqlalchemy import Column, String, Integer, DateTime, Text, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class ChemicalInventory(Base):
    __tablename__ = "chemical_inventory"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    quantity = Column(Float, nullable=False, default=0.0)
    unit = Column(String, nullable=False)
    formulation = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(String, ForeignKey("users.uid"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[updated_by])
    formulation_details = relationship("FormulationDetails", back_populates="chemical", cascade="all, delete-orphan") 