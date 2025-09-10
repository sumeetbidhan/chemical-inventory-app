from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PurchaseBase(BaseModel):
    chemical_id: int
    quantity_purchased: float
    unit: str
    amount: float
    purchase_date: datetime
    note: Optional[str] = None

class PurchaseCreate(PurchaseBase):
    pass

class PurchaseUpdate(BaseModel):
    chemical_id: Optional[int] = None
    quantity_purchased: Optional[float] = None
    unit: Optional[str] = None
    amount: Optional[float] = None
    purchase_date: Optional[datetime] = None
    note: Optional[str] = None

class PurchaseResponse(PurchaseBase):
    id: int
    added_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True 