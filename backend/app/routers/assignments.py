"""
Assignment Router for Chemical Inventory System
Handles product assignments, team management, and progress tracking
"""

from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..firebase_auth import get_current_user, get_admin_user
from ..models.user import User
from ..services.assignment_service import AssignmentService
from ..schema.assignment import (
    AdminAssignmentCreate,
    ProductAssignmentResponse,
    ProductAssignmentDetail,
    AssignmentSummary,
    ExtensionRequestResponse,
    ExtensionRequestSummary,
    StartFormulationRequest,
    UpdateProgressRequest,
    RequestExtensionRequest,
    ApproveExtensionRequest,
    RejectExtensionRequest,
    VerifyExtensionOTPRequest
)

router = APIRouter(prefix="/assignments", tags=["assignments"])


# Admin-only endpoints
@router.post("/create", response_model=ProductAssignmentResponse)
def create_assignment(
    assignment_data: AdminAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Admin creates a new product assignment"""
    try:
        assignment_service = AssignmentService(db)
        assignment = assignment_service.create_assignment(
            product_id=assignment_data.product_id,
            user_id=assignment_data.assigned_to_user_id,
            admin_id=current_user.id,
            quantity=assignment_data.quantity_requested,
            unit=assignment_data.unit,
            time_allotted_minutes=assignment_data.time_allotted_minutes
        )
        return assignment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create assignment: {str(e)}")


@router.get("/all", response_model=List[AssignmentSummary])
def get_all_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Admin gets all assignments in the system"""
    try:
        assignment_service = AssignmentService(db)
        assignments = assignment_service.get_all_assignments()
        
        # Convert to summary format with additional info
        summaries = []
        for assignment in assignments:
            summary = AssignmentSummary(
                id=assignment.id,
                product_name=assignment.product.name,
                assigned_to_name=f"{assignment.assigned_to_user.first_name} {assignment.assigned_to_user.last_name or ''}",
                team_type=assignment.team_type,
                quantity_requested=assignment.quantity_requested,
                unit=assignment.unit,
                status=assignment.status,
                progress_percentage=assignment.progress_percentage,
                time_remaining=assignment.time_remaining_minutes,
                is_expired=assignment.is_expired,
                created_at=assignment.created_at
            )
            summaries.append(summary)
        
        return summaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch assignments: {str(e)}")


@router.get("/admin", response_model=List[AssignmentSummary])
def get_admin_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Admin gets assignments they created"""
    try:
        assignment_service = AssignmentService(db)
        assignments = assignment_service.get_admin_assignments(current_user.id)
        
        # Convert to summary format
        summaries = []
        for assignment in assignments:
            summary = AssignmentSummary(
                id=assignment.id,
                product_name=assignment.product.name,
                assigned_to_name=f"{assignment.assigned_to_user.first_name} {assignment.assigned_to_user.last_name or ''}",
                team_type=assignment.team_type,
                quantity_requested=assignment.quantity_requested,
                unit=assignment.unit,
                status=assignment.status,
                progress_percentage=assignment.progress_percentage,
                time_remaining=assignment.time_remaining_minutes,
                is_expired=assignment.is_expired,
                created_at=assignment.created_at
            )
            summaries.append(summary)
        
        return summaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin assignments: {str(e)}")


# Team member endpoints
@router.get("/my-assignments", response_model=List[AssignmentSummary])
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Team member gets their assigned products"""
    try:
        assignment_service = AssignmentService(db)
        assignments = assignment_service.get_user_assignments(current_user.id)
        
        # Convert to summary format
        summaries = []
        for assignment in assignments:
            summary = AssignmentSummary(
                id=assignment.id,
                product_name=assignment.product.name,
                assigned_to_name=f"{assignment.assigned_to_user.first_name} {assignment.assigned_to_user.last_name or ''}",
                team_type=assignment.team_type,
                quantity_requested=assignment.quantity_requested,
                unit=assignment.unit,
                status=assignment.status,
                progress_percentage=assignment.progress_percentage,
                time_remaining=assignment.time_remaining_minutes,
                is_expired=assignment.is_expired,
                created_at=assignment.created_at
            )
            summaries.append(summary)
        
        return summaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch assignments: {str(e)}")


@router.get("/{assignment_id}")
def get_assignment_details(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about an assignment"""
    try:
        assignment_service = AssignmentService(db)
        details = assignment_service.get_assignment_details(assignment_id)
        
        if not details:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Check access permissions
        assignment = details["assignment"]
        if (current_user.role.name != "ADMIN" and 
            assignment.assigned_to_user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Return the details as a dictionary (no response_model for now)
        return details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch assignment details: {str(e)}")


@router.get("/{assignment_id}/formulation-components")
def get_assignment_formulation_components(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get scaled formulation components for an assignment"""
    try:
        assignment_service = AssignmentService(db)
        components = assignment_service.get_scaled_formulation_components(assignment_id, current_user.id)
        return components
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch formulation components: {str(e)}")


@router.post("/{assignment_id}/complete-component")
def complete_formulation_component(
    assignment_id: int,
    component_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a formulation component as completed and update stock"""
    try:
        assignment_service = AssignmentService(db)
        result = assignment_service.complete_formulation_component(
            assignment_id, 
            component_data.get('component_chemical_id'),
            component_data.get('quantity_used'),
            current_user.id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete component: {str(e)}")


@router.post("/start-formulation", response_model=ProductAssignmentResponse)
def start_formulation_with_otp(
    request: StartFormulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Team member starts working on a formulation with OTP verification"""
    try:
        assignment_service = AssignmentService(db)
        assignment = assignment_service.start_formulation_with_otp(
            assignment_id=request.assignment_id,
            user_id=current_user.id,
            otp_code=request.otp_code
        )
        return assignment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start formulation: {str(e)}")


@router.post("/start", response_model=ProductAssignmentResponse)
def start_formulation(
    request: StartFormulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Team member starts working on a formulation (legacy endpoint)"""
    try:
        assignment_service = AssignmentService(db)
        assignment = assignment_service.start_formulation(
            assignment_id=request.assignment_id,
            user_id=current_user.id
        )
        return assignment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start formulation: {str(e)}")


@router.post("/update-progress", response_model=Dict)
def update_progress_new(
    progress_data: UpdateProgressRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Team member updates progress of a component (new endpoint)"""
    try:
        assignment_service = AssignmentService(db)
        progress = assignment_service.update_component_progress(
            assignment_id=progress_data.assignment_id,
            component_chemical_id=progress_data.component_chemical_id,
            user_id=current_user.id,
            status=progress_data.status,
            notes=progress_data.notes
        )
        
        return {
            "message": "Progress updated successfully",
            "component_id": progress.component_chemical_id,
            "status": progress.status,
            "progress_percentage": progress.assignment.progress_percentage
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")


@router.put("/progress/{assignment_id}", response_model=Dict)
def update_progress(
    assignment_id: int,
    progress_data: UpdateProgressRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Team member updates progress of a component (legacy endpoint)"""
    try:
        assignment_service = AssignmentService(db)
        progress = assignment_service.update_component_progress(
            assignment_id=assignment_id,
            component_chemical_id=progress_data.component_chemical_id,
            user_id=current_user.id,
            status=progress_data.status,
            notes=progress_data.notes
        )
        
        return {
            "message": "Progress updated successfully",
            "component_id": progress.component_chemical_id,
            "status": progress.status,
            "progress_percentage": progress.assignment.progress_percentage
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")


@router.post("/complete-assignment", response_model=Dict)
def complete_assignment(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Team member completes an assignment"""
    try:
        assignment_id = request.get("assignment_id")
        if not assignment_id:
            raise ValueError("assignment_id is required")
        
        assignment_service = AssignmentService(db)
        assignment = assignment_service.complete_assignment(
            assignment_id=assignment_id,
            user_id=current_user.id
        )
        
        return {
            "message": "Assignment completed successfully",
            "assignment_id": assignment.id,
            "status": assignment.status
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete assignment: {str(e)}")


# Extension request endpoints
@router.post("/request-extension", response_model=ExtensionRequestResponse)
def request_extension(
    request: RequestExtensionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Team member requests time extension"""
    try:
        assignment_service = AssignmentService(db)
        extension_request = assignment_service.request_extension(
            assignment_id=request.assignment_id,
            user_id=current_user.id,
            reason=request.reason,
            requested_extension_minutes=request.requested_extension_minutes
        )
        return extension_request
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to request extension: {str(e)}")


@router.post("/request-extension-otp", response_model=Dict)
def request_extension_with_otp(
    request: RequestExtensionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Team member requests time extension with OTP verification"""
    try:
        assignment_service = AssignmentService(db)
        
        # First create the extension request
        extension_request = assignment_service.request_extension(
            assignment_id=request.assignment_id,
            user_id=current_user.id,
            reason=request.reason,
            requested_extension_minutes=request.requested_extension_minutes
        )
        
        # Generate OTP for extension request (sent to admin phone)
        from app.services.admin_otp_service import AdminOTPService
        otp_result = AdminOTPService.send_otp(current_user.phone_number, db, "extension")
        
        if not otp_result["success"]:
            raise HTTPException(status_code=400, detail=otp_result["message"])
        
        return {
            "message": "Extension request created. OTP sent for verification.",
            "extension_request_id": extension_request.id,
            "otp_sent": True
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to request extension with OTP: {str(e)}")


@router.post("/verify-extension-otp", response_model=ExtensionRequestResponse)
def verify_extension_otp(
    request: VerifyExtensionOTPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify OTP for extension request"""
    try:
        # Verify OTP (admin phone verification)
        from app.services.admin_otp_service import AdminOTPService
        otp_result = AdminOTPService.verify_otp(current_user.phone_number, request.otp_code, db)
        
        if not otp_result["success"]:
            raise HTTPException(status_code=400, detail=otp_result["message"])
        
        # Get the extension request
        assignment_service = AssignmentService(db)
        extension_request = assignment_service.get_extension_request(request.extension_request_id)
        
        if not extension_request:
            raise HTTPException(status_code=404, detail="Extension request not found")
        
        if extension_request.requested_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return extension_request
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify extension OTP: {str(e)}")


@router.get("/extension-requests/pending", response_model=List[ExtensionRequestSummary])
def get_pending_extension_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Admin gets all pending extension requests"""
    try:
        assignment_service = AssignmentService(db)
        requests = assignment_service.get_pending_extension_requests()
        
        # Convert to summary format
        summaries = []
        for req in requests:
            summary = ExtensionRequestSummary(
                id=req.id,
                assignment_id=req.assignment_id,
                product_name=req.assignment.product.name,
                requested_by_name=f"{req.requested_by_user.first_name} {req.requested_by_user.last_name or ''}",
                reason=req.reason,
                requested_extension_minutes=req.requested_extension_minutes,
                status=req.status,
                created_at=req.created_at
            )
            summaries.append(summary)
        
        return summaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch extension requests: {str(e)}")


@router.put("/extension-requests/{request_id}/approve", response_model=ProductAssignmentResponse)
def approve_extension(
    request_id: int,
    approval_data: ApproveExtensionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Admin approves extension request"""
    try:
        assignment_service = AssignmentService(db)
        assignment = assignment_service.approve_extension(
            extension_request_id=request_id,
            admin_id=current_user.id,
            new_minutes=approval_data.new_minutes
        )
        return assignment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve extension: {str(e)}")


@router.put("/extension-requests/{request_id}/reject", response_model=Dict)
def reject_extension(
    request_id: int,
    rejection_data: RejectExtensionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Admin rejects extension request"""
    try:
        assignment_service = AssignmentService(db)
        assignment_service.reject_extension(
            extension_request_id=request_id,
            admin_id=current_user.id,
            reason=rejection_data.reason
        )
        return {"message": "Extension request rejected successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject extension: {str(e)}")


# Utility endpoints
@router.get("/check-expiration/{assignment_id}", response_model=Dict)
def check_expiration(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if an assignment has expired"""
    try:
        assignment_service = AssignmentService(db)
        is_expired = assignment_service.check_expiration(assignment_id)
        
        return {
            "assignment_id": assignment_id,
            "is_expired": is_expired
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check expiration: {str(e)}")


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Admin deletes an assignment"""
    try:
        assignment_service = AssignmentService(db)
        success = assignment_service.delete_assignment(assignment_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        return {"message": "Assignment deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete assignment: {str(e)}")


@router.get("/team-assignment-logic", response_model=Dict)
def get_team_assignment_logic():
    """Get information about team assignment logic"""
    return {
        "logic": "Automatic team assignment based on quantity thresholds",
        "rules": {
            "LAB_STAFF": "Products with quantity < 2kg (or equivalent)",
            "PRODUCT_TEAM": "Products with quantity ≥ 2kg (or equivalent)"
        },
        "unit_conversions": {
            "g to kg": "divide by 1000",
            "mg to kg": "divide by 1000000",
            "lb to kg": "multiply by 0.453592",
            "oz to kg": "multiply by 0.0283495"
        }
    }
