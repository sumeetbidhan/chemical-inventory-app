import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends, Request, WebSocket
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from app.database import get_db
from app.crud.user import get_user_by_uid


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
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            print(f"DEBUG: No Authorization header found. Headers: {dict(request.headers)}")
            raise HTTPException(status_code=401, detail="Authorization header missing")

        if not auth_header.startswith("Bearer "):
            print(f"DEBUG: Invalid Authorization header format: {auth_header}")
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
            
        token = auth_header.split(" ")[1]  # "Bearer <token>"
        print(f"DEBUG: Attempting to verify Firebase token: {token[:20]}...")
        
        # Check if Firebase is properly initialized
        if not firebase_admin._apps:
            print("DEBUG: Firebase not initialized, attempting to initialize...")
            try:
                firebase_admin.initialize_app()
            except ValueError:
                pass  # App already initialized
        
        decoded_token = auth.verify_id_token(token)
        print(f"DEBUG: Token verified successfully for UID: {decoded_token.get('uid')}")
        return decoded_token
    except Exception as e:
        print(f"DEBUG: Token verification failed: {str(e)}")
        print(f"DEBUG: Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Token invalid: {str(e)}")

def get_firebase_token(request: Request):
    """Dependency to get verified Firebase token"""
    return verify_firebase_token(request)

def get_current_user(
    token: dict = Depends(get_firebase_token),
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
    from app.models.role import Role
    admin_role = current_user.role
    if not admin_role or admin_role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def get_approved_user(
    current_user = Depends(get_current_user)
):
    """Dependency to ensure user is approved"""
    if not current_user.is_approved:
        raise HTTPException(status_code=403, detail="User not approved")
    return current_user


# WebSocket Authentication Functions
async def get_current_user_ws(websocket: WebSocket):
    """Get current user from WebSocket connection"""
    try:
        # Get token from query parameters or headers
        token = None
        
        # Try to get token from query parameters first
        if websocket.query_params.get("token"):
            token = websocket.query_params.get("token")
        # Try to get token from headers
        elif websocket.headers.get("authorization"):
            auth_header = websocket.headers.get("authorization")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return None
        
        # Verify Firebase token
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get('uid')
        
        if not uid:
            return None
        
        # Get user from database
        db = next(get_db())
        user = get_user_by_uid(db, uid)
        
        if not user or not user.is_approved:
            return None
        
        return user
        
    except Exception as e:
        print(f"WebSocket authentication error: {e}")
        return None
