import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends, Request
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from app.database import get_db
from app.crud.user import get_user_by_uid
from app.models.user import UserRole

load_dotenv()

# Initialize Firebase App only once
if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        print("Warning: Firebase credentials not found. Firebase authentication will not work.")
        # Initialize with default app for development
        try:
            firebase_admin.initialize_app()
        except ValueError:
            pass  # App already initialized

def verify_firebase_token(request: Request):
    """Verify Firebase ID token and return decoded token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    try:
        token = auth_header.split(" ")[1]  # "Bearer <token>"
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token invalid: {str(e)}")

def get_current_user(
    token: dict = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    """Get current user from database"""
    user = get_user_by_uid(db, token["uid"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="User not approved")
    
    return user

def get_admin_user(
    current_user = Depends(get_current_user)
):
    """Dependency to ensure user is admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def get_approved_user(
    current_user = Depends(get_current_user)
):
    """Dependency to ensure user is approved"""
    if not current_user.is_approved:
        raise HTTPException(status_code=403, detail="User not approved")
    return current_user
