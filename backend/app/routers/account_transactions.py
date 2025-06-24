from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.firebase_auth import get_current_user
from app.crud import account_transactions as crud_account
from app.schema.account_transactions import (
    AccountTransactionCreate, AccountTransactionResponse, AccountTransactionUpdate,
    PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderUpdate,
    AccountSummary, ChemicalPurchaseHistory
)
from typing import List
import json

router = APIRouter(prefix="/account", tags=["account"])

# Account Transaction Endpoints
@router.post("/transactions", response_model=AccountTransactionResponse)
def create_transaction(
    transaction: AccountTransactionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new account transaction"""
    try:
        # Check if user has account role
        from app.crud import users as crud_users
        user_info = crud_users.get_user_by_uid(db, current_user.get("uid"))
        if not user_info or user_info.role not in ['admin', 'account']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only account team members can create transactions"
            )
        
        db_transaction = crud_account.create_account_transaction(
            db, transaction, current_user.get("uid")
        )
        return db_transaction
    except Exception as e:
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
    try:
        transactions = crud_account.get_account_transactions(
            db, skip=skip, limit=limit, chemical_id=chemical_id
        )
        return transactions
    except Exception as e:
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
    transaction = crud_account.get_account_transaction(db, transaction_id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    return transaction

@router.put("/transactions/{transaction_id}", response_model=AccountTransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction_update: AccountTransactionUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a transaction"""
    try:
        transaction = crud_account.update_account_transaction(
            db, transaction_id, transaction_update
        )
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        return transaction
    except Exception as e:
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
    try:
        # Check if user is admin
        from app.crud import users as crud_users
        user_info = crud_users.get_user_by_uid(db, current_user.get("uid"))
        if not user_info or user_info.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete transactions"
            )
        
        success = crud_account.delete_account_transaction(db, transaction_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        return {"message": "Transaction deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete transaction: {str(e)}"
        )

# Purchase Order Endpoints
@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
def create_purchase_order(
    purchase_order: PurchaseOrderCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new purchase order"""
    try:
        # Check if user has account role
        from app.crud import users as crud_users
        user_info = crud_users.get_user_by_uid(db, current_user.get("uid"))
        if not user_info or user_info.role not in ['admin', 'account']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only account team members can create purchase orders"
            )
        
        db_order = crud_account.create_purchase_order(
            db, purchase_order, current_user.get("uid")
        )
        return db_order
    except Exception as e:
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
    try:
        orders = crud_account.get_purchase_orders(
            db, skip=skip, limit=limit, status=status
        )
        return orders
    except Exception as e:
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
    order = crud_account.get_purchase_order(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )
    return order

@router.put("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    order_id: int,
    order_update: PurchaseOrderUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a purchase order"""
    try:
        order = crud_account.update_purchase_order(
            db, order_id, order_update
        )
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )
        return order
    except Exception as e:
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
    try:
        # Check if user is admin
        from app.crud import users as crud_users
        user_info = crud_users.get_user_by_uid(db, current_user.get("uid"))
        if not user_info or user_info.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete purchase orders"
            )
        
        success = crud_account.delete_purchase_order(db, order_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )
        return {"message": "Purchase order deleted successfully"}
    except Exception as e:
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
    try:
        summary = crud_account.get_account_summary(db)
        return summary
    except Exception as e:
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
    try:
        history = crud_account.get_chemical_purchase_history(db, chemical_id)
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch purchase history: {str(e)}"
        )

@router.get("/recent-transactions", response_model=List[AccountTransactionResponse])
def get_recent_transactions(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent transactions"""
    try:
        transactions = crud_account.get_recent_transactions(db, limit)
        return transactions
    except Exception as e:
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
    try:
        transactions = crud_account.get_pending_purchases(db)
        return transactions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending purchases: {str(e)}"
        ) 