from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.crud import purchase as crud_purchase
from app.schema.purchase import PurchaseCreate, PurchaseUpdate, PurchaseResponse
from app.firebase_auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/purchases", tags=["Purchases"])

@router.post("/", response_model=PurchaseResponse)
def create_purchase(
    purchase: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new purchase record"""
    return crud_purchase.create_purchase(db, purchase, current_user.id)

@router.get("/", response_model=List[PurchaseResponse])
def get_purchases(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    chemical_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all purchases with optional filtering"""
    return crud_purchase.get_purchases(db, skip=skip, limit=limit, chemical_id=chemical_id)

@router.get("/{purchase_id}", response_model=PurchaseResponse)
def get_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific purchase by ID"""
    purchase = crud_purchase.get_purchase(db, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase

@router.put("/{purchase_id}", response_model=PurchaseResponse)
def update_purchase(
    purchase_id: int,
    purchase_update: PurchaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a purchase record"""
    purchase = crud_purchase.update_purchase(db, purchase_id, purchase_update)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase

@router.delete("/{purchase_id}")
def delete_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a purchase record"""
    success = crud_purchase.delete_purchase(db, purchase_id)
    if not success:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return {"message": "Purchase deleted successfully"}

@router.get("/chemical/{chemical_id}", response_model=List[PurchaseResponse])
def get_purchases_by_chemical(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all purchases for a specific chemical"""
    return crud_purchase.get_purchases_by_chemical(db, chemical_id)

@router.get("/user/{user_id}", response_model=List[PurchaseResponse])
def get_purchases_by_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all purchases made by a specific user"""
    return crud_purchase.get_purchases_by_user(db, user_id) 