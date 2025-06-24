from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from app.models.formulation_details import FormulationDetails
from app.models.chemical_inventory import ChemicalInventory
from app.models.activity_log import ActivityLog
from app.models.user import User, UserRole
from app.schema.formulation_details import FormulationDetailsCreate, FormulationDetailsUpdate, FormulationDetailsAddNote
from datetime import datetime

def get_formulation_details(db: Session, skip: int = 0, limit: int = 100, chemical_id: int = None) -> List[FormulationDetails]:
    """Get all formulation details with optional chemical filtering"""
    query = db.query(FormulationDetails)
    
    if chemical_id:
        query = query.filter(FormulationDetails.chemical_id == chemical_id)
    
    return query.offset(skip).limit(limit).all()

def get_formulation_details_by_id(db: Session, formulation_id: int) -> Optional[FormulationDetails]:
    """Get a specific formulation detail by ID"""
    return db.query(FormulationDetails).filter(FormulationDetails.id == formulation_id).first()

def get_formulation_details_by_chemical(db: Session, chemical_id: int) -> List[FormulationDetails]:
    """Get all formulation details for a specific chemical"""
    return db.query(FormulationDetails).filter(FormulationDetails.chemical_id == chemical_id).all()

def create_formulation_details(
    db: Session, 
    formulation: FormulationDetailsCreate, 
    user_uid: str,
    user_role: UserRole
) -> FormulationDetails:
    """Create a new formulation detail with role-based access control"""
    
    # Check permissions
    if user_role not in [UserRole.ADMIN, UserRole.LAB_STAFF, UserRole.PRODUCT]:
        raise PermissionError("Insufficient permissions to create formulation details")
    
    # Verify chemical exists
    chemical = db.query(ChemicalInventory).filter(ChemicalInventory.id == formulation.chemical_id).first()
    if not chemical:
        raise ValueError("Chemical inventory item not found")
    
    db_formulation = FormulationDetails(
        **formulation.dict(),
        updated_by=user_uid
    )
    db.add(db_formulation)
    db.commit()
    db.refresh(db_formulation)
    
    # Log the activity
    log_activity(
        db=db,
        user_uid=user_uid,
        action="create_formulation_details",
        table_modified="formulation_details",
        description=f"Created formulation detail: {formulation.component_name} for chemical: {chemical.name}",
        new_value=f"ID: {db_formulation.id}, Component: {formulation.component_name}, Amount: {formulation.amount} {formulation.unit}"
    )
    
    return db_formulation

def update_formulation_details(
    db: Session, 
    formulation_id: int, 
    formulation_update: FormulationDetailsUpdate, 
    user_uid: str,
    user_role: UserRole
) -> Optional[FormulationDetails]:
    """Update a formulation detail with role-based access control"""
    
    db_formulation = get_formulation_details_by_id(db, formulation_id)
    if not db_formulation:
        return None
    
    # Get old values for logging
    old_values = {
        "component_name": db_formulation.component_name,
        "amount": db_formulation.amount,
        "unit": db_formulation.unit,
        "available_quantity": db_formulation.available_quantity,
        "required_quantity": db_formulation.required_quantity,
        "notes": db_formulation.notes
    }
    
    # Apply role-based update restrictions
    update_data = formulation_update.dict(exclude_unset=True)
    
    if user_role == UserRole.ADMIN:
        # Admin can update everything
        pass
    elif user_role in [UserRole.LAB_STAFF, UserRole.PRODUCT]:
        # Lab Staff and Product can update: available_quantity, required_quantity, notes
        allowed_fields = {"available_quantity", "required_quantity", "notes"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    elif user_role == UserRole.ACCOUNT:
        # Account can only update amounts and notes
        allowed_fields = {"amount", "notes"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    else:
        raise PermissionError("Insufficient permissions to update formulation details")
    
    if not update_data:
        return db_formulation
    
    # Update fields
    for field, value in update_data.items():
        setattr(db_formulation, field, value)
    
    db_formulation.updated_by = user_uid
    db.commit()
    db.refresh(db_formulation)
    
    # Log changes
    for field, new_value in update_data.items():
        old_value = old_values.get(field)
        if old_value != new_value:
            log_activity(
                db=db,
                user_uid=user_uid,
                action="update_formulation_details",
                table_modified="formulation_details",
                field_modified=field,
                description=f"Updated {field} for formulation: {db_formulation.component_name}",
                old_value=str(old_value),
                new_value=str(new_value)
            )
    
    return db_formulation

def add_note_to_formulation_details(
    db: Session, 
    formulation_id: int, 
    note_data: FormulationDetailsAddNote, 
    user_uid: str,
    user_role: UserRole
) -> Optional[FormulationDetails]:
    """Add a note to a formulation detail (append-only)"""
    
    db_formulation = get_formulation_details_by_id(db, formulation_id)
    if not db_formulation:
        return None
    
    # All users can add notes
    current_notes = db_formulation.notes or ""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_note = f"[{timestamp}] {note_data.note}"
    
    if current_notes:
        updated_notes = f"{current_notes}\n{new_note}"
    else:
        updated_notes = new_note
    
    db_formulation.notes = updated_notes
    db_formulation.updated_by = user_uid
    db.commit()
    db.refresh(db_formulation)
    
    # Log the note addition
    log_activity(
        db=db,
        user_uid=user_uid,
        action="add_note_formulation_details",
        table_modified="formulation_details",
        field_modified="notes",
        description=f"Added note to formulation: {db_formulation.component_name}",
        new_value=note_data.note
    )
    
    return db_formulation

def delete_formulation_details(
    db: Session, 
    formulation_id: int, 
    user_uid: str,
    user_role: UserRole
) -> bool:
    """Delete a formulation detail with role-based access control"""
    
    # Only admin can delete
    if user_role != UserRole.ADMIN:
        raise PermissionError("Only administrators can delete formulation details")
    
    db_formulation = get_formulation_details_by_id(db, formulation_id)
    if not db_formulation:
        return False
    
    component_name = db_formulation.component_name
    
    # Log before deletion
    log_activity(
        db=db,
        user_uid=user_uid,
        action="delete_formulation_details",
        table_modified="formulation_details",
        description=f"Deleted formulation detail: {component_name}",
        old_value=f"ID: {formulation_id}, Component: {component_name}"
    )
    
    db.delete(db_formulation)
    db.commit()
    
    return True

def log_activity(
    db: Session,
    user_uid: str,
    action: str,
    description: str,
    table_modified: str = None,
    field_modified: str = None,
    old_value: str = None,
    new_value: str = None
):
    """Helper function to log activities"""
    # Get user ID from UID
    user = db.query(User).filter(User.uid == user_uid).first()
    user_id = user.id if user else None
    
    activity_log = ActivityLog(
        user_id=user_id,
        action=action,
        description=description,
        table_modified=table_modified,
        field_modified=field_modified,
        old_value=old_value,
        new_value=new_value
    )
    db.add(activity_log)
    db.commit() 