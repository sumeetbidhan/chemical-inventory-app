from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.firebase_auth import get_current_user
from app.crud import notifications as crud_notifications
from app.schema.notifications import NotificationCreate, NotificationResponse, NotificationUpdate, NotificationSend
from typing import List
import json

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.post("/send", response_model=NotificationResponse)
def send_notification(
    notification: NotificationSend,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a notification to specified recipients"""
    try:
        # Create notification for each recipient role
        notifications = []
        for recipient_role in notification.recipients:
            notification_data = NotificationCreate(
                type=notification.type,
                severity=notification.severity,
                message=notification.message,
                chemical_id=notification.chemical_id,
                recipients=[recipient_role]
            )
            db_notification = crud_notifications.create_notification(
                db, notification_data, current_user.get("uid")
            )
            notifications.append(db_notification)
        
        # Return the first notification (they're all the same except for recipients)
        return notifications[0] if notifications else None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(e)}"
        )

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for the current user's role"""
    try:
        # Get user role from the database
        from app.crud import users as crud_users
        user_info = crud_users.get_user_by_uid(db, current_user.get("uid"))
        user_role = user_info.role if user_info else "all_users"
        
        notifications = crud_notifications.get_notifications(
            db, skip=skip, limit=limit, user_role=user_role
        )
        return notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notifications: {str(e)}"
        )

@router.get("/unread", response_model=List[NotificationResponse])
def get_unread_notifications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread notifications for the current user's role"""
    try:
        from app.crud import users as crud_users
        user_info = crud_users.get_user_by_uid(db, current_user.get("uid"))
        user_role = user_info.role if user_info else "all_users"
        
        notifications = crud_notifications.get_unread_notifications(db, user_role)
        return notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unread notifications: {str(e)}"
        )

@router.get("/active", response_model=List[NotificationResponse])
def get_active_notifications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active (non-dismissed) notifications for the current user's role"""
    try:
        from app.crud import users as crud_users
        user_info = crud_users.get_user_by_uid(db, current_user.get("uid"))
        user_role = user_info.role if user_info else "all_users"
        
        notifications = crud_notifications.get_active_notifications(db, user_role)
        return notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch active notifications: {str(e)}"
        )

@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific notification by ID"""
    notification = crud_notifications.get_notification(db, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return notification

@router.put("/{notification_id}", response_model=NotificationResponse)
def update_notification(
    notification_id: int,
    notification_update: NotificationUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a notification"""
    notification = crud_notifications.update_notification(db, notification_id, notification_update)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return notification

@router.post("/{notification_id}/dismiss", response_model=NotificationResponse)
def dismiss_notification(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dismiss a notification"""
    notification = crud_notifications.dismiss_notification(db, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return notification

@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    notification = crud_notifications.mark_notification_read(db, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return notification

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification (admin only)"""
    # Check if user is admin
    from app.crud import users as crud_users
    user_info = crud_users.get_user_by_uid(db, current_user.get("uid"))
    if not user_info or user_info.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete notifications"
        )
    
    success = crud_notifications.delete_notification(db, notification_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return {"message": "Notification deleted successfully"} 