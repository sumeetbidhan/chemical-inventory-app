from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import (
    get_all_users, get_pending_users, update_user, delete_user,
    get_user_by_id, get_users_by_role, get_user_by_email
)
from app.crud.activity_log import (
    get_activity_logs, update_activity_log_note, get_activity_log_by_id
)
from app.schema.user import UserUpdate, UserResponse
from app.schema.activity_log import ActivityLogFilter, ActivityLogListResponse, ActivityLogNote
from app.firebase_auth import get_admin_user
from app.models.user import UserRole
from typing import List, Optional
import firebase_admin
from firebase_admin import auth

router = APIRouter()

@router.post("/approve/{user_id}")
async def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Approve a pending user (Admin only)"""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_approved:
        raise HTTPException(status_code=400, detail="User already approved")
    
    # Approve user
    user_update = UserUpdate(is_approved=True)
    updated_user = update_user(db, user_id, user_update)
    
    # Log activity
    from app.crud.activity_log import create_activity_log
    create_activity_log(
        db, admin_user.id, "approve_user",
        f"Approved user: {user.email}"
    )
    
    return {"message": "User approved successfully", "user": updated_user}

@router.patch("/user/{user_id}", response_model=UserResponse)
async def modify_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Modify user (Admin only)"""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from modifying themselves
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify own account")
    
    # Update user
    updated_user = update_user(db, user_id, user_update)
    
    # Log activity
    from app.crud.activity_log import create_activity_log
    create_activity_log(
        db, admin_user.id, "modify_user",
        f"Modified user: {user.email}"
    )
    
    return updated_user

@router.delete("/user/{user_id}")
async def delete_user_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Delete user (Admin only)"""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from deleting themselves
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete own account")
    
    # Store user info before deletion for Firebase deletion
    user_uid = user.uid
    user_email = user.email
    
    # Delete user from database
    success = delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete user from database")
    
    # Delete user from Firebase Authentication
    try:
        # Delete the user from Firebase Auth
        auth.delete_user(user_uid)
        firebase_deleted = True
    except Exception as e:
        # Log the error but don't fail the entire operation
        print(f"Warning: Failed to delete user from Firebase: {e}")
        firebase_deleted = False
    
    # Log activity
    from app.crud.activity_log import create_activity_log
    create_activity_log(
        db, admin_user.id, "delete_user",
        f"Deleted user: {user_email} (Database: Success, Firebase: {'Success' if firebase_deleted else 'Failed'})"
    )
    
    return {
        "message": "User deleted successfully", 
        "database_deleted": True,
        "firebase_deleted": firebase_deleted
    }

@router.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[UserRole] = Query(None),
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Get all users (Admin only)"""
    if role:
        users = get_users_by_role(db, role)
    else:
        users = get_all_users(db, skip=skip, limit=limit)
    
    return users

@router.get("/pending-users", response_model=List[UserResponse])
async def get_pending_users_admin(
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Get pending users (Admin only)"""
    return get_pending_users(db)

@router.get("/logs", response_model=ActivityLogListResponse)
async def get_activity_logs_admin(
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Get activity logs with filters (Admin only)"""
    from datetime import datetime
    
    # Parse dates if provided
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    
    filters = ActivityLogFilter(
        user_id=user_id,
        action=action,
        start_date=start_dt,
        end_date=end_dt,
        limit=limit,
        offset=offset
    )
    
    logs, total = get_activity_logs(db, filters)
    
    # Add user email to each log for easier frontend display
    for log in logs:
        if log.user_id:
            user = get_user_by_id(db, log.user_id)
            log.user_email = user.email if user else None
    
    return ActivityLogListResponse(
        logs=logs,
        total=total,
        limit=limit,
        offset=offset
    )

@router.patch("/logs/{log_id}/note")
async def update_log_note(
    log_id: int,
    note_data: ActivityLogNote,
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Add/update note to activity log (Admin only)"""
    log = get_activity_log_by_id(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")
    
    updated_log = update_activity_log_note(db, log_id, note_data.note)
    
    # Log the note update
    from app.crud.activity_log import create_activity_log
    create_activity_log(
        db, admin_user.id, "update_log_note",
        f"Updated note on activity log: {log_id}"
    )
    
    return {"message": "Note updated successfully", "log": updated_log} 