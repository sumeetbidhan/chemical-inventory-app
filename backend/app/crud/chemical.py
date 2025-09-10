"""
CRUD operations for Chemical model
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.chemical import Chemical


def create_chemical(db: Session, name: str, unit: str, available_qty: float = 0.0, 
                   threshold_qty: float = 0.0, is_manufactured: bool = False) -> Chemical:
    """Create a new chemical"""
    chemical = Chemical(
        name=name,
        unit=unit,
        available_qty=available_qty,
        threshold_qty=threshold_qty,
        is_manufactured=is_manufactured
    )
    db.add(chemical)
    db.commit()
    db.refresh(chemical)
    return chemical


def get_chemical(db: Session, chemical_id: int) -> Optional[Chemical]:
    """Get chemical by ID"""
    return db.query(Chemical).filter(Chemical.id == chemical_id).first()


def get_chemicals(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """Get all chemicals with pagination"""
    return db.query(Chemical).offset(skip).limit(limit).all()


def get_chemical_by_name(db: Session, name: str) -> Optional[Chemical]:
    """Get chemical by name"""
    return db.query(Chemical).filter(Chemical.name == name).first()


def update_chemical(db: Session, chemical_id: int, **kwargs) -> Optional[Chemical]:
    """Update chemical"""
    chemical = get_chemical(db, chemical_id)
    if chemical:
        for key, value in kwargs.items():
            if hasattr(chemical, key):
                setattr(chemical, key, value)
        db.commit()
        db.refresh(chemical)
    return chemical


def delete_chemical(db: Session, chemical_id: int) -> bool:
    """Delete chemical"""
    chemical = get_chemical(db, chemical_id)
    if chemical:
        db.delete(chemical)
        db.commit()
        return True
    return False


def update_chemical_quantity(db: Session, chemical_id: int, quantity_change: float) -> Optional[Chemical]:
    """Update chemical stock quantity"""
    chemical = get_chemical(db, chemical_id)
    if chemical:
        chemical.available_qty += quantity_change
        db.commit()
        db.refresh(chemical)
    return chemical


def search_chemicals(db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """Search chemicals by name"""
    return db.query(Chemical).filter(
        or_(
            Chemical.name.ilike(f"%{search_term}%")
        )
    ).offset(skip).limit(limit).all()


def get_low_stock_chemicals(db: Session) -> List[Chemical]:
    """Get chemicals with low stock"""
    return db.query(Chemical).filter(
        Chemical.available_qty <= Chemical.threshold_qty
    ).all()


def get_raw_chemicals(db: Session) -> List[Chemical]:
    """Get all raw chemicals (not manufactured)"""
    return db.query(Chemical).filter(Chemical.is_manufactured == False).all()


def get_manufactured_chemicals(db: Session) -> List[Chemical]:
    """Get all manufactured chemicals"""
    return db.query(Chemical).filter(Chemical.is_manufactured == True).all()


def create_manufactured_chemical(db: Session, name: str, unit: str, 
                               available_qty: float = 0.0, threshold_qty: float = 0.0) -> Chemical:
    """Create a new manufactured chemical"""
    return create_chemical(
        db=db,
        name=name,
        unit=unit,
        available_qty=available_qty,
        threshold_qty=threshold_qty,
        is_manufactured=True
    ) 