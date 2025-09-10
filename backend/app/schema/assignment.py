"""
Pydantic schemas for Product Assignment System
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# Base schemas
class ProductAssignmentBase(BaseModel):
    product_id: int = Field(..., description="ID of the chemical product")
    assigned_to_user_id: int = Field(..., description="ID of the user assigned to")
    team_type: str = Field(..., description="Team type: LAB_STAFF or PRODUCT_TEAM")
    quantity_requested: float = Field(..., description="Quantity requested")
    unit: str = Field(..., description="Unit of measurement")
    time_allotted_minutes: int = Field(..., description="Time limit in minutes")


class ExtensionRequestBase(BaseModel):
    assignment_id: int = Field(..., description="ID of the assignment")
    reason: str = Field(..., description="Reason for extension request")
    requested_extension_minutes: int = Field(..., description="Minutes of extension requested")


class FormulationProgressBase(BaseModel):
    assignment_id: int = Field(..., description="ID of the assignment")
    component_chemical_id: int = Field(..., description="ID of the chemical component")
    quantity_required: float = Field(..., description="Quantity required")
    unit: str = Field(..., description="Unit of measurement")
    status: str = Field(..., description="Status: PENDING, IN_PROGRESS, COMPLETED")
    notes: Optional[str] = Field(None, description="Optional notes")


# Create schemas
class ProductAssignmentCreate(ProductAssignmentBase):
    pass


class ExtensionRequestCreate(ExtensionRequestBase):
    pass


class FormulationProgressCreate(FormulationProgressBase):
    pass


class FormulationProgressUpdate(BaseModel):
    status: str = Field(..., description="New status")
    notes: Optional[str] = Field(None, description="Optional notes")


# Response schemas
class FormulationProgressResponse(FormulationProgressBase):
    id: int
    completed_at: Optional[datetime] = None
    completed_by: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExtensionRequestResponse(ExtensionRequestBase):
    id: int
    requested_by: int
    current_expiry: datetime
    status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProductAssignmentResponse(ProductAssignmentBase):
    id: int
    assigned_by_admin_id: int
    status: str
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    otp_token: Optional[str] = None
    otp_expires_at: Optional[datetime] = None
    progress_percentage: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Detailed response schemas
class ProductAssignmentDetail(ProductAssignmentResponse):
    progress: List[FormulationProgressResponse]
    extension_requests: List[ExtensionRequestResponse]
    is_expired: bool
    time_remaining: int
    
    class Config:
        from_attributes = True


# Admin assignment creation
class AdminAssignmentCreate(BaseModel):
    product_id: int = Field(..., description="ID of the chemical product")
    assigned_to_user_id: int = Field(..., description="ID of the user to assign to")
    quantity_requested: float = Field(..., description="Quantity requested")
    unit: str = Field(..., description="Unit of measurement")
    time_allotted_minutes: int = Field(..., description="Time limit in minutes")


# Team member actions
class StartFormulationRequest(BaseModel):
    assignment_id: int = Field(..., description="ID of the assignment to start")
    otp_code: Optional[str] = Field(None, description="OTP code for verification")


class UpdateProgressRequest(BaseModel):
    assignment_id: int = Field(..., description="ID of the assignment")
    component_chemical_id: int = Field(..., description="ID of the chemical component")
    status: str = Field(..., description="New status")
    notes: Optional[str] = Field(None, description="Optional notes")


class RequestExtensionRequest(BaseModel):
    assignment_id: int = Field(..., description="ID of the assignment")
    reason: str = Field(..., description="Reason for extension request")
    requested_extension_minutes: int = Field(..., description="Minutes of extension requested")


# Admin extension management
class ApproveExtensionRequest(BaseModel):
    extension_request_id: int = Field(..., description="ID of the extension request")
    new_minutes: int = Field(..., description="Additional minutes to grant")


class RejectExtensionRequest(BaseModel):
    extension_request_id: int = Field(..., description="ID of the extension request")
    reason: str = Field(..., description="Reason for rejection")


# Summary schemas
class AssignmentSummary(BaseModel):
    id: int
    product_name: str
    assigned_to_name: str
    team_type: str
    quantity_requested: float
    unit: str
    status: str
    progress_percentage: int
    time_remaining: int
    is_expired: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExtensionRequestSummary(BaseModel):
    id: int
    assignment_id: int
    product_name: str
    requested_by_name: str
    reason: str
    requested_extension_minutes: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class VerifyExtensionOTPRequest(BaseModel):
    extension_request_id: int = Field(..., description="ID of the extension request")
    otp_code: str = Field(..., description="OTP code for verification")

