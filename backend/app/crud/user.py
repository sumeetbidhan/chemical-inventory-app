from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.schema.user import UserCreate, UserUpdate
from typing import Optional, List

def get_user_by_uid(db: Session, uid: str) -> Optional[User]:
    return db.query(User).filter(User.uid == uid).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_phone(db: Session, phone: str) -> Optional[User]:
    return db.query(User).filter(User.phone == phone).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user: UserCreate) -> User:
    db_user = User(
        uid=user.uid,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        role=user.role,
        is_approved=False  # Always create as pending, admin must approve
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
    
    db.delete(db_user)
    db.commit()
    return True

def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()

def get_pending_users(db: Session) -> List[User]:
    return db.query(User).filter(User.is_approved == False).all()

def get_users_by_role(db: Session, role: UserRole) -> List[User]:
    return db.query(User).filter(User.role == role).all()                                                                                                                                                                                                     

def get_admin_user(db: Session) -> Optional[User]:
    return db.query(User).filter(User.role == UserRole.ADMIN).first()
