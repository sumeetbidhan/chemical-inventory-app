"""
Pydantic schemas for Chemical API
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChemicalBase(BaseModel):
    name: str = Field(..., description="Chemical name")
    unit: str = Field(..., description="Unit of measurement (g, kg, ml, l, etc.)")
    available_qty: float = Field(default=0.0, description="Available quantity")
    threshold_qty: float = Field(default=0.0, description="Threshold quantity for alerts")
    is_manufactured: bool = Field(default=False, description="True if manufactured, False if raw")


class ChemicalCreate(ChemicalBase):
    pass


class ChemicalUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    available_qty: Optional[float] = None
    threshold_qty: Optional[float] = None
    is_manufactured: Optional[bool] = None


class ChemicalResponse(ChemicalBase):
    id: int
    last_purchase: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ChemicalStockSummary(BaseModel):
    id: int
    name: str
    available_qty: float
    threshold_qty: float
    unit: str
    is_manufactured: bool
    is_low_stock: bool
    last_purchase: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ChemicalSearchResponse(BaseModel):
    chemicals: list[ChemicalResponse]
    total: int
    page: int
    limit: int 