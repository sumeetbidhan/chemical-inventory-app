from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.crud import stock_movement as crud_stock_movement
from app.schema.stock_movement import StockMovementCreate, StockMovementUpdate, StockMovementResponse
from app.firebase_auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/stock-movements", tags=["Stock Movements"])

@router.post("/", response_model=StockMovementResponse)
def create_stock_movement(
    stock_movement: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new stock movement record"""
    return crud_stock_movement.create_stock_movement(db, stock_movement)

@router.get("/", response_model=List[StockMovementResponse])
def get_stock_movements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    chemical_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all stock movements with optional filtering"""
    return crud_stock_movement.get_stock_movements(db, skip=skip, limit=limit, chemical_id=chemical_id)

@router.get("/{movement_id}", response_model=StockMovementResponse)
def get_stock_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific stock movement by ID"""
    movement = crud_stock_movement.get_stock_movement(db, movement_id)
    if not movement:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    return movement

@router.put("/{movement_id}", response_model=StockMovementResponse)
def update_stock_movement(
    movement_id: int,
    movement_update: StockMovementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a stock movement record"""
    movement = crud_stock_movement.update_stock_movement(db, movement_id, movement_update)
    if not movement:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    return movement

@router.delete("/{movement_id}")
def delete_stock_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a stock movement record"""
    success = crud_stock_movement.delete_stock_movement(db, movement_id)
    if not success:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    return {"message": "Stock movement deleted successfully"}

@router.get("/chemical/{chemical_id}", response_model=List[StockMovementResponse])
def get_stock_movements_by_chemical(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all stock movements for a specific chemical"""
    return crud_stock_movement.get_stock_movements_by_chemical(db, chemical_id)

@router.get("/action/{action}", response_model=List[StockMovementResponse])
def get_stock_movements_by_action(
    action: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all stock movements for a specific action"""
    return crud_stock_movement.get_stock_movements_by_action(db, action) 