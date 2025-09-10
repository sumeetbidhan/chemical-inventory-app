from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationCategory, NotificationPriority
from app.schema.notifications import NotificationCreate, NotificationUpdate, NotificationFilter
from typing import List, Optional

def create_notification(db: Session, notification: NotificationCreate) -> Notification:
    db_notification = Notification(
        message=notification.message,
        category=notification.category,
        priority=notification.priority,
        role_id=notification.role_id
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_notifications(db: Session, skip: int = 0, limit: int = 100, role_id: Optional[int] = None, filters: Optional[NotificationFilter] = None) -> List[Notification]:
    query = db.query(Notification)
    
    # Filter by role if specified
    if role_id:
        query = query.filter(Notification.role_id == role_id)
    
    # Apply additional filters
    if filters:
        if filters.category:
            query = query.filter(Notification.category == filters.category)
        if filters.priority:
            query = query.filter(Notification.priority == filters.priority)
        if filters.is_read is not None:
            query = query.filter(Notification.is_read == filters.is_read)
    
    return query.order_by(Notification.timestamp.desc()).offset(skip).limit(limit).all()

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
    if not db_notification:
        return False
    db.delete(db_notification)
    db.commit()
    return True

def mark_notification_read(db: Session, notification_id: int) -> Optional[Notification]:
    return update_notification(db, notification_id, NotificationUpdate(is_read=True))

def get_unread_notifications(db: Session, role_id: Optional[int] = None) -> List[Notification]:
    query = db.query(Notification).filter(Notification.is_read == False)
    
    if role_id:
        query = query.filter(Notification.role_id == role_id)
    
    return query.order_by(Notification.timestamp.desc()).all()

def get_notifications_by_category(db: Session, category: NotificationCategory, role_id: Optional[int] = None) -> List[Notification]:
    query = db.query(Notification).filter(Notification.category == category)
    
    if role_id:
        query = query.filter(Notification.role_id == role_id)
    
    return query.order_by(Notification.timestamp.desc()).all()

def get_notifications_by_priority(db: Session, priority: NotificationPriority, role_id: Optional[int] = None) -> List[Notification]:
    query = db.query(Notification).filter(Notification.priority == priority)
    
    if role_id:
        query = query.filter(Notification.role_id == role_id)
    
    return query.order_by(Notification.timestamp.desc()).all()

def get_notification_count(db: Session, role_id: Optional[int] = None, unread_only: bool = False) -> int:
    query = db.query(Notification)
    
    if role_id:
        query = query.filter(Notification.role_id == role_id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    return query.count() 