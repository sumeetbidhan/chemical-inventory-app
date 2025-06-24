from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.firebase_auth import get_current_user
from app.models.user import User, UserRole
from app.schema.chemical_inventory import (
    ChemicalInventoryCreate, 
    ChemicalInventoryUpdate, 
    ChemicalInventoryResponse, 
    ChemicalInventoryWithFormulations,
    ChemicalInventoryAddNote
)
from app.crud import chemical_inventory as crud_chemical_inventory
from app.crud import formulation_details as crud_formulation_details

router = APIRouter()

@router.get("/", response_model=List[ChemicalInventoryResponse])
def get_chemical_inventory(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all chemical inventory items"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    chemicals = crud_chemical_inventory.get_chemical_inventory(
        db=db, 
        skip=skip, 
        limit=limit, 
        user_role=current_user.role
    )
    return chemicals

@router.get("/{chemical_id}", response_model=ChemicalInventoryWithFormulations)
def get_chemical_inventory_by_id(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific chemical inventory item with its formulation details"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    chemical = crud_chemical_inventory.get_chemical_inventory_by_id(
        db=db, 
        chemical_id=chemical_id, 
        user_role=current_user.role
    )
    if not chemical:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chemical inventory item not found"
        )
    
    # Get formulation details
    formulation_details = crud_formulation_details.get_formulation_details_by_chemical(
        db=db, 
        chemical_id=chemical_id
    )
    
    # Create response with formulation details
    response = ChemicalInventoryWithFormulations(
        id=chemical.id,
        name=chemical.name,
        quantity=chemical.quantity,
        unit=chemical.unit,
        formulation=chemical.formulation,
        notes=chemical.notes,
        last_updated=chemical.last_updated,
        updated_by=chemical.updated_by,
        formulation_details=formulation_details
    )
    
    return response

@router.post("/", response_model=ChemicalInventoryResponse)
def create_chemical_inventory(
    chemical: ChemicalInventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chemical inventory item"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    try:
        return crud_chemical_inventory.create_chemical_inventory(
            db=db,
            chemical=chemical,
            user_uid=current_user.uid,
            user_role=current_user.role
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )

@router.patch("/{chemical_id}", response_model=ChemicalInventoryResponse)
def update_chemical_inventory(
    chemical_id: int,
    chemical_update: ChemicalInventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a chemical inventory item"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    try:
        updated_chemical = crud_chemical_inventory.update_chemical_inventory(
            db=db,
            chemical_id=chemical_id,
            chemical_update=chemical_update,
            user_uid=current_user.uid,
            user_role=current_user.role
        )
        if not updated_chemical:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chemical inventory item not found"
            )
        return updated_chemical
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )

@router.post("/{chemical_id}/notes", response_model=ChemicalInventoryResponse)
def add_note_to_chemical_inventory(
    chemical_id: int,
    note_data: ChemicalInventoryAddNote,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a note to a chemical inventory item"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    updated_chemical = crud_chemical_inventory.add_note_to_chemical_inventory(
        db=db,
        chemical_id=chemical_id,
        note_data=note_data,
        user_uid=current_user.uid,
        user_role=current_user.role
    )
    if not updated_chemical:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chemical inventory item not found"
        )
    return updated_chemical

@router.delete("/{chemical_id}")
def delete_chemical_inventory(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chemical inventory item"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    try:
        success = crud_chemical_inventory.delete_chemical_inventory(
            db=db,
            chemical_id=chemical_id,
            user_uid=current_user.uid,
            user_role=current_user.role
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chemical inventory item not found"
            )
        return {"message": "Chemical inventory item deleted successfully"}
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        ) 