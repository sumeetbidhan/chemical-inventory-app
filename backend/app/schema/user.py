from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    role_id: int

class UserCreate(UserBase):
    uid: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role_id: Optional[int] = None
    is_approved: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    uid: str
    is_approved: bool
    created_at: datetime
    last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserWithRoleResponse(UserBase):
    id: int
    uid: str
    is_approved: bool
    created_at: datetime
    last_seen: Optional[datetime] = None
    role_name: str

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
    role_name: str
    permissions: list[str]
