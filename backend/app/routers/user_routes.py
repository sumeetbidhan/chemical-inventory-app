from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import get_user_by_id, get_user_by_uid, update_user_last_seen, set_user_online, set_user_offline, create_user
from app.models.user import User
from app.crud.activity_log import get_user_activity_logs, create_activity_log
from app.schema.user import DashboardResponse, UserResponse
from app.schema.activity_log import ActivityLogResponse
from app.firebase_auth import get_approved_user, get_firebase_token

from typing import List
import logging
from datetime import datetime

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user = Depends(get_approved_user)
):
    """Get current user information (approved users only)"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} ({current_user.email}) requested current user info")
    return current_user

@router.post("/ping")
async def update_last_seen(
    current_user = Depends(get_approved_user),
    db: Session = Depends(get_db)
):
    """Update user's last seen timestamp (heartbeat)"""
    logger.info(f"[{datetime.now().isoformat()}] Heartbeat from user {current_user.uid} ({current_user.email})")
    
    updated_user = update_user_last_seen(db, current_user.id)
    if not updated_user:
        logger.warning(f"[{datetime.now().isoformat()}] User {current_user.uid} not found for heartbeat update")
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"[{datetime.now().isoformat()}] Heartbeat updated successfully for user {current_user.uid} ({current_user.email})")
    return {"message": "Last seen updated", "last_seen": updated_user.last_seen}

