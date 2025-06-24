from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Base schema
class FormulationDetailsBase(BaseModel):
    chemical_id: int
    component_name: str = Field(..., min_length=1, max_length=255)
    amount: float = Field(..., ge=0)
    unit: str = Field(..., min_length=1, max_length=50)
    available_quantity: float = Field(..., ge=0)
    required_quantity: float = Field(..., ge=0)
    notes: Optional[str] = None

# Create schema
class FormulationDetailsCreate(FormulationDetailsBase):
    pass

# Update schema (all fields optional for partial updates)
class FormulationDetailsUpdate(BaseModel):
    component_name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    available_quantity: Optional[float] = Field(None, ge=0)
    required_quantity: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None

# Add note schema (for appending notes)
class FormulationDetailsAddNote(BaseModel):
    note: str = Field(..., min_length=1)

# Response schema
class FormulationDetailsResponse(FormulationDetailsBase):
    id: int
    last_updated: datetime
    updated_by: Optional[str] = None
    
    class Config:
        from_attributes = True 