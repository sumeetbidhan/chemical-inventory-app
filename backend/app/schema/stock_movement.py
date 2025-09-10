from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.stock_movement import ChangeType

class StockMovementBase(BaseModel):
    chemical_id: int
    change_type: ChangeType
    quantity_changed: float
    unit: str
    action: str
    reference_id: Optional[int] = None

class StockMovementCreate(StockMovementBase):
    pass

class StockMovementUpdate(BaseModel):
    chemical_id: Optional[int] = None
    change_type: Optional[ChangeType] = None
    quantity_changed: Optional[float] = None
    unit: Optional[str] = None
    action: Optional[str] = None
    reference_id: Optional[int] = None

class StockMovementResponse(StockMovementBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True 