@router.options("/status")
async def options_user_status():
    """Handle CORS preflight for user status endpoint"""
    from fastapi.responses import Response
    response = Response()
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@router.get("/status")
async def get_user_status(
    token: dict = Depends(get_firebase_token),
    db: Session = Depends(get_db)
):
    """Get user status (works for both approved and pending users)"""
    print(f"User status check for: {token.get('email', 'Unknown')} (UID: {token['uid']})")
    
    try:
        logger.info(f"[{datetime.now().isoformat()}] Status check for user {token['uid']}")
        
        # Check if there's a user with this email but different UID
        user_by_email = db.query(User).filter(User.email == token.get('email')).first() if token.get('email') else None
        if user_by_email:
            if user_by_email.uid != token['uid']:
                print(f"⚠️  UID MISMATCH detected! Auto-fixing...")
                print(f"   Database UID: {user_by_email.uid}")
                print(f"   Firebase UID: {token['uid']}")
                
                # AUTO-FIX: Update the database UID to match Firebase UID
                old_uid = user_by_email.uid
                user_by_email.uid = token['uid']
                db.commit()
                
                # Log this fix
                create_activity_log(
                    db, user_by_email.id, "uid_auto_fixed", 
                    f"UID updated to match Firebase: {token['uid']}",
                    note=f"Previous UID: {old_uid}, New UID: {token['uid']}"
                )
                
                print(f"✅ UID fixed! User should now work correctly.")
                user = user_by_email  # Use the fixed user
            else:
                user = user_by_email  # UID matches, use this user
        else:
            user = get_user_by_uid(db, token["uid"])  # Fallback to UID lookup
        
        if not user:
            logger.info(f"[{datetime.now().isoformat()}] User {token['uid']} not found, creating new user automatically")
            
            # Import necessary modules for user creation
            from app.crud.user import create_user
            from app.schema.user import UserCreate
            from app.models.role import Role
            
            # Get the 'all_users' role for new registrations
            all_users_role = db.query(Role).filter(Role.name.ilike("all_users")).first()
            if not all_users_role:
                logger.error(f"[{datetime.now().isoformat()}] Default role 'all_users' not found")
                raise HTTPException(status_code=500, detail="Default role not found")
            
            # Create new user with default role (needs approval)
            user_data = UserCreate(
                uid=token["uid"],
                email=token["email"],
                first_name="",  # Will be updated later
                last_name="",
                role_id=all_users_role.id
            )
            
            try:
                user = create_user(db, user_data)
                user.is_approved = False  # New users need admin approval
                db.commit()
                
                # Log activity
                create_activity_log(
                    db, user.id, "user_auto_created", 
                    f"User auto-created from status check: {token['email']}",
                    note=f"User auto-created with role: all_users, requires approval"
                )
                
                logger.info(f"[{datetime.now().isoformat()}] New user auto-created: {token['email']} (pending approval)")
                
            except Exception as create_error:
                logger.error(f"[{datetime.now().isoformat()}] Failed to auto-create user: {str(create_error)}")
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to create user")
        
        logger.info(f"[{datetime.now().isoformat()}] Status returned for user {token['uid']} ({user.email}) - Approved: {user.is_approved}, Role: {user.role.name if user.role else 'Unknown'}")
        
        # Create response with explicit CORS headers
        from fastapi.responses import JSONResponse
        response_data = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.name if user.role else "unknown",
            "role_id": user.role_id,
            "is_approved": user.is_approved,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_seen": user.last_seen.isoformat() if user.last_seen else None
        }
        
        response = JSONResponse(content=response_data)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        
        return response
        
    except Exception as e:
        print(f"DEBUG: Error in get_user_status: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

@router.get("/dashboard", response_model=DashboardResponse)
async def get_user_dashboard(
    current_user = Depends(get_approved_user)
):
    """Get user-specific dashboard data"""
    logger.info(f"[{datetime.now().isoformat()}] Dashboard request from user {current_user.uid} ({current_user.email}) with role {current_user.role}")
    
    # Define permissions based on role
    permissions = []
    
    role_name = current_user.role.name if current_user.role else "unknown"
    
    if role_name.lower() == "admin":
        permissions = [
            "manage_users", "manage_invitations", "view_logs", 
            "approve_users", "delete_users", "modify_users","view_inventory", "add_chemicals", "update_chemicals",
            "view_reports", "manage_safety_data","manage_accounts","view_financial_data"
        ]
    elif role_name.lower() == "lab" or role_name.lower() == "lab_staff":
        permissions = [
            "view_inventory", "add_chemicals", "update_chemicals",
            "view_reports", "manage_safety_data"
        ]
    elif role_name.lower() == "product":
        permissions = [
            "view_inventory", "view_reports", "export_data",
            "manage_product_info"
        ]
    elif role_name.lower() == "accounts" or role_name.lower() == "account":
        permissions = [
            "view_inventory", "view_reports", "manage_accounts",
            "view_financial_data"
        ]
    elif role_name.lower() == "all_users":
        permissions = [
            "view_inventory", "view_reports", "basic_access"
        ]
    
    logger.info(f"[{datetime.now().isoformat()}] Dashboard returned for user {current_user.uid} ({current_user.email}) with {len(permissions)} permissions")
    return DashboardResponse(
        user=current_user,
        role_name=role_name,
        permissions=permissions
    )

@router.get("/activity", response_model=List[ActivityLogResponse])
async def get_user_activity(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_approved_user)
):
    """Get current user's activity logs"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} ({current_user.email}) requested activity logs (limit: {limit})")
    
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
    
    logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(response_logs)} activity logs for user {current_user.uid} ({current_user.email})")
    return response_logs

@router.post("/online")
async def set_online(
    current_user = Depends(get_approved_user),
    db: Session = Depends(get_db)
):
    """Set user as online and log the event"""
    try:
        logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} ({current_user.email}) setting status to ONLINE")
        
        user = set_user_online(db, current_user.id)
        if not user:
            logger.warning(f"[{datetime.now().isoformat()}] User {current_user.uid} not found for online status update")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Log the online status change
        create_activity_log(
            db=db,
            user_id=current_user.id,
            action="user_online",
            description=f"User {current_user.email} went online",
            note=f"User {current_user.email} ({current_user.role}) is now online"
        )
        
        logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} ({current_user.email}) is now ONLINE")
        return {"message": "User set as online", "is_online": user.is_online}
    except HTTPException as e:
        # Re-raise HTTP exceptions as-is
        raise e
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Error setting user online: {str(e)}")
        # Return a more graceful error response
        return {"message": "Failed to set user online", "error": str(e), "is_online": False}

@router.post("/offline")
async def set_offline(
    current_user = Depends(get_approved_user),
    db: Session = Depends(get_db)
):
    """Set user as offline and log the event"""
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} ({current_user.email}) setting status to OFFLINE")
    
    user = set_user_offline(db, current_user.id)
    if not user:
        logger.warning(f"[{datetime.now().isoformat()}] User {current_user.uid} not found for offline status update")
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log the offline status change
    create_activity_log(
        db=db,
        user_id=current_user.id,
        action="user_offline",
        description=f"User {current_user.email} went offline",
        note=f"User {current_user.email} ({current_user.role}) is now offline"
    )
    
    logger.info(f"[{datetime.now().isoformat()}] User {current_user.uid} ({current_user.email}) is now OFFLINE")
    return {"message": "User set as offline", "is_online": user.is_online} 