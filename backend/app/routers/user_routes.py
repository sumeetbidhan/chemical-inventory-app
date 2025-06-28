from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import get_user_by_id, get_user_by_uid
from app.crud.activity_log import get_user_activity_logs
from app.schema.user import DashboardResponse, UserResponse
from app.schema.activity_log import ActivityLogResponse
from app.firebase_auth import get_approved_user, verify_firebase_token
from app.models.user import UserRole
from typing import List

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user = Depends(get_approved_user)
):
    """Get current user information (approved users only)"""
    return current_user

@router.get("/status")
async def get_user_status(
    token: dict = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    """Get user status (works for both approved and pending users)"""
    user = get_user_by_uid(db, token["uid"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_approved": user.is_approved,
        "created_at": user.created_at,
        "updated_at": user.updated_at
    }

@router.get("/dashboard", response_model=DashboardResponse)
async def get_user_dashboard(
    current_user = Depends(get_approved_user)
):
    """Get user-specific dashboard data"""
    # Define permissions based on role
    permissions = []
    
    if current_user.role == UserRole.ADMIN:
        permissions = [
            "manage_users", "manage_invitations", "view_logs", 
            "approve_users", "delete_users", "modify_users","view_inventory", "add_chemicals", "update_chemicals",
            "view_reports", "manage_safety_data","manage_accounts","view_financial_data"
        ]
    elif current_user.role == UserRole.LAB_STAFF:
        permissions = [
            "view_inventory", "add_chemicals", "update_chemicals",
            "view_reports", "manage_safety_data"
        ]
    elif current_user.role == UserRole.PRODUCT:
        permissions = [
            "view_inventory", "view_reports", "export_data",
            "manage_product_info"
        ]
    elif current_user.role == UserRole.ACCOUNT:
        permissions = [
            "view_inventory", "view_reports", "manage_accounts",
            "view_financial_data"
        ]
    elif current_user.role == UserRole.ALL_USERS:
        permissions = [
            "view_inventory", "view_reports", "basic_access"
        ]
    
    return DashboardResponse(
        user=current_user,
        role=current_user.role,
        permissions=permissions
    )

@router.get("/activity", response_model=List[ActivityLogResponse])
async def get_user_activity(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_approved_user)
):
    """Get current user's activity logs"""
    logs = get_user_activity_logs(db, current_user.id, limit=limit)
    
    # Convert to response format
    response_logs = []
    for log in logs:
        response_logs.append(ActivityLogResponse(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            description=log.description,
            timestamp=log.timestamp,
            note=log.note,
            user_email=current_user.email
        ))
    
    return response_logs 