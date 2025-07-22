from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.firebase_auth import get_current_user
from app.crud import account_transactions as crud_account
from app.crud import get_user_by_uid
from app.crud.activity_log import create_activity_log
from app.schema.account_transactions import (
    AccountTransactionCreate, AccountTransactionResponse, AccountTransactionUpdate,
    PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderUpdate,
    AccountSummary, ChemicalPurchaseHistory
)
from typing import List
import json
import logging
from datetime import datetime

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/account", tags=["account"])

# Account Transaction Endpoints
@router.post("/transactions", response_model=AccountTransactionResponse)
def create_transaction(
    transaction: AccountTransactionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new account transaction"""
    logger.info(f"[{datetime.now().isoformat()}] Creating transaction request from user {current_user.uid}: {transaction.transaction_type} - {transaction.quantity} {transaction.unit} - ₹{transaction.amount}")
    
    try:
        # Check if user has account role
        user_info = get_user_by_uid(db, current_user.uid)
        if not user_info or user_info.role not in ['admin', 'account']:
            logger.warning(f"[{datetime.now().isoformat()}] User {current_user.uid} ({user_info.email if user_info else 'unknown'}) attempted to create transaction without proper role")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only account team members can create transactions"
            )
        
        db_transaction = crud_account.create_account_transaction(
            db, transaction, current_user.uid
        )
        
        # Log the transaction creation
        create_activity_log(
            db=db,
            user_id=user_info.id,
            action="create_transaction",
            description=f"Created {transaction.transaction_type} transaction: {transaction.quantity} {transaction.unit} of chemical ID {transaction.chemical_id} for ₹{transaction.amount} {transaction.currency}",
            note=f"Transaction ID: {db_transaction.id}, Supplier: {transaction.supplier}, Status: {transaction.status}"
        )
        
        logger.info(f"[{datetime.now().isoformat()}] Transaction created successfully by user {current_user.uid} ({user_info.email}) - Transaction ID: {db_transaction.id}")
        return db_transaction
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to create transaction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transaction: {str(e)}"
        )

@router.get("/transactions", response_model=List[AccountTransactionResponse])
def get_transactions(
    skip: int = 0,
    limit: int = 100,
    chemical_id: int = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get account transactions"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} requested transactions list (skip: {skip}, limit: {limit}, chemical_id: {chemical_id})")
    
    try:
        transactions = crud_account.get_account_transactions(
            db, skip=skip, limit=limit, chemical_id=chemical_id
        )
        logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(transactions)} transactions for user {current_user.uid}")
        return transactions
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to fetch transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transactions: {str(e)}"
        )

@router.get("/transactions/{transaction_id}", response_model=AccountTransactionResponse)
def get_transaction(
    transaction_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific transaction"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} requested transaction details for ID: {transaction_id}")
    
    transaction = crud_account.get_account_transaction(db, transaction_id)
    if not transaction:
        logger.warning(f"[{datetime.now().isoformat()}] Transaction {transaction_id} not found for user {current_user.uid}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    logger.info(f"[{datetime.now().isoformat()}] Transaction {transaction_id} retrieved successfully for user {current_user.uid}")
    return transaction

@router.put("/transactions/{transaction_id}", response_model=AccountTransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction_update: AccountTransactionUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a transaction"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} updating transaction {transaction_id} with data: {transaction_update.dict(exclude_unset=True)}")
    
    try:
        transaction = crud_account.update_account_transaction(
            db, transaction_id, transaction_update
        )
        if not transaction:
            logger.warning(f"[{datetime.now().isoformat()}] Transaction {transaction_id} not found for update by user {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        # Log the transaction update
        user_info = get_user_by_uid(db, current_user.uid)
        if user_info:
            create_activity_log(
                db=db,
                user_id=user_info.id,
                action="update_transaction",
                description=f"Updated transaction {transaction_id}",
                note=f"Updated fields: {list(transaction_update.dict(exclude_unset=True).keys())}"
            )
        
        logger.info(f"[{datetime.now().isoformat()}] Transaction {transaction_id} updated successfully by user {current_user.uid}")
        return transaction
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to update transaction {transaction_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update transaction: {str(e)}"
        )

@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction (admin only)"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} attempting to delete transaction {transaction_id}")
    
    try:
        # Check if user is admin
        user_info = get_user_by_uid(db, current_user.uid)
        if not user_info or user_info.role != "admin":
            logger.warning(f"[{datetime.now().isoformat()}] User {current_user.uid} ({user_info.email if user_info else 'unknown'}) attempted to delete transaction without admin role")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete transactions"
            )
        
        success = crud_account.delete_account_transaction(db, transaction_id)
        if not success:
            logger.warning(f"[{datetime.now().isoformat()}] Transaction {transaction_id} not found for deletion by admin {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        # Log the transaction deletion
        create_activity_log(
            db=db,
            user_id=user_info.id,
            action="delete_transaction",
            description=f"Deleted transaction {transaction_id}",
            note=f"Admin {user_info.email} deleted transaction"
        )
        
        logger.info(f"[{datetime.now().isoformat()}] Transaction {transaction_id} deleted successfully by admin {current_user.uid} ({user_info.email})")
        return {"message": "Transaction deleted successfully"}
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to delete transaction {transaction_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete transaction: {str(e)}"
        )

@router.put("/transactions/{transaction_id}/approve")
def approve_transaction(
    transaction_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a pending transaction (admin only)"""
    logger.info(f"[{datetime.now().isoformat()}] Approval request for transaction {transaction_id} from user {current_user.uid}")
    
    try:
        # Check if user is admin
        user_info = get_user_by_uid(db, current_user.uid)
        if not user_info or user_info.role != "admin":
            logger.warning(f"[{datetime.now().isoformat()}] User {current_user.uid} ({user_info.email if user_info else 'unknown'}) attempted to approve transaction without admin role")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can approve transactions"
            )
        
        transaction = crud_account.get_account_transaction(db, transaction_id)
        if not transaction:
            logger.warning(f"[{datetime.now().isoformat()}] Transaction {transaction_id} not found for approval by admin {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        if transaction.status != "pending":
            logger.warning(f"[{datetime.now().isoformat()}] Transaction {transaction_id} cannot be approved - current status: {transaction.status} by admin {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending transactions can be approved"
            )
        
        # Update transaction status to completed
        transaction_update = AccountTransactionUpdate(status="completed")
        updated_transaction = crud_account.update_account_transaction(
            db, transaction_id, transaction_update
        )
        
        # Log the approval
        create_activity_log(
            db=db,
            user_id=user_info.id,
            action="approve_transaction",
            description=f"Approved transaction {transaction_id}",
            note=f"Admin {user_info.email} approved transaction from {transaction.status} to completed"
        )
        
        logger.info(f"[{datetime.now().isoformat()}] Transaction {transaction_id} approved successfully by admin {current_user.uid} ({user_info.email})")
        return updated_transaction
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to approve transaction {transaction_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve transaction: {str(e)}"
        )

@router.put("/transactions/{transaction_id}/reject")
def reject_transaction(
    transaction_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a pending transaction (admin only)"""
    logger.info(f"[{datetime.now().isoformat()}] Rejection request for transaction {transaction_id} from user {current_user.uid}")
    
    try:
        # Check if user is admin
        user_info = get_user_by_uid(db, current_user.uid)
        if not user_info or user_info.role != "admin":
            logger.warning(f"[{datetime.now().isoformat()}] User {current_user.uid} ({user_info.email if user_info else 'unknown'}) attempted to reject transaction without admin role")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can reject transactions"
            )
        
        transaction = crud_account.get_account_transaction(db, transaction_id)
        if not transaction:
            logger.warning(f"[{datetime.now().isoformat()}] Transaction {transaction_id} not found for rejection by admin {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        if transaction.status != "pending":
            logger.warning(f"[{datetime.now().isoformat()}] Transaction {transaction_id} cannot be rejected - current status: {transaction.status} by admin {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending transactions can be rejected"
            )
        
        # Update transaction status to cancelled
        transaction_update = AccountTransactionUpdate(status="cancelled")
        updated_transaction = crud_account.update_account_transaction(
            db, transaction_id, transaction_update
        )
        
        # Log the rejection
        create_activity_log(
            db=db,
            user_id=user_info.id,
            action="reject_transaction",
            description=f"Rejected transaction {transaction_id}",
            note=f"Admin {user_info.email} rejected transaction from {transaction.status} to cancelled"
        )
        
        logger.info(f"[{datetime.now().isoformat()}] Transaction {transaction_id} rejected successfully by admin {current_user.uid} ({user_info.email})")
        return updated_transaction
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to reject transaction {transaction_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject transaction: {str(e)}"
        )

# Purchase Order Endpoints
@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
def create_purchase_order(
    purchase_order: PurchaseOrderCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new purchase order"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} creating purchase order for supplier: {purchase_order.supplier}, total amount: ₹{purchase_order.total_amount}")
    
    try:
        # Check if user has account role
        user_info = get_user_by_uid(db, current_user.uid)
        if not user_info or user_info.role not in ['admin', 'account']:
            logger.warning(f"[{datetime.now().isoformat()}] User {current_user.uid} ({user_info.email if user_info else 'unknown'}) attempted to create purchase order without proper role")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only account team members can create purchase orders"
            )
        
        db_order = crud_account.create_purchase_order(
            db, purchase_order, current_user.uid
        )
        
        # Log the purchase order creation
        create_activity_log(
            db=db,
            user_id=user_info.id,
            action="create_purchase_order",
            description=f"Created purchase order {db_order.order_number} for supplier {purchase_order.supplier}",
            note=f"Total amount: ₹{purchase_order.total_amount} {purchase_order.currency}, Items: {len(purchase_order.items)}"
        )
        
        logger.info(f"[{datetime.now().isoformat()}] Purchase order {db_order.order_number} created successfully by user {current_user.uid} ({user_info.email})")
        return db_order
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to create purchase order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create purchase order: {str(e)}"
        )

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def get_purchase_orders(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get purchase orders"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} requested purchase orders (skip: {skip}, limit: {limit}, status: {status})")
    
    try:
        orders = crud_account.get_purchase_orders(
            db, skip=skip, limit=limit, status=status
        )
        logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(orders)} purchase orders for user {current_user.uid}")
        return orders
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to fetch purchase orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch purchase orders: {str(e)}"
        )

@router.get("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    order_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific purchase order"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} requested purchase order details for ID: {order_id}")
    
    order = crud_account.get_purchase_order(db, order_id)
    if not order:
        logger.warning(f"[{datetime.now().isoformat()}] Purchase order {order_id} not found for user {current_user.uid}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )
    
    logger.info(f"[{datetime.now().isoformat()}] Purchase order {order_id} retrieved successfully for user {current_user.uid}")
    return order

@router.put("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    order_id: int,
    order_update: PurchaseOrderUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a purchase order"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} updating purchase order {order_id} with data: {order_update.dict(exclude_unset=True)}")
    
    try:
        order = crud_account.update_purchase_order(
            db, order_id, order_update
        )
        if not order:
            logger.warning(f"[{datetime.now().isoformat()}] Purchase order {order_id} not found for update by user {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )
        
        # Log the purchase order update
        user_info = get_user_by_uid(db, current_user.uid)
        if user_info:
            create_activity_log(
                db=db,
                user_id=user_info.id,
                action="update_purchase_order",
                description=f"Updated purchase order {order_id}",
                note=f"Updated fields: {list(order_update.dict(exclude_unset=True).keys())}"
            )
        
        logger.info(f"[{datetime.now().isoformat()}] Purchase order {order_id} updated successfully by user {current_user.uid}")
        return order
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to update purchase order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update purchase order: {str(e)}"
        )

@router.delete("/purchase-orders/{order_id}")
def delete_purchase_order(
    order_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a purchase order (admin only)"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} attempting to delete purchase order {order_id}")
    
    try:
        # Check if user is admin
        user_info = get_user_by_uid(db, current_user.uid)
        if not user_info or user_info.role != "admin":
            logger.warning(f"[{datetime.now().isoformat()}] User {current_user.uid} ({user_info.email if user_info else 'unknown'}) attempted to delete purchase order without admin role")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete purchase orders"
            )
        
        success = crud_account.delete_purchase_order(db, order_id)
        if not success:
            logger.warning(f"[{datetime.now().isoformat()}] Purchase order {order_id} not found for deletion by admin {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )
        
        # Log the purchase order deletion
        create_activity_log(
            db=db,
            user_id=user_info.id,
            action="delete_purchase_order",
            description=f"Deleted purchase order {order_id}",
            note=f"Admin {user_info.email} deleted purchase order"
        )
        
        logger.info(f"[{datetime.now().isoformat()}] Purchase order {order_id} deleted successfully by admin {current_user.uid} ({user_info.email})")
        return {"message": "Purchase order deleted successfully"}
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to delete purchase order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete purchase order: {str(e)}"
        )

# Summary and Analytics Endpoints
@router.get("/summary", response_model=AccountSummary)
def get_account_summary(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get account summary statistics"""
    logger.info(f"[{datetime.now().isoformat()}] Account summary request from user {current_user.uid}")
    
    try:
        summary = crud_account.get_account_summary(db)
        logger.info(f"[{datetime.now().isoformat()}] Account summary returned successfully to user {current_user.uid}")
        return summary
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to fetch account summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch account summary: {str(e)}"
        )

@router.get("/chemicals/{chemical_id}/purchase-history", response_model=ChemicalPurchaseHistory)
def get_chemical_purchase_history(
    chemical_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get purchase history for a specific chemical"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} requested purchase history for chemical ID: {chemical_id}")
    
    try:
        history = crud_account.get_chemical_purchase_history(db, chemical_id)
        logger.info(f"[{datetime.now().isoformat()}] Retrieved purchase history for chemical {chemical_id} for user {current_user.uid}")
        return history
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to fetch purchase history for chemical {chemical_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch purchase history: {str(e)}"
        )

@router.get("/chemicals/{chemical_id}/purchase-transactions", response_model=List[AccountTransactionResponse])
def get_chemical_purchase_transactions(
    chemical_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all purchase transactions for a specific chemical"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} requested purchase transactions for chemical ID: {chemical_id}")
    
    try:
        transactions = crud_account.get_chemical_purchase_transactions(db, chemical_id)
        logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(transactions)} purchase transactions for chemical {chemical_id} for user {current_user.uid}")
        return transactions
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to fetch purchase transactions for chemical {chemical_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch purchase transactions: {str(e)}"
        )

@router.get("/recent-transactions", response_model=List[AccountTransactionResponse])
def get_recent_transactions(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent transactions"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} requested recent transactions (limit: {limit})")
    
    try:
        transactions = crud_account.get_recent_transactions(db, limit)
        logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(transactions)} recent transactions for user {current_user.uid}")
        return transactions
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to fetch recent transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch recent transactions: {str(e)}"
        )

@router.get("/pending-purchases", response_model=List[AccountTransactionResponse])
def get_pending_purchases(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending purchase transactions"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} requested pending purchases")
    
    try:
        transactions = crud_account.get_pending_purchases(db)
        logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(transactions)} pending purchases for user {current_user.uid}")
        return transactions
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to fetch pending purchases: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending purchases: {str(e)}"
        ) 