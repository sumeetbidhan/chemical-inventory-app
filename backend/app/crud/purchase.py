from sqlalchemy.orm import Session
from app.models.purchase import Purchase
from app.schema.purchase import PurchaseCreate, PurchaseUpdate
from typing import List, Optional

def create_purchase(db: Session, purchase: PurchaseCreate, added_by: int) -> Purchase:
    db_purchase = Purchase(
        chemical_id=purchase.chemical_id,
        quantity_purchased=purchase.quantity_purchased,
        unit=purchase.unit,
        amount=purchase.amount,
        purchase_date=purchase.purchase_date,
        note=purchase.note,
        added_by=added_by
    )
    db.add(db_purchase)
    db.commit()
    db.refresh(db_purchase)
    return db_purchase

def get_purchases(db: Session, skip: int = 0, limit: int = 100, chemical_id: Optional[int] = None) -> List[Purchase]:
    query = db.query(Purchase)
    
    if chemical_id:
        query = query.filter(Purchase.chemical_id == chemical_id)
    
    return query.order_by(Purchase.purchase_date.desc()).offset(skip).limit(limit).all()

def get_purchase(db: Session, purchase_id: int) -> Optional[Purchase]:
    return db.query(Purchase).filter(Purchase.id == purchase_id).first()

def update_purchase(db: Session, purchase_id: int, purchase_update: PurchaseUpdate) -> Optional[Purchase]:
    db_purchase = get_purchase(db, purchase_id)
    if db_purchase:
        update_data = purchase_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_purchase, field, value)
        db.commit()
        db.refresh(db_purchase)
    return db_purchase

def delete_purchase(db: Session, purchase_id: int) -> bool:
    db_purchase = get_purchase(db, purchase_id)
    if not db_purchase:
        return False
    db.delete(db_purchase)
    db.commit()
    return True

def get_purchases_by_chemical(db: Session, chemical_id: int) -> List[Purchase]:
    return db.query(Purchase).filter(Purchase.chemical_id == chemical_id).order_by(Purchase.purchase_date.desc()).all()

def get_purchases_by_user(db: Session, user_id: int) -> List[Purchase]:
    return db.query(Purchase).filter(Purchase.added_by == user_id).order_by(Purchase.purchase_date.desc()).all() 