from sqlalchemy.orm import Session
from app.models.alert import Alert
from app.schema.alerts import AlertCreate, AlertUpdate, AlertFilter
from typing import List, Optional
from datetime import datetime

def create_alert(db: Session, alert: AlertCreate) -> Alert:
    db_alert = Alert(
        chemical_id=alert.chemical_id,
        message=alert.message,
        threshold=alert.threshold
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_alerts(db: Session, skip: int = 0, limit: int = 100, filters: Optional[AlertFilter] = None) -> List[Alert]:
    query = db.query(Alert)
    
    # Apply filters
    if filters:
        if filters.chemical_id:
            query = query.filter(Alert.chemical_id == filters.chemical_id)
        if filters.is_resolved is not None:
            query = query.filter(Alert.is_resolved == filters.is_resolved)
    
    return query.order_by(Alert.triggered_at.desc()).offset(skip).limit(limit).all()

def get_alert(db: Session, alert_id: int) -> Optional[Alert]:
    return db.query(Alert).filter(Alert.id == alert_id).first()

def update_alert(db: Session, alert_id: int, alert_update: AlertUpdate) -> Optional[Alert]:
    db_alert = get_alert(db, alert_id)
    if db_alert:
        update_data = alert_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_alert, field, value)
        db.commit()
        db.refresh(db_alert)
    return db_alert

def delete_alert(db: Session, alert_id: int) -> bool:
    db_alert = get_alert(db, alert_id)
    if not db_alert:
        return False
    db.delete(db_alert)
    db.commit()
    return True

def resolve_alert(db: Session, alert_id: int, resolved_by: int) -> Optional[Alert]:
    db_alert = get_alert(db, alert_id)
    if db_alert:
        db_alert.is_resolved = True
        db_alert.resolved_at = datetime.utcnow()
        db_alert.resolved_by = resolved_by
        db.commit()
        db.refresh(db_alert)
    return db_alert

def get_unresolved_alerts(db: Session) -> List[Alert]:
    return db.query(Alert).filter(Alert.is_resolved == False).order_by(Alert.triggered_at.desc()).all()

def get_alerts_by_chemical(db: Session, chemical_id: int) -> List[Alert]:
    return db.query(Alert).filter(Alert.chemical_id == chemical_id).order_by(Alert.triggered_at.desc()).all()

def create_low_stock_alert(db: Session, chemical_id: int, chemical_name: str, quantity: float, unit: str, threshold: float) -> Alert:
    alert = AlertCreate(
        chemical_id=chemical_id,
        message=f"Low stock alert: {chemical_name} has only {quantity} {unit} remaining (threshold: {threshold} {unit})",
        threshold=threshold
    )
    return create_alert(db, alert)

def create_out_of_stock_alert(db: Session, chemical_id: int, chemical_name: str) -> Alert:
    alert = AlertCreate(
        chemical_id=chemical_id,
        message=f"Out of stock: {chemical_name} is completely depleted",
        threshold=0.0
    )
    return create_alert(db, alert) 