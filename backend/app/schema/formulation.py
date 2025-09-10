"""
Pydantic schemas for Formulation API
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FormulationBase(BaseModel):
    product_id: int = Field(..., description="ID of the product this formulation belongs to")
    component_chemical_id: int = Field(..., description="ID of the component chemical")
    quantity_required: float = Field(..., description="Quantity required for this component")
    unit: str = Field(..., description="Unit of measurement")


class FormulationCreate(FormulationBase):
    pass


class FormulationUpdate(BaseModel):
    component_chemical_id: Optional[int] = None
    quantity_required: Optional[float] = None
    unit: Optional[str] = None


class FormulationResponse(FormulationBase):
    id: int
    component_name: Optional[str] = None  # Will be populated with component name
    created_at: datetime
    
    class Config:
        from_attributes = True


class FormulationDetail(BaseModel):
    id: int
    component_chemical_id: int
    component_name: str
    quantity_required: float
    unit: str


class FormulationBulkCreate(BaseModel):
    product_id: int
    formulations: List[FormulationCreate]


class FormulationValidationResponse(BaseModel):
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    formulations: List[FormulationDetail] = Field(default_factory=list) 