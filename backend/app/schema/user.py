from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    role: UserRole
    phone: Optional[str] = None

class UserCreate(UserBase):
    uid: str
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    is_approved: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    uid: Optional[str]
    is_approved: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    firebase_token: str

class UserLoginResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

class DashboardResponse(BaseModel):
    user: UserResponse
    role: UserRole
    permissions: list[str]
