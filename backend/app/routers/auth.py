from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import get_user_by_uid, create_user, get_user_by_email, get_admin_user
from app.crud.invitation import get_invitation_by_email, accept_invitation
from app.crud.activity_log import create_activity_log
from app.schema.user import UserLogin, UserLoginResponse, UserCreate
from app.firebase_auth import verify_firebase_token, get_current_user
from app.models.user import UserRole
from typing import Optional

router = APIRouter()

@router.post("/login", response_model=UserLoginResponse)
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Login with Firebase token"""
    try:
        # Verify Firebase token
        token = verify_firebase_token(login_data.firebase_token)
        uid = token["uid"]
        email = token["email"]
        
        # Check if user exists
        user = get_user_by_uid(db, uid)
        
        if not user:
            # Check if user was invited
            invitation = get_invitation_by_email(db, email)
            if invitation and invitation.status.value == "pending":
                # Create user from invitation
                user_data = UserCreate(
                    uid=uid,
                    email=email,
                    role=invitation.role
                )
                user = create_user(db, user_data)
                accept_invitation(db, invitation.id)
                
                # Log activity
                create_activity_log(
                    db, user.id, "user_created", 
                    f"User created from invitation: {email}"
                )
            else:
                # Create user with default role (needs approval)
                user_data = UserCreate(
                    uid=uid,
                    email=email,
                    role=UserRole.LAB_STAFF
                )
                user = create_user(db, user_data)
                user.is_approved = False  # Needs admin approval
                db.commit()
                
                # Log activity
                create_activity_log(
                    db, user.id, "user_registered", 
                    f"New user registration: {email}"
                )
        
        # Check if user is approved
        if not user.is_approved:
            raise HTTPException(
                status_code=403, 
                detail="Account pending approval. Please contact administrator."
            )
        
        # Log login activity
        create_activity_log(
            db, user.id, "login", 
            f"User logged in: {email}"
        )
        
        return UserLoginResponse(
            user=user,
            access_token=login_data.firebase_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.post("/otp")
async def otp_login(
    phone_number: str,
    otp_code: str,
    db: Session = Depends(get_db)
):
    """OTP-based login (Firebase phone authentication)"""
    # This would integrate with Firebase phone authentication
    # For now, return a placeholder response
    return {"message": "OTP login endpoint - implement Firebase phone auth"}

@router.get("/me")
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """Get current user information"""
    return current_user

@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Prevent multiple admins
    if user.role == UserRole.ADMIN:
        if get_admin_user(db):
            raise HTTPException(status_code=400, detail="Admin already exists")
    # Prevent duplicate emails
    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="User already exists")
    # Create user as pending approval (except admin, who is auto-approved)
    db_user = create_user(db, user)
    db_user.is_approved = user.role == UserRole.ADMIN
    db.commit()
    return {"message": "User registered", "is_approved": db_user.is_approved}
