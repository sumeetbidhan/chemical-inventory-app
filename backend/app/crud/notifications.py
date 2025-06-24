from sqlalchemy.orm import Session
from app.models.notifications import Notification
from app.schema.notifications import NotificationCreate, NotificationUpdate
from typing import List, Optional
import json

def create_notification(db: Session, notification: NotificationCreate, user_id: Optional[str] = None) -> Notification:
    db_notification = Notification(
        type=notification.type,
        severity=notification.severity,
        message=notification.message,
        chemical_id=notification.chemical_id,
        user_id=user_id,
        recipients=json.dumps(notification.recipients) if notification.recipients else None
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_notifications(db: Session, skip: int = 0, limit: int = 100, user_role: Optional[str] = None) -> List[Notification]:
    query = db.query(Notification)
    
    # Filter by user role if specified
    if user_role:
        query = query.filter(Notification.recipients.contains(user_role))
    
    return query.offset(skip).limit(limit).all()

def get_notification(db: Session, notification_id: int) -> Optional[Notification]:
    return db.query(Notification).filter(Notification.id == notification_id).first()

def update_notification(db: Session, notification_id: int, notification_update: NotificationUpdate) -> Optional[Notification]:
    db_notification = get_notification(db, notification_id)
    if db_notification:
        update_data = notification_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_notification, field, value)
        db.commit()
        db.refresh(db_notification)
    return db_notification

def delete_notification(db: Session, notification_id: int) -> bool:
    db_notification = get_notification(db, notification_id)
    if db_notification:
        db.delete(db_notification)
        db.commit()
        return True
    return False

def dismiss_notification(db: Session, notification_id: int) -> Optional[Notification]:
    return update_notification(db, notification_id, NotificationUpdate(is_dismissed=True))

def mark_notification_read(db: Session, notification_id: int) -> Optional[Notification]:
    return update_notification(db, notification_id, NotificationUpdate(is_read=True))

def get_unread_notifications(db: Session, user_role: Optional[str] = None) -> List[Notification]:
    query = db.query(Notification).filter(Notification.is_read == False)
    
    if user_role:
        query = query.filter(Notification.recipients.contains(user_role))
    
    return query.all()

def get_active_notifications(db: Session, user_role: Optional[str] = None) -> List[Notification]:
    query = db.query(Notification).filter(Notification.is_dismissed == False)
    
    if user_role:
        query = query.filter(Notification.recipients.contains(user_role))
    
    return query.all() 