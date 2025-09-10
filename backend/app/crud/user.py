from sqlalchemy.orm import Session, joinedload
from app.models.user import User
from app.models.role import Role
from app.schema.user import UserCreate, UserUpdate
from typing import Optional, List
from datetime import datetime, timedelta
import pytz
import logging

# Set up logging
logger = logging.getLogger(__name__)

def get_user_by_uid(db: Session, uid: str) -> Optional[User]:
    return db.query(User).filter(User.uid == uid).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()



def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user: UserCreate) -> User:
    logger.info(f"[{datetime.now().isoformat()}] Creating new user: {user.email} with role_id {user.role_id}")
    
    db_user = User(
        uid=user.uid,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_id=user.role_id,
        is_approved=False  # Always create as pending, admin must approve
    )
    db.add(db_user)
    # Don't commit here - let the calling function handle the commit
    # db.commit()
    # db.refresh(db_user)
    
    logger.info(f"[{datetime.now().isoformat()}] User created successfully: {user.email} (ID: {db_user.id})")
    return db_user

def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
    logger.info(f"[{datetime.now().isoformat()}] Updating user ID: {user_id}")
    
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        logger.warning(f"[{datetime.now().isoformat()}] User ID {user_id} not found for update")
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    logger.info(f"[{datetime.now().isoformat()}] Updating user {db_user.email} with fields: {list(update_data.keys())}")
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    
    logger.info(f"[{datetime.now().isoformat()}] User {db_user.email} updated successfully")
    return db_user

def update_user_last_seen(db: Session, user_id: int) -> Optional[User]:
    """Update user's last seen timestamp"""
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        logger.warning(f"[{datetime.now().isoformat()}] User ID {user_id} not found for last_seen update")
        return None
    
    old_last_seen = db_user.last_seen
    db_user.last_seen = datetime.now(pytz.UTC)
    db.commit()
    db.refresh(db_user)
    
    logger.info(f"[{datetime.now().isoformat()}] Last seen updated for user {db_user.email} ({db_user.uid})")
    return db_user

def get_online_users(db: Session, minutes_threshold: int = 5) -> List[User]:
    """Get users who were active in the last N minutes"""
    threshold_time = datetime.now(pytz.UTC) - timedelta(minutes=minutes_threshold)
    online_users = db.query(User).filter(
        User.last_seen >= threshold_time,
        User.is_approved == True
    ).all()
    
    logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(online_users)} online users (threshold: {minutes_threshold} minutes)")
    return online_users

def delete_user(db: Session, user_id: int) -> bool:
    logger.info(f"[{datetime.now().isoformat()}] Attempting to delete user ID: {user_id}")
    
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        logger.warning(f"[{datetime.now().isoformat()}] User ID {user_id} not found for deletion")
        return False
    
    user_email = db_user.email
    user_uid = db_user.uid
    
    db.delete(db_user)
    db.commit()
    
    logger.info(f"[{datetime.now().isoformat()}] User {user_email} ({user_uid}) deleted successfully")
    return True

def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    users = db.query(User).options(joinedload(User.role)).offset(skip).limit(limit).all()
    logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(users)} users (skip: {skip}, limit: {limit})")
    return users

def get_pending_users(db: Session) -> List[User]:
    pending_users = db.query(User).filter(User.is_approved == False).all()
    logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(pending_users)} pending users")
    return pending_users

def get_users_by_role(db: Session, role_name: str) -> List[User]:
    users = db.query(User).options(joinedload(User.role)).join(Role).filter(Role.name.ilike(role_name)).all()
    logger.info(f"[{datetime.now().isoformat()}] Retrieved {len(users)} users with role {role_name}")
    return users

def get_admin_user(db: Session) -> Optional[User]:
    admin_user = db.query(User).join(Role).filter(Role.name.ilike("admin")).first()
    if admin_user:
        logger.info(f"[{datetime.now().isoformat()}] Admin user found: {admin_user.email}")
    else:
        logger.info(f"[{datetime.now().isoformat()}] No admin user found")
    return admin_user

def set_user_online(db: Session, user_id: int) -> Optional[User]:
    """Set user as online and log the event"""
    logger.info(f"[{datetime.now().isoformat()}] Setting user ID {user_id} as online")
    
    user = get_user_by_id(db, user_id)
    if not user:
        logger.warning(f"[{datetime.now().isoformat()}] User ID {user_id} not found for online status update")
        return None
    
    old_status = user.is_online
    user.is_online = True
    user.last_seen = datetime.now(pytz.UTC)
    db.commit()
    db.refresh(user)
    
    # Log activity
    from app.crud.activity_log import create_activity_log
    create_activity_log(
        db=db,
        user_id=user.id,
        action="user_online",
        description=f"User {user.email} went online",
        note=f"User {user.email} ({user.role}) is now online at {datetime.now().isoformat()}"
    )
    
    logger.info(f"[{datetime.now().isoformat()}] User {user.email} ({user.uid}) is now ONLINE (was: {old_status})")
    return user

def set_user_offline(db: Session, user_id: int) -> Optional[User]:
    """Set user as offline and log the event"""
    logger.info(f"[{datetime.now().isoformat()}] Setting user ID {user_id} as offline")
    
    user = get_user_by_id(db, user_id)
    if not user:
        logger.warning(f"[{datetime.now().isoformat()}] User ID {user_id} not found for offline status update")
        return None
    
    old_status = user.is_online
    user.is_online = False
    db.commit()
    db.refresh(user)
    
    # Log activity
    from app.crud.activity_log import create_activity_log
    create_activity_log(
        db=db,
        user_id=user.id,
        action="user_offline",
        description=f"User {user.email} went offline",
        note=f"User {user.email} ({user.role}) is now offline at {datetime.now().isoformat()}"
    )
    
    logger.info(f"[{datetime.now().isoformat()}] User {user.email} ({user.uid}) is now OFFLINE (was: {old_status})")
    return user
        