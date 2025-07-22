from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.account_transactions import AccountTransaction, PurchaseOrder, PurchaseOrderItem
from app.schema.account_transactions import AccountTransactionCreate, AccountTransactionUpdate, PurchaseOrderCreate, PurchaseOrderUpdate
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import logging
from app.models.chemical_inventory import ChemicalInventory

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Account Transaction CRUD
def create_account_transaction(db: Session, transaction: AccountTransactionCreate, user_id: str) -> AccountTransaction:
    logger.info(f"Creating new transaction: {transaction.transaction_type} - {transaction.quantity} {transaction.unit} - ₹{transaction.amount} - Status: {transaction.status}")
    
    db_transaction = AccountTransaction(
        chemical_id=transaction.chemical_id,
        transaction_type=transaction.transaction_type,
        quantity=transaction.quantity,
        unit=transaction.unit,
        amount=transaction.amount,
        currency=transaction.currency,
        supplier=transaction.supplier,
        delivery_date=transaction.delivery_date,
        status=transaction.status,
        notes=transaction.notes,
        created_by=user_id
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    logger.info(f"Transaction created successfully with ID: {db_transaction.id}")
    return db_transaction

def get_account_transactions(db: Session, skip: int = 0, limit: int = 100, chemical_id: Optional[int] = None) -> List[AccountTransaction]:
    query = db.query(AccountTransaction)
    if chemical_id:
        query = query.filter(AccountTransaction.chemical_id == chemical_id)
    return query.offset(skip).limit(limit).all()

def get_account_transaction(db: Session, transaction_id: int) -> Optional[AccountTransaction]:
    return db.query(AccountTransaction).filter(AccountTransaction.id == transaction_id).first()

def update_account_transaction(db: Session, transaction_id: int, transaction_update: AccountTransactionUpdate) -> Optional[AccountTransaction]:
    logger.info(f"Updating transaction {transaction_id} with data: {transaction_update.dict(exclude_unset=True)}")
    
    db_transaction = get_account_transaction(db, transaction_id)
    if db_transaction:
        old_status = db_transaction.status
        update_data = transaction_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_transaction, field, value)
        db.commit()
        db.refresh(db_transaction)
        
        if 'status' in update_data:
            logger.info(f"Transaction {transaction_id} status changed from '{old_status}' to '{db_transaction.status}'")
        else:
            logger.info(f"Transaction {transaction_id} updated successfully")
    else:
        logger.warning(f"Transaction {transaction_id} not found for update")
    
    return db_transaction

def delete_account_transaction(db: Session, transaction_id: int) -> bool:
    db_transaction = get_account_transaction(db, transaction_id)
    if db_transaction:
        db.delete(db_transaction)
        db.commit()
        return True
    return False

# Purchase Order CRUD
def generate_order_number() -> str:
    """Generate a unique order number"""
    return f"PO-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

def create_purchase_order(db: Session, purchase_order: PurchaseOrderCreate, user_id: str) -> PurchaseOrder:
    # Generate order number
    order_number = generate_order_number()
    
    # Create purchase order
    db_purchase_order = PurchaseOrder(
        order_number=order_number,
        supplier=purchase_order.supplier,
        total_amount=purchase_order.total_amount,
        currency=purchase_order.currency,
        expected_delivery=purchase_order.expected_delivery,
        status=purchase_order.status,
        notes=purchase_order.notes,
        created_by=user_id
    )
    db.add(db_purchase_order)
    db.flush()  # Get the ID without committing
    
    # Create purchase order items
    for item in purchase_order.items:
        db_item = PurchaseOrderItem(
            purchase_order_id=db_purchase_order.id,
            chemical_id=item.chemical_id,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            total_price=item.total_price,
            notes=item.notes
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_purchase_order)
    return db_purchase_order

def get_purchase_orders(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> List[PurchaseOrder]:
    query = db.query(PurchaseOrder)
    if status:
        query = query.filter(PurchaseOrder.status == status)
    return query.offset(skip).limit(limit).all()

def get_purchase_order(db: Session, order_id: int) -> Optional[PurchaseOrder]:
    return db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()

def update_purchase_order(db: Session, order_id: int, order_update: PurchaseOrderUpdate) -> Optional[PurchaseOrder]:
    db_order = get_purchase_order(db, order_id)
    if db_order:
        update_data = order_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_order, field, value)
        db.commit()
        db.refresh(db_order)
    return db_order

def delete_purchase_order(db: Session, order_id: int) -> bool:
    db_order = get_purchase_order(db, order_id)
    if db_order:
        db.delete(db_order)
        db.commit()
        return True
    return False

