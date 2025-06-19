from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import (
    get_all_users, get_pending_users, update_user, delete_user,
    get_user_by_id, get_users_by_role, get_user_by_email
)
from app.crud.invitation import (
    create_invitation, get_all_invitations, delete_invitation,
    get_invitation_by_email
)
from app.crud.activity_log import (
    get_activity_logs, update_activity_log_note, get_activity_log_by_id
)
from app.schema.user import UserUpdate, UserResponse
from app.schema.invitation import InvitationCreate, InvitationResponse, InvitationListResponse
from app.schema.activity_log import ActivityLogFilter, ActivityLogListResponse, ActivityLogNote
from app.firebase_auth import get_admin_user
from app.models.user import UserRole
from typing import List, Optional
import firebase_admin
from firebase_admin import auth

router = APIRouter()

@router.post("/invite", response_model=InvitationResponse)
async def invite_user(
    invitation_data: InvitationCreate,
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Invite a new user (Admin only)"""
    # Check if user already exists
    existing_user = get_user_by_email(db, invitation_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Check if invitation already exists
    existing_invitation = get_invitation_by_email(db, invitation_data.email)
    if existing_invitation:
        raise HTTPException(status_code=400, detail="Invitation already sent")
    
    # Create invitation
    invitation = create_invitation(db, invitation_data)
    
    # TODO: Send Firebase invite email
    # This would integrate with Firebase Auth to send invitation emails
    
    # Log activity
    from app.crud.activity_log import create_activity_log
    create_activity_log(
        db, admin_user.id, "invite_user",
        f"Invited user: {invitation_data.email} with role: {invitation_data.role.value}"
    )
    
    return invitation

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
    
    # Delete user
    success = delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete user")
    
    # Log activity
    from app.crud.activity_log import create_activity_log
    create_activity_log(
        db, admin_user.id, "delete_user",
        f"Deleted user: {user.email}"
    )
    
    return {"message": "User deleted successfully"}

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

@router.get("/invitations", response_model=InvitationListResponse)
async def get_invitations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Get all invitations (Admin only)"""
    invitations = get_all_invitations(db, skip=skip, limit=limit)
    total = len(invitations)  # This should be optimized with a count query
    
    return InvitationListResponse(
        invitations=invitations,
        total=total
    )

@router.delete("/invitation/{invitation_id}")
async def delete_invitation_admin(
    invitation_id: int,
    db: Session = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    """Delete invitation (Admin only)"""
    success = delete_invitation(db, invitation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Log activity
    from app.crud.activity_log import create_activity_log
    create_activity_log(
        db, admin_user.id, "delete_invitation",
        f"Deleted invitation: {invitation_id}"
    )
    
    return {"message": "Invitation deleted successfully"}

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