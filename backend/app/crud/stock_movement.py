from sqlalchemy.orm import Session
from app.models.stock_movement import StockMovement
from app.schema.stock_movement import StockMovementCreate, StockMovementUpdate
from typing import List, Optional

def create_stock_movement(db: Session, stock_movement: StockMovementCreate) -> StockMovement:
    db_stock_movement = StockMovement(
        chemical_id=stock_movement.chemical_id,
        change_type=stock_movement.change_type,
        quantity_changed=stock_movement.quantity_changed,
        unit=stock_movement.unit,
        action=stock_movement.action,
        reference_id=stock_movement.reference_id
    )
    db.add(db_stock_movement)
    db.commit()
    db.refresh(db_stock_movement)
    return db_stock_movement

def get_stock_movements(db: Session, skip: int = 0, limit: int = 100, chemical_id: Optional[int] = None) -> List[StockMovement]:
    query = db.query(StockMovement)
    
    if chemical_id:
        query = query.filter(StockMovement.chemical_id == chemical_id)
    
    return query.order_by(StockMovement.timestamp.desc()).offset(skip).limit(limit).all()

def get_stock_movement(db: Session, movement_id: int) -> Optional[StockMovement]:
    return db.query(StockMovement).filter(StockMovement.id == movement_id).first()

def update_stock_movement(db: Session, movement_id: int, movement_update: StockMovementUpdate) -> Optional[StockMovement]:
    db_movement = get_stock_movement(db, movement_id)
    if db_movement:
        update_data = movement_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_movement, field, value)
        db.commit()
        db.refresh(db_movement)
    return db_movement

def delete_stock_movement(db: Session, movement_id: int) -> bool:
    db_movement = get_stock_movement(db, movement_id)
    if not db_movement:
        return False
    db.delete(db_movement)
    db.commit()
    return True

def get_stock_movements_by_chemical(db: Session, chemical_id: int) -> List[StockMovement]:
    return db.query(StockMovement).filter(StockMovement.chemical_id == chemical_id).order_by(StockMovement.timestamp.desc()).all()

def get_stock_movements_by_action(db: Session, action: str) -> List[StockMovement]:
    return db.query(StockMovement).filter(StockMovement.action == action).order_by(StockMovement.timestamp.desc()).all() 