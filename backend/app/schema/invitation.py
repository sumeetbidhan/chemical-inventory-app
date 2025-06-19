from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
from app.models.invitation import InvitationStatus

class InvitationCreate(BaseModel):
    email: EmailStr
    role: UserRole

class InvitationResponse(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    status: InvitationStatus
    invited_at: datetime
    accepted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InvitationListResponse(BaseModel):
    invitations: list[InvitationResponse]
    total: int 