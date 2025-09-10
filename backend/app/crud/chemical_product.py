"""
CRUD operations for ChemicalProduct model
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.chemical_product import ChemicalProduct
from ..models.chemical import Chemical


def create_chemical_product(db: Session, chemical_id: int, name: str, base_composition_qty: float, 
                           unit: str, created_by: int, note: Optional[str] = None) -> ChemicalProduct:
    """Create a new chemical product"""
    # Verify the chemical exists
    chemical = db.query(Chemical).filter(Chemical.id == chemical_id).first()
    if not chemical:
        raise ValueError(f"Chemical with ID {chemical_id} does not exist")
    
    product = ChemicalProduct(
        chemical_id=chemical_id,
        name=name,
        base_composition_qty=base_composition_qty,
        unit=unit,
        created_by=created_by,
        note=note
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_chemical_product(db: Session, product_id: int) -> Optional[ChemicalProduct]:
    """Get chemical product by ID"""
    return db.query(ChemicalProduct).filter(ChemicalProduct.id == product_id).first()


def get_chemical_products(db: Session, skip: int = 0, limit: int = 100) -> List[ChemicalProduct]:
    """Get all chemical products with pagination"""
    return db.query(ChemicalProduct).offset(skip).limit(limit).all()


def get_chemical_product_by_name(db: Session, name: str) -> Optional[ChemicalProduct]:
    """Get chemical product by name"""
    return db.query(ChemicalProduct).filter(ChemicalProduct.name == name).first()


def update_chemical_product(db: Session, product_id: int, **kwargs) -> Optional[ChemicalProduct]:
    """Update chemical product"""
    product = get_chemical_product(db, product_id)
    if product:
        for key, value in kwargs.items():
            if hasattr(product, key):
                setattr(product, key, value)
        db.commit()
        db.refresh(product)
    return product


def delete_chemical_product(db: Session, product_id: int) -> bool:
    """Delete chemical product"""
    product = get_chemical_product(db, product_id)
    if product:
        db.delete(product)
        db.commit()
        return True
    return False


def get_chemical_products_by_creator(db: Session, created_by: int, skip: int = 0, limit: int = 100) -> List[ChemicalProduct]:
    """Get chemical products created by a specific user"""
    return db.query(ChemicalProduct).filter(
        ChemicalProduct.created_by == created_by
    ).offset(skip).limit(limit).all()


def search_chemical_products(db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[ChemicalProduct]:
    """Search chemical products by name"""
    return db.query(ChemicalProduct).filter(
        or_(
            ChemicalProduct.name.ilike(f"%{search_term}%")
        )
    ).offset(skip).limit(limit).all()


def get_chemical_product_with_chemical(db: Session, product_id: int) -> Optional[dict]:
    """Get chemical product with associated chemical information"""
    product = db.query(ChemicalProduct).filter(ChemicalProduct.id == product_id).first()
    if not product:
        return None
    
    chemical = db.query(Chemical).filter(Chemical.id == product.chemical_id).first()
    
    return {
        "id": product.id,
        "name": product.name,
        "base_composition_qty": product.base_composition_qty,
        "unit": product.unit,
        "note": product.note,
        "created_by": product.created_by,
        "created_at": product.created_at,
        "last_updated": product.last_updated,
        "chemical": {
            "id": chemical.id,
            "name": chemical.name,
            "unit": chemical.unit,
            "available_qty": chemical.available_qty,
            "threshold_qty": chemical.threshold_qty,
            "is_manufactured": chemical.is_manufactured
        } if chemical else None
    } 