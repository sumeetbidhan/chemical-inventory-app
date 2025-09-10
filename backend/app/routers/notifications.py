from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.firebase_auth import get_current_user
from app.crud import notifications as crud_notifications
from app.crud import user as crud_users
from app.schema.notifications import NotificationCreate, NotificationResponse, NotificationUpdate, NotificationSend, NotificationFilter, NotificationDeleteRequest
from app.models.notification import NotificationCategory, NotificationPriority
from typing import List, Optional

router = APIRouter(tags=["Notifications"])

@router.post("/send", response_model=NotificationResponse)
def send_notification(
    notification: NotificationSend,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a notification to specified role"""
    try:
        db_notification = crud_notifications.create_notification(
            db=db,
            message=notification.message,
            category=notification.category,
            priority=notification.priority,
            role_id=notification.role_id
        )
        return db_notification
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(e)}"
        )

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[NotificationCategory] = Query(None),
    priority: Optional[NotificationPriority] = Query(None),
    is_read: Optional[bool] = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications with filters"""
    try:
        # Get user role from the database
        user_info = crud_users.get_user_by_uid(db, current_user.uid)
        user_role_id = user_info.role_id if user_info else None

        # Create filter object
        filters = NotificationFilter(
            category=category,
            priority=priority,
            is_read=is_read,
            role_id=user_role_id,
            skip=skip,
            limit=limit
        )
        
        notifications = crud_notifications.get_notifications(db, filters)
        return notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notifications: {str(e)}"
        )

@router.get("/unread", response_model=List[NotificationResponse])
def get_unread_notifications(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread notifications for the current user's role"""
    try:
        user_info = crud_users.get_user_by_uid(db, current_user.uid)
        user_role_id = user_info.role_id if user_info else None
        
        notifications = crud_notifications.get_unread_notifications(db, user_role_id)
        return notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get unread notifications: {str(e)}"
        )

@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(
    notification_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific notification by ID"""
    notification = crud_notifications.get_notification(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@router.put("/{notification_id}", response_model=NotificationResponse)
def update_notification(
    notification_id: int,
    notification_update: NotificationUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a notification"""
    notification = crud_notifications.update_notification(db, notification_id, **notification_update.dict(exclude_unset=True))
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    notification = crud_notifications.update_notification(db, notification_id, is_read=True)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    success = crud_notifications.delete_notification(db, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted successfully"}

@router.get("/categories/list")
def get_notification_categories():
    """Get list of available notification categories"""
    return [{"value": cat.value, "label": cat.name} for cat in NotificationCategory]

@router.get("/priorities/list")
def get_notification_priorities():
    """Get list of available notification priorities"""
    return [{"value": pri.value, "label": pri.name} for pri in NotificationPriority] 