from sqlalchemy.orm import Session
from app.models.role import Role
from app.schema.role import RoleCreate, RoleUpdate
from typing import List, Optional

def create_role(db: Session, role: RoleCreate) -> Role:
    db_role = Role(
        name=role.name,
        description=role.description
    )
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

def get_roles(db: Session, skip: int = 0, limit: int = 100) -> List[Role]:
    return db.query(Role).offset(skip).limit(limit).all()

def get_role(db: Session, role_id: int) -> Optional[Role]:
    return db.query(Role).filter(Role.id == role_id).first()

def get_role_by_name(db: Session, name: str) -> Optional[Role]:
    return db.query(Role).filter(Role.name.ilike(name)).first()

def update_role(db: Session, role_id: int, role_update: RoleUpdate) -> Optional[Role]:
    db_role = get_role(db, role_id)
    if db_role:
        update_data = role_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_role, field, value)
        db.commit()
        db.refresh(db_role)
    return db_role

def delete_role(db: Session, role_id: int) -> bool:
    db_role = get_role(db, role_id)
    if not db_role:
        return False
    db.delete(db_role)
    db.commit()
    return True 