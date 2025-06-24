from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole

# Base schema
class ChemicalInventoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    quantity: float = Field(..., ge=0)
    unit: str = Field(..., min_length=1, max_length=50)
    formulation: Optional[str] = None
    notes: Optional[str] = None

# Create schema
class ChemicalInventoryCreate(ChemicalInventoryBase):
    pass

# Update schema (all fields optional for partial updates)
class ChemicalInventoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    formulation: Optional[str] = None
    notes: Optional[str] = None

# Add note schema (for appending notes)
class ChemicalInventoryAddNote(BaseModel):
    note: str = Field(..., min_length=1)

# Response schema
class ChemicalInventoryResponse(ChemicalInventoryBase):
    id: int
    last_updated: datetime
    updated_by: Optional[str] = None
    
    class Config:
        from_attributes = True

# Response with formulation details
class ChemicalInventoryWithFormulations(ChemicalInventoryResponse):
    formulation_details: List["FormulationDetailsResponse"] = []
    
    class Config:
        from_attributes = True

# Import for forward reference
from app.schema.formulation_details import FormulationDetailsResponse 