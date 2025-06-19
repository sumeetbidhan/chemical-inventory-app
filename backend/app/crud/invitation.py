from sqlalchemy.orm import Session
from app.models.invitation import Invitation, InvitationStatus
from app.schema.invitation import InvitationCreate
from typing import Optional, List
from datetime import datetime

def create_invitation(db: Session, invitation: InvitationCreate) -> Invitation:
    db_invitation = Invitation(
        email=invitation.email,
        role=invitation.role,
        status=InvitationStatus.PENDING
    )
    db.add(db_invitation)
    db.commit()
    db.refresh(db_invitation)
    return db_invitation

def get_invitation_by_email(db: Session, email: str) -> Optional[Invitation]:
    return db.query(Invitation).filter(Invitation.email == email).first()

def get_invitation_by_id(db: Session, invitation_id: int) -> Optional[Invitation]:
    return db.query(Invitation).filter(Invitation.id == invitation_id).first()

def get_pending_invitations(db: Session) -> List[Invitation]:
    return db.query(Invitation).filter(Invitation.status == InvitationStatus.PENDING).all()

def accept_invitation(db: Session, invitation_id: int) -> Optional[Invitation]:
    db_invitation = get_invitation_by_id(db, invitation_id)
    if not db_invitation:
        return None
    
    db_invitation.status = InvitationStatus.ACCEPTED
    db_invitation.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(db_invitation)
    return db_invitation

def expire_invitation(db: Session, invitation_id: int) -> Optional[Invitation]:
    db_invitation = get_invitation_by_id(db, invitation_id)
    if not db_invitation:
        return None
    
    db_invitation.status = InvitationStatus.EXPIRED
    db.commit()
    db.refresh(db_invitation)
    return db_invitation

def get_all_invitations(db: Session, skip: int = 0, limit: int = 100) -> List[Invitation]:
    return db.query(Invitation).offset(skip).limit(limit).all()

def delete_invitation(db: Session, invitation_id: int) -> bool:
    db_invitation = get_invitation_by_id(db, invitation_id)
    if not db_invitation:
        return False
    
    db.delete(db_invitation)
    db.commit()
    return True 