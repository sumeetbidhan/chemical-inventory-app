from sqlalchemy import Column, String, Integer, DateTime, Enum, Boolean
from sqlalchemy.sql import func
from app.database import Base
from app.models.user import UserRole
import enum

class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    role = Column(Enum(UserRole))
    status = Column(Enum(InvitationStatus), default=InvitationStatus.PENDING)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True) 