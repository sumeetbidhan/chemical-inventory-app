"""
Assignment Service for Chemical Inventory System
Handles product assignments, team logic, OTP management, and progress tracking
"""

import asyncio
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models.product_assignment import ProductAssignment
from ..models.extension_request import ExtensionRequest
from ..models.formulation_progress import FormulationProgress
from ..models.chemical_product import ChemicalProduct
from ..models.formulation import Formulation
from ..models.user import User
from ..services.unit_converter import UnitConverter


class AssignmentService:
    """Service for managing product assignments and team logic"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _generate_otp(self, length: int = 6) -> str:
        """Generate a secure OTP token"""
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    
    def _convert_to_kg(self, quantity: float, unit: str) -> float:
        """Convert quantity to kg for team assignment logic"""
        try:
            if unit.lower() in ['kg', 'kilograms']:
                return quantity
            elif unit.lower() in ['g', 'grams']:
                return quantity / 1000.0
            elif unit.lower() in ['mg', 'milligrams']:
                return quantity / 1000000.0
            elif unit.lower() in ['lb', 'pounds']:
                return quantity * 0.453592
            elif unit.lower() in ['oz', 'ounces']:
                return quantity * 0.0283495
            else:
                # For other units, assume they're small quantities
                return 0.5
        except:
            return 0.5
    
    def auto_assign_team(self, quantity: float, unit: str) -> str:
        """
        Automatically assign team based on quantity threshold
        
        Args:
            quantity: The quantity requested
            unit: The unit of measurement
            
        Returns:
            Team type: 'LAB_STAFF' or 'PRODUCT_TEAM'
        """
        quantity_kg = self._convert_to_kg(quantity, unit)
        
        if quantity_kg < 2.0:
            return "LAB_STAFF"
        else:
            return "PRODUCT_TEAM"
    
    def create_assignment(
        self, 
        product_id: int, 
        user_id: int, 
        admin_id: int, 
        quantity: float, 
        unit: str, 
        time_allotted_minutes: int
    ) -> ProductAssignment:
        """
        Create a new product assignment
        
        Args:
            product_id: ID of the chemical product to assign
            user_id: ID of the user to assign to
            admin_id: ID of the admin creating the assignment
            quantity: Quantity requested
            unit: Unit of measurement
            time_allotted_minutes: Time limit in minutes
            
        Returns:
            Created ProductAssignment instance
        """
        # Auto-assign team based on quantity
        team_type = self.auto_assign_team(quantity, unit)
        
        # Generate OTP token
        otp_token = self._generate_otp()
        
        # Create assignment
        assignment = ProductAssignment(
            product_id=product_id,
            assigned_to_user_id=user_id,
            assigned_by_admin_id=admin_id,
            team_type=team_type,
            quantity_requested=quantity,
            unit=unit,
            time_allotted_minutes=time_allotted_minutes,
            otp_token=otp_token,
            status="ASSIGNED"
        )
        
        self.db.add(assignment)
        self.db.commit()
        self.db.refresh(assignment)
        
        # Initialize progress tracking for all formulation components
        self._initialize_progress_tracking(assignment.id, product_id)
        
        return assignment
    
    def _initialize_progress_tracking(self, assignment_id: int, product_id: int):
        """Initialize progress tracking for all formulation components with scaling"""
        # Get the assignment to get scaling information
        assignment = self.db.query(ProductAssignment).filter(
            ProductAssignment.id == assignment_id
        ).first()
        
        if not assignment:
            return
        
        # Get the chemical product to get base composition
        product = self.db.query(ChemicalProduct).filter(
            ChemicalProduct.id == product_id
        ).first()
        
        if not product:
            return
        
        # Calculate scale factor
        base_composition = product.base_composition_qty
        target_quantity = assignment.quantity_requested
        scale_factor = target_quantity / base_composition if base_composition > 0 else 1.0
        
        # Get all formulations for this product
        formulations = self.db.query(Formulation).filter(
            Formulation.product_id == product_id
        ).all()
        
        for formulation in formulations:
            # Scale the quantity based on target quantity
            scaled_quantity = formulation.quantity_required * scale_factor
            
            progress = FormulationProgress(
                assignment_id=assignment_id,
                component_chemical_id=formulation.component_chemical_id,
                quantity_required=scaled_quantity,  # Store scaled quantity
                unit=formulation.unit,
                status="PENDING"
            )
            self.db.add(progress)
        
        self.db.commit()
    
    def start_formulation_with_otp(self, assignment_id: int, user_id: int, otp_code: str) -> ProductAssignment:
        """
        Team member starts working on formulation with OTP verification
        
        Args:
            assignment_id: ID of the assignment
            user_id: ID of the user starting the work
            otp_code: OTP code for verification
            
        Returns:
            Updated ProductAssignment instance
        """
        assignment = self.db.query(ProductAssignment).filter(
            ProductAssignment.id == assignment_id,
            ProductAssignment.assigned_to_user_id == user_id
        ).first()
        
        if not assignment:
            raise ValueError("Assignment not found or access denied")
        
        if assignment.status == "EXPIRED":
            raise ValueError("Assignment has expired. Request extension from admin.")
        
        if assignment.status == "COMPLETED":
            raise ValueError("Assignment is already completed")
        
        # Verify OTP
        if not assignment.otp_token or assignment.otp_token != otp_code.strip():
            raise ValueError("Invalid OTP code")
        
        # Check if OTP has expired
        if assignment.otp_expires_at and datetime.now(timezone.utc) > assignment.otp_expires_at:
            raise ValueError("OTP has expired. Contact admin for new OTP.")
        
        # Set start time and calculate expiration
        assignment.started_at = datetime.now(timezone.utc)
        assignment.expires_at = assignment.started_at + timedelta(minutes=assignment.time_allotted_minutes)
        assignment.otp_expires_at = assignment.expires_at
        assignment.status = "IN_PROGRESS"
        
        self.db.commit()
        self.db.refresh(assignment)
        
        # Start timer for real-time updates
        try:
            from .timer_service import get_timer_service
            timer_service = get_timer_service(self.db)
            asyncio.create_task(timer_service.start_timer_for_assignment(assignment.id))
        except Exception as e:
            print(f"⚠️ Failed to start timer for assignment {assignment.id}: {e}")
        
        return assignment

    def start_formulation(self, assignment_id: int, user_id: int) -> ProductAssignment:
        """
        Team member starts working on formulation (legacy method without OTP)
        
        Args:
            assignment_id: ID of the assignment
            user_id: ID of the user starting the work
            
        Returns:
            Updated ProductAssignment instance
        """
        assignment = self.db.query(ProductAssignment).filter(
            ProductAssignment.id == assignment_id,
            ProductAssignment.assigned_to_user_id == user_id
        ).first()
        
        if not assignment:
            raise ValueError("Assignment not found or access denied")
        
        if assignment.status == "EXPIRED":
            raise ValueError("Assignment has expired. Request extension from admin.")
        
        if assignment.status == "COMPLETED":
            raise ValueError("Assignment is already completed")
        
        # Set start time and calculate expiration
        assignment.started_at = datetime.now(timezone.utc)
        assignment.expires_at = assignment.started_at + timedelta(minutes=assignment.time_allotted_minutes)
        assignment.otp_expires_at = assignment.expires_at
        assignment.status = "IN_PROGRESS"
        
        self.db.commit()
        self.db.refresh(assignment)
        
        return assignment

    def complete_assignment(self, assignment_id: int, user_id: int) -> ProductAssignment:
        """
        Team member completes an assignment
        
        Args:
            assignment_id: ID of the assignment
            user_id: ID of the user completing the work
            
        Returns:
            Updated ProductAssignment instance
        """
        assignment = self.db.query(ProductAssignment).filter(
            ProductAssignment.id == assignment_id,
            ProductAssignment.assigned_to_user_id == user_id
        ).first()
        
        if not assignment:
            raise ValueError("Assignment not found or access denied")
        
        if assignment.status == "EXPIRED":
            raise ValueError("Assignment has expired. Cannot complete expired assignment.")
        
        if assignment.status == "COMPLETED":
            raise ValueError("Assignment is already completed")
        
        # Auto-complete all remaining formulation components
        self._auto_complete_remaining_components(assignment_id, user_id)
        
        # Mark assignment as completed
        assignment.status = "COMPLETED"
        assignment.progress_percentage = 100
        
        self.db.commit()
        self.db.refresh(assignment)
        
        return assignment
    
    def _auto_complete_remaining_components(self, assignment_id: int, user_id: int):
        """Auto-complete all remaining formulation components when assignment is completed"""
        from ..models.formulation import Formulation
        from ..models.formulation_progress import FormulationProgress
        from ..models.chemical import Chemical
        from ..models.stock_movement import StockMovement, ChangeType
        
        # Get all formulation components for this assignment
        assignment = self.db.query(ProductAssignment).filter(ProductAssignment.id == assignment_id).first()
        if not assignment:
            return
        
        formulations = self.db.query(Formulation).filter(
            Formulation.product_id == assignment.product_id
        ).all()
        
        # Get existing progress records
        progress_records = self.db.query(FormulationProgress).filter(
            FormulationProgress.assignment_id == assignment_id
        ).all()
        
        progress_map = {p.component_chemical_id: p for p in progress_records}
        
        # Calculate scale factor
        # Convert both quantities to the same unit (grams) for proper scaling
        assignment_qty_in_grams = self._convert_units(assignment.quantity_requested, assignment.unit, 'g')
        product_qty_in_grams = self._convert_units(assignment.product.base_composition_qty, assignment.product.unit, 'g')
        scale_factor = assignment_qty_in_grams / product_qty_in_grams
        
        for formulation in formulations:
            # Check if component is already completed
            progress = progress_map.get(formulation.component_chemical_id)
            if progress and progress.status == "COMPLETED":
                continue  # Already completed, skip
            
            # Get the chemical
            chemical = self.db.query(Chemical).filter(
                Chemical.id == formulation.component_chemical_id
            ).first()
            
            if not chemical:
                continue
            
            # Calculate scaled quantity
            scaled_quantity = formulation.quantity_required * scale_factor
            
            # Convert quantity to chemical's unit
            quantity_in_chemical_unit = self._convert_units(
                scaled_quantity,
                formulation.unit,
                chemical.unit
            )
            
            # Check if enough stock is available
            if chemical.available_qty >= quantity_in_chemical_unit:
                # Create or update progress record
                if not progress:
                    progress = FormulationProgress(
                        assignment_id=assignment_id,
                        component_chemical_id=formulation.component_chemical_id,
                        quantity_required=scaled_quantity,
                        unit=formulation.unit,
                        status="COMPLETED",
                        completed_at=datetime.now(timezone.utc),
                        completed_by=user_id
                    )
                    self.db.add(progress)
                else:
                    progress.status = "COMPLETED"
                    progress.completed_at = datetime.now(timezone.utc)
                    progress.completed_by = user_id
                
                # Update chemical stock
                chemical.available_qty -= quantity_in_chemical_unit
                
                # Create stock movement record
                stock_movement = StockMovement(
                    chemical_id=formulation.component_chemical_id,
                    change_type=ChangeType.DECREASE,
                    quantity_changed=quantity_in_chemical_unit,
                    unit=chemical.unit,
                    action="Assignment Completion - Auto-completed",
                    reference_id=assignment_id,
                    reference_type="assignment"
                )
                self.db.add(stock_movement)
            else:
                # Not enough stock - mark as completed anyway but log the issue
                print(f"⚠️ Warning: Not enough stock for {chemical.name} during auto-completion. Available: {chemical.available_qty} {chemical.unit}, Required: {quantity_in_chemical_unit} {chemical.unit}")
                
                # Still mark as completed for progress tracking
                if not progress:
                    progress = FormulationProgress(
                        assignment_id=assignment_id,
                        component_chemical_id=formulation.component_chemical_id,
                        quantity_required=scaled_quantity,
                        unit=formulation.unit,
                        status="COMPLETED",
                        completed_at=datetime.now(timezone.utc),
                        completed_by=user_id
                    )
                    self.db.add(progress)
                else:
                    progress.status = "COMPLETED"
                    progress.completed_at = datetime.now(timezone.utc)
                    progress.completed_by = user_id
    
    def check_expiration(self, assignment_id: int) -> bool:
        """
        Check if assignment has expired
        
        Args:
            assignment_id: ID of the assignment
            
        Returns:
            True if expired, False otherwise
        """
        assignment = self.db.query(ProductAssignment).filter(
            ProductAssignment.id == assignment_id
        ).first()
        
        if not assignment:
            return False
        
        if assignment.expires_at and datetime.now(timezone.utc) > assignment.expires_at:
            assignment.status = "EXPIRED"
            assignment.otp_expires_at = assignment.expires_at
            self.db.commit()
            return True
        
        return False
    
    def update_component_progress(
        self, 
        assignment_id: int, 
        component_chemical_id: int, 
        user_id: int, 
        status: str,
        notes: Optional[str] = None
    ) -> FormulationProgress:
        """
        Update progress of a specific formulation component
        
        Args:
            assignment_id: ID of the assignment
            component_chemical_id: ID of the chemical component
            user_id: ID of the user updating progress
            status: New status ('PENDING', 'IN_PROGRESS', 'COMPLETED')
            notes: Optional notes
            
        Returns:
            Updated FormulationProgress instance
        """
        progress = self.db.query(FormulationProgress).filter(
            FormulationProgress.assignment_id == assignment_id,
            FormulationProgress.component_chemical_id == component_chemical_id
        ).first()
        
        if not progress:
            raise ValueError("Progress tracking not found")
        
        progress.status = status
        if status == "COMPLETED":
            progress.completed_at = datetime.now(timezone.utc)
            progress.completed_by = user_id
        progress.notes = notes
        
        self.db.commit()
        self.db.refresh(progress)
        
        # Update overall assignment progress
        self._update_assignment_progress(assignment_id)
        
        return progress
    
    def _update_assignment_progress(self, assignment_id: int):
        """Update the overall progress percentage of an assignment"""
        assignment = self.db.query(ProductAssignment).filter(
            ProductAssignment.id == assignment_id
        ).first()
        
        if not assignment:
            return
        
        # Calculate progress based on completed components
        total_components = self.db.query(FormulationProgress).filter(
            FormulationProgress.assignment_id == assignment_id
        ).count()
        
        completed_components = self.db.query(FormulationProgress).filter(
            FormulationProgress.assignment_id == assignment_id,
            FormulationProgress.status == "COMPLETED"
        ).count()
        
        if total_components > 0:
            progress_percentage = int((completed_components / total_components) * 100)
            assignment.progress_percentage = progress_percentage
            
            # Mark as completed if all components are done
            if progress_percentage == 100:
                assignment.status = "COMPLETED"
            
            self.db.commit()
    
    def request_extension(
        self, 
        assignment_id: int, 
        user_id: int, 
        reason: str,
        requested_extension_minutes: int
    ) -> ExtensionRequest:
        """
        Team member requests time extension
        
        Args:
            assignment_id: ID of the assignment
            user_id: ID of the user requesting extension
            reason: Reason for extension request
            requested_extension_minutes: Minutes of extension requested
            
        Returns:
            Created ExtensionRequest instance
        """
        assignment = self.db.query(ProductAssignment).filter(
            ProductAssignment.id == assignment_id,
            ProductAssignment.assigned_to_user_id == user_id
        ).first()
        
        if not assignment:
            raise ValueError("Assignment not found or access denied")
        
        # Create extension request
        extension_request = ExtensionRequest(
            assignment_id=assignment_id,
            requested_by=user_id,
            reason=reason,
            current_expiry=assignment.expires_at or datetime.now(timezone.utc),
            requested_extension_minutes=requested_extension_minutes
        )
        
        self.db.add(extension_request)
        self.db.commit()
        self.db.refresh(extension_request)
        
        return extension_request
    
    def approve_extension(
        self, 
        extension_request_id: int, 
        admin_id: int, 
        new_minutes: int
    ) -> ProductAssignment:
        """
        Admin approves extension request
        
        Args:
            extension_request_id: ID of the extension request
            admin_id: ID of the admin approving
            new_minutes: Additional minutes to grant
            
        Returns:
            Updated ProductAssignment instance
        """
        extension_request = self.db.query(ExtensionRequest).filter(
            ExtensionRequest.id == extension_request_id
        ).first()
        
        if not extension_request:
            raise ValueError("Extension request not found")
        
        assignment = extension_request.assignment
        
        # Extend time
        assignment.time_allotted_minutes += new_minutes
        if assignment.started_at:
            assignment.expires_at = assignment.started_at + timedelta(minutes=assignment.time_allotted_minutes)
            assignment.otp_expires_at = assignment.expires_at
        
        assignment.status = "IN_PROGRESS"
        
        # Update extension request status
        extension_request.status = "APPROVED"
        extension_request.approved_by = admin_id
        extension_request.approved_at = datetime.now(timezone.utc)
        
        # Generate new OTP
        assignment.otp_token = self._generate_otp()
        
        self.db.commit()
        self.db.refresh(assignment)
        
        return assignment
    
    def reject_extension(self, extension_request_id: int, admin_id: int, reason: str):
        """
        Admin rejects extension request
        
        Args:
            extension_request_id: ID of the extension request
            admin_id: ID of the admin rejecting
            reason: Reason for rejection
        """
        extension_request = self.db.query(ExtensionRequest).filter(
            ExtensionRequest.id == extension_request_id
        ).first()
        
        if not extension_request:
            raise ValueError("Extension request not found")
        
        extension_request.status = "REJECTED"
        extension_request.approved_by = admin_id
        extension_request.approved_at = datetime.now(timezone.utc)
        
        self.db.commit()
    
    def get_user_assignments(self, user_id: int) -> List[ProductAssignment]:
        """Get all assignments for a specific user"""
        from sqlalchemy.orm import joinedload
        return self.db.query(ProductAssignment).options(
            joinedload(ProductAssignment.product),
            joinedload(ProductAssignment.assigned_to_user),
            joinedload(ProductAssignment.assigned_by_admin)
        ).filter(
            ProductAssignment.assigned_to_user_id == user_id
        ).order_by(ProductAssignment.created_at.desc()).all()
    
    def get_admin_assignments(self, admin_id: int) -> List[ProductAssignment]:
        """Get all assignments created by a specific admin"""
        from sqlalchemy.orm import joinedload
        return self.db.query(ProductAssignment).options(
            joinedload(ProductAssignment.product),
            joinedload(ProductAssignment.assigned_to_user),
            joinedload(ProductAssignment.assigned_by_admin)
        ).filter(
            ProductAssignment.assigned_by_admin_id == admin_id
        ).order_by(ProductAssignment.created_at.desc()).all()
    
    def get_all_assignments(self) -> List[ProductAssignment]:
        """Get all assignments (admin only)"""
        from sqlalchemy.orm import joinedload
        
        # First, update any expired assignments
        self.update_expired_assignments()
        
        return self.db.query(ProductAssignment).options(
            joinedload(ProductAssignment.product),
            joinedload(ProductAssignment.assigned_to_user),
            joinedload(ProductAssignment.assigned_by_admin)
        ).order_by(
            ProductAssignment.created_at.desc()
        ).all()
    
    def get_pending_extension_requests(self) -> List[ExtensionRequest]:
        """Get all pending extension requests (admin only)"""
        return self.db.query(ExtensionRequest).filter(
            ExtensionRequest.status == "PENDING"
        ).order_by(ExtensionRequest.created_at.desc()).all()
    
    def get_extension_request(self, extension_request_id: int) -> ExtensionRequest:
        """Get a specific extension request by ID"""
        return self.db.query(ExtensionRequest).filter(
            ExtensionRequest.id == extension_request_id
        ).first()
    
    def get_scaled_formulation_components(self, assignment_id: int, user_id: int) -> List[Dict]:
        """Get scaled formulation components for an assignment"""
        from ..models.formulation import Formulation
        from ..models.chemical import Chemical
        from ..models.formulation_progress import FormulationProgress
        from ..models.user import User
        
        # Check if user is admin or assigned to this assignment
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Get the assignment - allow admin access or assigned user access
        if user.role_id == 1:  # Admin
            assignment = self.db.query(ProductAssignment).filter(
                ProductAssignment.id == assignment_id
            ).first()
        else:
            assignment = self.db.query(ProductAssignment).filter(
                ProductAssignment.id == assignment_id,
                ProductAssignment.assigned_to_user_id == user_id
            ).first()
        
        if not assignment:
            raise ValueError("Assignment not found or access denied")
        
        # Get formulation components for this product
        formulations = self.db.query(Formulation).filter(
            Formulation.product_id == assignment.product_id
        ).all()
        
        # Get existing progress for this assignment
        progress_records = self.db.query(FormulationProgress).filter(
            FormulationProgress.assignment_id == assignment_id
        ).all()
        
        progress_map = {p.component_chemical_id: p for p in progress_records}
        
        # Calculate scale factor based on assignment quantity vs base composition
        # Convert both quantities to the same unit (grams) for proper scaling
        assignment_qty_in_grams = self._convert_units(assignment.quantity_requested, assignment.unit, 'g')
        product_qty_in_grams = self._convert_units(assignment.product.base_composition_qty, assignment.product.unit, 'g')
        scale_factor = assignment_qty_in_grams / product_qty_in_grams
        
        components = []
        for formulation in formulations:
            chemical = self.db.query(Chemical).filter(
                Chemical.id == formulation.component_chemical_id
            ).first()
            
            if not chemical:
                continue
                
            # Calculate scaled quantity
            scaled_quantity = formulation.quantity_required * scale_factor
            
            # Get progress status
            progress = progress_map.get(formulation.component_chemical_id)
            status = progress.status if progress else "PENDING"
            
            components.append({
                "id": formulation.id,
                "component_chemical_id": formulation.component_chemical_id,
                "chemical_name": chemical.name,
                "component_name": chemical.name,
                "required_quantity": formulation.quantity_required,
                "scaled_quantity": scaled_quantity,
                "quantity_required": scaled_quantity,
                "unit": formulation.unit,
                "available_quantity": chemical.available_qty,
                "status": status,
                "completed": status == "COMPLETED",
                "progress_id": progress.id if progress else None,
                "completed_at": progress.completed_at if progress else None
            })
        
        return components
    
    def _convert_units(self, quantity: float, from_unit: str, to_unit: str) -> float:
        """Convert quantity from one unit to another"""
        # Normalize units to lowercase
        from_unit = from_unit.lower().strip()
        to_unit = to_unit.lower().strip()
        
        # If units are the same, return as is
        if from_unit == to_unit:
            return quantity
        
        # Define conversion factors to base units (grams for weight, ml for volume)
        conversion_factors = {
            # Weight conversions (to grams)
            'g': 1.0,
            'gram': 1.0,
            'grams': 1.0,
            'kg': 1000.0,
            'kilogram': 1000.0,
            'kilograms': 1000.0,
            'mg': 0.001,
            'milligram': 0.001,
            'milligrams': 0.001,
            'lb': 453.592,
            'pound': 453.592,
            'pounds': 453.592,
            'oz': 28.3495,
            'ounce': 28.3495,
            'ounces': 28.3495,
            
            # Volume conversions (to ml)
            'ml': 1.0,
            'milliliter': 1.0,
            'milliliters': 1.0,
            'l': 1000.0,
            'liter': 1000.0,
            'liters': 1000.0,
            'dl': 100.0,
            'deciliter': 100.0,
            'deciliters': 100.0,
            'cl': 10.0,
            'centiliter': 10.0,
            'centiliters': 10.0,
            'fl oz': 29.5735,
            'fluid ounce': 29.5735,
            'fluid ounces': 29.5735,
            'cup': 236.588,
            'cups': 236.588,
            'pint': 473.176,
            'pints': 473.176,
            'quart': 946.353,
            'quarts': 946.353,
            'gallon': 3785.41,
            'gallons': 3785.41
        }
        
        # Get conversion factors
        from_factor = conversion_factors.get(from_unit, 1.0)
        to_factor = conversion_factors.get(to_unit, 1.0)
        
        # Convert to base unit, then to target unit
        base_quantity = quantity * from_factor
        converted_quantity = base_quantity / to_factor
        
        return converted_quantity
    
    def complete_formulation_component(self, assignment_id: int, component_chemical_id: int, 
                                     quantity_used: float, user_id: int) -> Dict:
        """Complete a formulation component and update stock"""
        from ..models.formulation import Formulation
        from ..models.chemical import Chemical
        from ..models.formulation_progress import FormulationProgress
        from ..models.stock_movement import StockMovement, ChangeType
        
        # Verify assignment access
        assignment = self.db.query(ProductAssignment).filter(
            ProductAssignment.id == assignment_id,
            ProductAssignment.assigned_to_user_id == user_id
        ).first()
        
        if not assignment:
            raise ValueError("Assignment not found or access denied")
        
        # Get the formulation component
        formulation = self.db.query(Formulation).filter(
            Formulation.product_id == assignment.product_id,
            Formulation.component_chemical_id == component_chemical_id
        ).first()
        
        if not formulation:
            raise ValueError("Formulation component not found")
        
        # Get the chemical
        chemical = self.db.query(Chemical).filter(
            Chemical.id == component_chemical_id
        ).first()
        
        if not chemical:
            raise ValueError("Chemical not found")
        
        # Convert quantity_used to the same unit as chemical.available_qty
        quantity_used_in_chemical_unit = self._convert_units(
            quantity_used, 
            formulation.unit, 
            chemical.unit
        )
        
        # Check if enough stock is available (now both in same unit)
        if chemical.available_qty < quantity_used_in_chemical_unit:
            raise ValueError(f"Insufficient stock. Available: {chemical.available_qty} {chemical.unit}, Required: {quantity_used_in_chemical_unit} {chemical.unit} (converted from {quantity_used} {formulation.unit})")
        
        # Create or update progress record
        progress = self.db.query(FormulationProgress).filter(
            FormulationProgress.assignment_id == assignment_id,
            FormulationProgress.component_chemical_id == component_chemical_id
        ).first()
        
        if not progress:
            progress = FormulationProgress(
                assignment_id=assignment_id,
                component_chemical_id=component_chemical_id,
                quantity_required=quantity_used,
                unit=formulation.unit,
                status="COMPLETED",
                completed_at=datetime.now(timezone.utc),
                completed_by=user_id
            )
            self.db.add(progress)
        else:
            progress.status = "COMPLETED"
            progress.completed_at = datetime.now(timezone.utc)
            progress.completed_by = user_id
        
        # Update chemical stock (use converted quantity)
        chemical.available_qty -= quantity_used_in_chemical_unit
        
        # Create stock movement record (use converted quantity and chemical unit)
        stock_movement = StockMovement(
            chemical_id=component_chemical_id,
            change_type=ChangeType.DECREASE,
            quantity_changed=quantity_used_in_chemical_unit,
            unit=chemical.unit,
            action="Formulation Usage",
            reference_id=assignment_id,
            reference_type="assignment"
        )
        self.db.add(stock_movement)
        
        # Update assignment progress
        self._update_assignment_progress(assignment_id)
        
        self.db.commit()
        
        return {
            "message": "Component completed successfully",
            "component_id": formulation.id,
            "quantity_used": quantity_used,
            "remaining_stock": chemical.available_qty
        }
    
    def _update_assignment_progress(self, assignment_id: int):
        """Update overall assignment progress based on completed components"""
        from ..models.formulation_progress import FormulationProgress
        
        # Get all progress records for this assignment
        progress_records = self.db.query(FormulationProgress).filter(
            FormulationProgress.assignment_id == assignment_id
        ).all()
        
        if not progress_records:
            return
        
        # Calculate progress percentage
        total_components = len(progress_records)
        completed_components = len([p for p in progress_records if p.status == "COMPLETED"])
        progress_percentage = int((completed_components / total_components) * 100)
        
        # Update assignment
        assignment = self.db.query(ProductAssignment).filter(
            ProductAssignment.id == assignment_id
        ).first()
        
        if assignment:
            assignment.progress_percentage = progress_percentage
            
            # Mark as completed if all components are done
            if progress_percentage == 100:
                assignment.status = "COMPLETED"
    
    def get_assignment_details(self, assignment_id: int) -> Dict:
        """Get detailed information about an assignment"""
        from sqlalchemy.orm import joinedload
        
        # Get assignment with product details
        assignment = self.db.query(ProductAssignment).options(
            joinedload(ProductAssignment.product)
        ).filter(ProductAssignment.id == assignment_id).first()
        
        if not assignment:
            return {}
        
        # Get progress details
        progress_items = self.db.query(FormulationProgress).filter(
            FormulationProgress.assignment_id == assignment_id
        ).all()
        
        # Get extension requests
        extension_requests = self.db.query(ExtensionRequest).filter(
            ExtensionRequest.assignment_id == assignment_id
        ).all()
        
        return {
            "assignment": assignment,
            "progress": progress_items,
            "extension_requests": extension_requests,
            "is_expired": assignment.is_expired,
            "time_remaining": assignment.time_remaining_minutes
        }
    
    def delete_assignment(self, assignment_id: int) -> bool:
        """Delete an assignment and all related data"""
        try:
            # Get the assignment
            assignment = self.db.query(ProductAssignment).filter(
                ProductAssignment.id == assignment_id
            ).first()
            
            if not assignment:
                return False
            
            # Delete related progress tracking records
            self.db.query(FormulationProgress).filter(
                FormulationProgress.assignment_id == assignment_id
            ).delete()
            
            # Delete related extension requests
            self.db.query(ExtensionRequest).filter(
                ExtensionRequest.assignment_id == assignment_id
            ).delete()
            
            # Delete the assignment itself
            self.db.delete(assignment)
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            print(f"Error deleting assignment {assignment_id}: {e}")
            return False
    
    def update_expired_assignments(self) -> int:
        """Update assignments that have expired but still show as IN_PROGRESS"""
        try:
            # Find assignments that are IN_PROGRESS but have expired
            expired_assignments = self.db.query(ProductAssignment).filter(
                ProductAssignment.status == "IN_PROGRESS",
                ProductAssignment.expires_at < datetime.now(timezone.utc)
            ).all()
            
            updated_count = 0
            for assignment in expired_assignments:
                assignment.status = "EXPIRED"
                updated_count += 1
            
            if updated_count > 0:
                self.db.commit()
                print(f"Updated {updated_count} expired assignments to EXPIRED status")
            
            return updated_count
            
        except Exception as e:
            self.db.rollback()
            print(f"Error updating expired assignments: {e}")
            return 0
