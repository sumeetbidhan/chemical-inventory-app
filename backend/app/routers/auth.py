from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import get_user_by_uid, create_user, get_user_by_email, get_admin_user
from app.crud.activity_log import create_activity_log
from app.schema.user import UserLogin, UserLoginResponse, UserCreate
from app.firebase_auth import verify_firebase_token, get_current_user, get_firebase_token

from app.services.otp_service import OTPService
from typing import Optional
from pydantic import BaseModel
import logging
from datetime import datetime

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

class OTPLoginRequest(BaseModel):
    phone_number: str
    otp_code: str

class SendOTPRequest(BaseModel):
    phone_number: str

@router.post("/login", response_model=UserLoginResponse)
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Login with Firebase token"""
    logger.info(f"[{datetime.now().isoformat()}] Login attempt with Firebase token")
    
    try:
        # Verify Firebase token
        token = verify_firebase_token(login_data.firebase_token)
        uid = token["uid"]
        email = token["email"]
        
        logger.info(f"[{datetime.now().isoformat()}] Firebase token verified for user {uid} ({email})")
        
        # Check if user exists
        user = get_user_by_uid(db, uid)
        
        if not user:
            # Check if user was invited
            invitation = get_invitation_by_email(db, email)
            if invitation and invitation.status.value == "pending":
                logger.info(f"[{datetime.now().isoformat()}] Creating user from invitation for {email}")
                
                # Create user from invitation
                user_data = UserCreate(
                    uid=uid,
                    email=email,
                    first_name="",  # Will be updated later
                    last_name=None,
                    role=invitation.role
                )
                user = create_user(db, user_data)
                accept_invitation(db, invitation.id)
                
                # Log activity
                create_activity_log(
                    db, user.id, "user_created", 
                    f"User created from invitation: {email}",
                    note=f"User created from invitation with role: {invitation.role}"
                )
                
                logger.info(f"[{datetime.now().isoformat()}] User created from invitation: {email} with role {invitation.role}")
            else:
                logger.info(f"[{datetime.now().isoformat()}] Creating new user registration for {email}")
                
                # Get the 'all_users' role ID
                from app.models.role import Role
                all_users_role = db.query(Role).filter(Role.name.ilike("all_users")).first()
                if not all_users_role:
                    raise HTTPException(status_code=500, detail="Default role not found")
                
                # Create user with default role (needs approval)
                user_data = UserCreate(
                    uid=uid,
                    email=email,
                    first_name="",  # Will be updated later
                    last_name="",
                    role_id=all_users_role.id
                )
                user = create_user(db, user_data)
                user.is_approved = False  # Needs admin approval
                db.commit()
                
                # Log activity
                create_activity_log(
                    db, user.id, "user_registered", 
                    f"New user registration: {email}",
                    note=f"New user registration with role: all_users, requires approval"
                )
                
                logger.info(f"[{datetime.now().isoformat()}] New user registered: {email} (pending approval)")
        
        # Check if user is approved
        if not user.is_approved:
            logger.warning(f"[{datetime.now().isoformat()}] Login denied for {email} - account pending approval")
            raise HTTPException(
                status_code=403, 
                detail="Account pending approval. Please contact administrator."
            )
        
        # Log successful login activity
        create_activity_log(
            db, user.id, "login", 
            f"User logged in: {email}",
            note=f"Successful login for user {email} ({user.role}) at {datetime.now().isoformat()}"
        )
        
        logger.info(f"[{datetime.now().isoformat()}] Successful login for user {uid} ({email}) with role {user.role}")
        
        return UserLoginResponse(
            user=user,
            access_token=login_data.firebase_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Login failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.post("/send-otp")
async def send_otp(
    request: SendOTPRequest,
    db: Session = Depends(get_db)
):
    """Send OTP to phone number"""
    logger.info(f"[{datetime.now().isoformat()}] OTP request for phone number: {request.phone_number}")
    
    try:
        result = OTPService.send_otp(request.phone_number, db)
        
        if not result["success"]:
            logger.warning(f"[{datetime.now().isoformat()}] OTP send failed for {request.phone_number}: {result['message']}")
            raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info(f"[{datetime.now().isoformat()}] OTP sent successfully to {request.phone_number}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] Failed to send OTP to {request.phone_number}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")

@router.post("/otp")
async def otp_login(
    otp_data: OTPLoginRequest,
    db: Session = Depends(get_db)
):
    """OTP-based login using phone number"""
    logger.info(f"[{datetime.now().isoformat()}] OTP login attempt for phone number: {otp_data.phone_number}")
    
    try:
        result = OTPService.verify_otp(otp_data.phone_number, otp_data.otp_code, db)
        
        if not result["success"]:
            logger.warning(f"[{datetime.now().isoformat()}] OTP login failed for {otp_data.phone_number}: {result['message']}")
            raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info(f"[{datetime.now().isoformat()}] OTP login successful for {otp_data.phone_number}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{datetime.now().isoformat()}] OTP login failed for {otp_data.phone_number}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OTP login failed: {str(e)}")

@router.get("/me")
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """Get current user information"""
    logger.info(f"[{datetime.now().isoformat()}] Current user info requested for {current_user.uid} ({current_user.email})")
    return current_user

@router.post("/register")
def register_user(
    user: UserCreate, 
    token: dict = Depends(get_firebase_token),
    db: Session = Depends(get_db)
):
    """Register a new user"""
    logger.info(f"[{datetime.now().isoformat()}] User registration attempt for {user.email}")
    
    # Verify that the Firebase token UID matches the user being registered
    if token["uid"] != user.uid:
        logger.warning(f"[{datetime.now().isoformat()}] Registration failed for {user.email}: UID mismatch")
        raise HTTPException(status_code=400, detail="UID mismatch")
    
    # Validate first name is not empty
    if not user.first_name or not user.first_name.strip():
        logger.warning(f"[{datetime.now().isoformat()}] Registration failed for {user.email}: First name is required")
        raise HTTPException(status_code=400, detail="First name is required")
    
    # Get the 'all_users' role ID for new registrations
    from app.models.role import Role
    all_users_role = db.query(Role).filter(Role.name.ilike("all_users")).first()
    if not all_users_role:
        raise HTTPException(status_code=500, detail="Default role not found")
    
    # Prevent duplicate emails
    if get_user_by_email(db, user.email):
        logger.warning(f"[{datetime.now().isoformat()}] Registration failed for {user.email}: User already exists")
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Use the role_id sent by frontend (should be 5 for ALL_USERS)
    # Validate that the role_id is valid
    if user.role_id != all_users_role.id:
        logger.warning(f"[{datetime.now().isoformat()}] Registration failed for {user.email}: Invalid role_id {user.role_id}")
        raise HTTPException(status_code=400, detail="Invalid role for new registration")
    
    # Create user as pending approval
    db_user = create_user(db, user)
    logger.info(f"[{datetime.now().isoformat()}] New user registered: {user.email} (pending approval)")
    
    # Commit the user creation first
    db.commit()
    db.refresh(db_user)
    
    # Note: Activity logging removed to prevent database constraint violations
    # Activity logs will be created when users perform actions after approval
    
    logger.info(f"[{datetime.now().isoformat()}] User registration successful: {user.email} ({user.first_name} {user.last_name or ''})")
    
    return {
        "message": "User registered successfully", 
        "is_approved": db_user.is_approved,
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "first_name": db_user.first_name,
            "last_name": db_user.last_name,
            "role_id": db_user.role_id,
            "is_approved": db_user.is_approved
        }
    }
