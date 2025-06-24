from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from app.models.chemical_inventory import ChemicalInventory
from app.models.activity_log import ActivityLog
from app.models.user import User, UserRole
from app.schema.chemical_inventory import ChemicalInventoryCreate, ChemicalInventoryUpdate, ChemicalInventoryAddNote
from datetime import datetime

def get_chemical_inventory(db: Session, skip: int = 0, limit: int = 100, user_role: UserRole = None) -> List[ChemicalInventory]:
    """Get all chemical inventory items with role-based filtering"""
    query = db.query(ChemicalInventory)
    
    # Apply role-based filtering if specified
    if user_role == UserRole.ALL_USERS:
        # All users can see everything (read-only)
        pass
    elif user_role in [UserRole.ADMIN, UserRole.LAB_STAFF, UserRole.PRODUCT, UserRole.ACCOUNT]:
        # These roles can see everything
        pass
    
    return query.offset(skip).limit(limit).all()

def get_chemical_inventory_by_id(db: Session, chemical_id: int, user_role: UserRole = None) -> Optional[ChemicalInventory]:
    """Get a specific chemical inventory item by ID"""
    return db.query(ChemicalInventory).filter(ChemicalInventory.id == chemical_id).first()

def create_chemical_inventory(
    db: Session, 
    chemical: ChemicalInventoryCreate, 
    user_uid: str,
    user_role: UserRole
) -> ChemicalInventory:
    """Create a new chemical inventory item with role-based access control"""
    
    # Check permissions
    if user_role not in [UserRole.ADMIN, UserRole.LAB_STAFF, UserRole.PRODUCT]:
        raise PermissionError("Insufficient permissions to create chemical inventory")
    
    db_chemical = ChemicalInventory(
        **chemical.dict(),
        updated_by=user_uid
    )
    db.add(db_chemical)
    db.commit()
    db.refresh(db_chemical)
    
    # Log the activity
    log_activity(
        db=db,
        user_uid=user_uid,
        action="create_chemical_inventory",
        table_modified="chemical_inventory",
        description=f"Created chemical inventory item: {chemical.name}",
        new_value=f"ID: {db_chemical.id}, Name: {chemical.name}, Quantity: {chemical.quantity} {chemical.unit}"
    )
    
    return db_chemical

def update_chemical_inventory(
    db: Session, 
    chemical_id: int, 
    chemical_update: ChemicalInventoryUpdate, 
    user_uid: str,
    user_role: UserRole
) -> Optional[ChemicalInventory]:
    """Update a chemical inventory item with role-based access control"""
    
    db_chemical = get_chemical_inventory_by_id(db, chemical_id)
    if not db_chemical:
        return None
    
    # Get old values for logging
    old_values = {
        "name": db_chemical.name,
        "quantity": db_chemical.quantity,
        "unit": db_chemical.unit,
        "formulation": db_chemical.formulation,
        "notes": db_chemical.notes
    }
    
    # Apply role-based update restrictions
    update_data = chemical_update.dict(exclude_unset=True)
    
    if user_role == UserRole.ADMIN:
        # Admin can update everything
        pass
    elif user_role in [UserRole.LAB_STAFF, UserRole.PRODUCT]:
        # Lab Staff and Product can update: quantity, formulation, notes
        allowed_fields = {"quantity", "formulation", "notes"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    elif user_role == UserRole.ACCOUNT:
        # Account can only update amounts (quantity) and notes
        allowed_fields = {"quantity", "notes"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    else:
        raise PermissionError("Insufficient permissions to update chemical inventory")
    
    if not update_data:
        return db_chemical
    
    # Update fields
    for field, value in update_data.items():
        setattr(db_chemical, field, value)
    
    db_chemical.updated_by = user_uid
    db.commit()
    db.refresh(db_chemical)
    
    # Log changes
    for field, new_value in update_data.items():
        old_value = old_values.get(field)
        if old_value != new_value:
            log_activity(
                db=db,
                user_uid=user_uid,
                action="update_chemical_inventory",
                table_modified="chemical_inventory",
                field_modified=field,
                description=f"Updated {field} for chemical: {db_chemical.name}",
                old_value=str(old_value),
                new_value=str(new_value)
            )
    
    return db_chemical

def add_note_to_chemical_inventory(
    db: Session, 
    chemical_id: int, 
    note_data: ChemicalInventoryAddNote, 
    user_uid: str,
    user_role: UserRole
) -> Optional[ChemicalInventory]:
    """Add a note to a chemical inventory item (append-only)"""
    
    db_chemical = get_chemical_inventory_by_id(db, chemical_id)
    if not db_chemical:
        return None
    
    # All users can add notes
    current_notes = db_chemical.notes or ""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_note = f"[{timestamp}] {note_data.note}"
    
    if current_notes:
        updated_notes = f"{current_notes}\n{new_note}"
    else:
        updated_notes = new_note
    
    db_chemical.notes = updated_notes
    db_chemical.updated_by = user_uid
    db.commit()
    db.refresh(db_chemical)
    
    # Log the note addition
    log_activity(
        db=db,
        user_uid=user_uid,
        action="add_note_chemical_inventory",
        table_modified="chemical_inventory",
        field_modified="notes",
        description=f"Added note to chemical: {db_chemical.name}",
        new_value=note_data.note
    )
    
    return db_chemical

def delete_chemical_inventory(
    db: Session, 
    chemical_id: int, 
    user_uid: str,
    user_role: UserRole
) -> bool:
    """Delete a chemical inventory item with role-based access control"""
    
    # Only admin can delete
    if user_role != UserRole.ADMIN:
        raise PermissionError("Only administrators can delete chemical inventory items")
    
    db_chemical = get_chemical_inventory_by_id(db, chemical_id)
    if not db_chemical:
        return False
    
    chemical_name = db_chemical.name
    
    # Log before deletion
    log_activity(
        db=db,
        user_uid=user_uid,
        action="delete_chemical_inventory",
        table_modified="chemical_inventory",
        description=f"Deleted chemical inventory item: {chemical_name}",
        old_value=f"ID: {chemical_id}, Name: {chemical_name}"
    )
    
    db.delete(db_chemical)
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