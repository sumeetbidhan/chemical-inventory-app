from sqlalchemy import Column, String, Integer, DateTime, Text, Float, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class AccountTransaction(Base):
    __tablename__ = "account_transactions"

    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemical_inventory.id"), nullable=False)
    transaction_type = Column(String, nullable=False)  # 'purchase', 'adjustment', 'usage'
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # Cost in currency
    currency = Column(String, default="USD")
    supplier = Column(String, nullable=True)
    purchase_date = Column(DateTime(timezone=True), server_default=func.now())
    delivery_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="pending")  # 'pending', 'ordered', 'delivered', 'cancelled'
    notes = Column(Text, nullable=True)
    created_by = Column(String, ForeignKey("users.uid"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    chemical = relationship("ChemicalInventory", foreign_keys=[chemical_id])
    user = relationship("User", foreign_keys=[created_by])

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False)
    supplier = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    expected_delivery = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="draft")  # 'draft', 'submitted', 'approved', 'ordered', 'delivered', 'cancelled'
    notes = Column(Text, nullable=True)
    created_by = Column(String, ForeignKey("users.uid"), nullable=False)
    approved_by = Column(String, ForeignKey("users.uid"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    chemical_id = Column(Integer, ForeignKey("chemical_inventory.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    chemical = relationship("ChemicalInventory", foreign_keys=[chemical_id]) 