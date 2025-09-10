"""
Pydantic schemas for ChemicalProduct API
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ChemicalProductBase(BaseModel):
    chemical_id: Optional[int] = Field(None, description="ID of the chemical in chemicals table")
    name: str = Field(..., description="Product name")
    base_composition_qty: float = Field(..., description="Base composition total (e.g., 100.15g = 100%)")
    unit: str = Field(..., description="Unit of measurement (g, kg, ml, l, etc.)")
    note: Optional[str] = Field(None, description="Additional notes")


class ChemicalProductCreate(ChemicalProductBase):
    created_by: int = Field(..., description="User ID who created the product")


class ChemicalProductUpdate(BaseModel):
    name: Optional[str] = None
    base_composition_qty: Optional[float] = None
    unit: Optional[str] = None
    note: Optional[str] = None


class ChemicalProductResponse(ChemicalProductBase):
    id: int
    created_by: int
    last_updated: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChemicalProductWithFormulations(ChemicalProductResponse):
    formulations: List[dict] = Field(default_factory=list, description="List of formulation components")


class ChemicalProductSearchResponse(BaseModel):
    products: List[ChemicalProductResponse]
    total: int
    page: int
    limit: int 