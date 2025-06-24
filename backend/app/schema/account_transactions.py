from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Account Transaction Schemas
class AccountTransactionBase(BaseModel):
    chemical_id: int
    transaction_type: str
    quantity: float
    unit: str
    amount: float
    currency: str = "USD"
    supplier: Optional[str] = None
    delivery_date: Optional[datetime] = None
    status: str = "pending"
    notes: Optional[str] = None

class AccountTransactionCreate(AccountTransactionBase):
    pass

class AccountTransactionUpdate(BaseModel):
    transaction_type: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    supplier: Optional[str] = None
    delivery_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AccountTransactionResponse(AccountTransactionBase):
    id: int
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Purchase Order Item Schemas
class PurchaseOrderItemBase(BaseModel):
    chemical_id: int
    quantity: float
    unit: str
    unit_price: float
    total_price: float
    notes: Optional[str] = None

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    purchase_order_id: int
    
    class Config:
        from_attributes = True

# Purchase Order Schemas
class PurchaseOrderBase(BaseModel):
    supplier: str
    total_amount: float
    currency: str = "USD"
    expected_delivery: Optional[datetime] = None
    status: str = "draft"
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderUpdate(BaseModel):
    supplier: Optional[str] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    expected_delivery: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    approved_by: Optional[str] = None

class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    order_number: str
    order_date: datetime
    created_by: str
    approved_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[PurchaseOrderItemResponse] = []
    
    class Config:
        from_attributes = True

# Summary and Dashboard Schemas
class AccountSummary(BaseModel):
    total_purchases: float
    total_transactions: int
    pending_orders: int
    total_spent_this_month: float
    total_spent_this_year: float
    currency: str = "USD"

class ChemicalPurchaseHistory(BaseModel):
    chemical_id: int
    chemical_name: str
    total_purchased: float
    total_spent: float
    last_purchase_date: Optional[datetime] = None
    average_unit_price: float
    currency: str = "USD" 