# Summary and Analytics
def get_account_summary(db: Session) -> dict:
    """Get account summary statistics"""
    logger.info("Calculating account summary statistics...")
    
    # Total purchases (only completed transactions)
    total_purchases = db.query(func.sum(AccountTransaction.amount)).filter(
        and_(
            AccountTransaction.transaction_type == 'purchase',
            AccountTransaction.status == 'completed'
        )
    ).scalar() or 0
    
    # Total transactions
    total_transactions = db.query(func.count(AccountTransaction.id)).scalar() or 0
    
    # Pending orders
    pending_orders = db.query(func.count(PurchaseOrder.id)).filter(
        PurchaseOrder.status.in_(['draft', 'submitted'])
    ).scalar() or 0
    
    # This month's spending (only completed transactions)
    start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    total_spent_this_month = db.query(func.sum(AccountTransaction.amount)).filter(
        and_(
            AccountTransaction.transaction_type == 'purchase',
            AccountTransaction.status == 'completed',
            AccountTransaction.created_at >= start_of_month
        )
    ).scalar() or 0
    
    # This year's spending (only completed transactions)
    start_of_year = datetime.now().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    total_spent_this_year = db.query(func.sum(AccountTransaction.amount)).filter(
        and_(
            AccountTransaction.transaction_type == 'purchase',
            AccountTransaction.status == 'completed',
            AccountTransaction.created_at >= start_of_year
        )
    ).scalar() or 0
    
    summary = {
        "total_purchases": float(total_purchases),
        "total_transactions": total_transactions,
        "pending_orders": pending_orders,
        "total_spent_this_month": float(total_spent_this_month),
        "total_spent_this_year": float(total_spent_this_year),
        "currency": "INR"
    }
    
    logger.info(f"Account summary calculated: Total purchases: ₹{total_purchases}, Total transactions: {total_transactions}, Pending orders: {pending_orders}, This month: ₹{total_spent_this_month}, This year: ₹{total_spent_this_year}")
    
    return summary

def get_chemical_purchase_history(db: Session, chemical_id: int) -> dict:
    """Get purchase history for a specific chemical"""
    logger.info(f"Fetching purchase history for chemical ID: {chemical_id}")
    
    # First, get the chemical name
    chemical = db.query(ChemicalInventory).filter(ChemicalInventory.id == chemical_id).first()
    chemical_name = chemical.name if chemical else "Unknown Chemical"
    
    transactions = db.query(AccountTransaction).filter(
        and_(
            AccountTransaction.chemical_id == chemical_id,
            AccountTransaction.transaction_type == 'purchase',
            AccountTransaction.status == 'completed'
        )
    ).all()
    
    if not transactions:
        logger.info(f"No completed purchase transactions found for chemical ID: {chemical_id}")
        return {
            "chemical_id": chemical_id,
            "chemical_name": chemical_name,
            "total_purchased": 0,
            "total_spent": 0,
            "last_purchase_date": None,
            "average_unit_price": 0,
            "currency": "INR"
        }
    
    total_purchased = sum(t.quantity for t in transactions)
    total_spent = sum(t.amount for t in transactions)
    last_purchase_date = max(t.created_at for t in transactions)
    average_unit_price = total_spent / total_purchased if total_purchased > 0 else 0
    
    logger.info(f"Chemical {chemical_id} purchase history: {len(transactions)} transactions, Total purchased: {total_purchased}, Total spent: ₹{total_spent}, Average unit price: ₹{average_unit_price}")
    
    return {
        "chemical_id": chemical_id,
        "chemical_name": chemical_name,
        "total_purchased": float(total_purchased),
        "total_spent": float(total_spent),
        "last_purchase_date": last_purchase_date,
        "average_unit_price": float(average_unit_price),
        "currency": "INR"
    }

def get_chemical_purchase_transactions(db: Session, chemical_id: int) -> List[AccountTransaction]:
    """Get all purchase transactions for a specific chemical"""
    logger.info(f"Fetching purchase transactions for chemical ID: {chemical_id}")
    
    transactions = db.query(AccountTransaction).filter(
        and_(
            AccountTransaction.chemical_id == chemical_id,
            AccountTransaction.transaction_type == 'purchase'
        )
    ).order_by(AccountTransaction.created_at.desc()).all()
    
    logger.info(f"Found {len(transactions)} purchase transactions for chemical ID: {chemical_id}")
    return transactions

def get_recent_transactions(db: Session, limit: int = 10) -> List[AccountTransaction]:
    """Get recent transactions"""
    return db.query(AccountTransaction).order_by(
        AccountTransaction.created_at.desc()
    ).limit(limit).all()

def get_pending_purchases(db: Session) -> List[AccountTransaction]:
    """Get pending purchase transactions"""
    return db.query(AccountTransaction).filter(
        and_(
            AccountTransaction.transaction_type == 'purchase',
            AccountTransaction.status == 'pending'
        )
    ).all() 