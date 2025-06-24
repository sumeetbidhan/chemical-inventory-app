from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.firebase_auth import get_current_user
from app.models.user import User, UserRole
from app.schema.formulation_details import (
    FormulationDetailsCreate, 
    FormulationDetailsUpdate, 
    FormulationDetailsResponse,
    FormulationDetailsAddNote
)
from app.crud import formulation_details as crud_formulation_details

router = APIRouter()

@router.get("/", response_model=List[FormulationDetailsResponse])
def get_formulation_details(
    skip: int = 0,
    limit: int = 100,
    chemical_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all formulation details with optional chemical filtering"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    formulations = crud_formulation_details.get_formulation_details(
        db=db, 
        skip=skip, 
        limit=limit, 
        chemical_id=chemical_id
    )
    return formulations

@router.get("/{formulation_id}", response_model=FormulationDetailsResponse)
def get_formulation_details_by_id(
    formulation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific formulation detail by ID"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    formulation = crud_formulation_details.get_formulation_details_by_id(
        db=db, 
        formulation_id=formulation_id
    )
    if not formulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulation detail not found"
        )
    return formulation

@router.get("/chemical/{chemical_id}", response_model=List[FormulationDetailsResponse])
def get_formulation_details_by_chemical(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all formulation details for a specific chemical"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    formulations = crud_formulation_details.get_formulation_details_by_chemical(
        db=db, 
        chemical_id=chemical_id
    )
    return formulations

@router.post("/", response_model=FormulationDetailsResponse)
def create_formulation_details(
    formulation: FormulationDetailsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new formulation detail"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    try:
        return crud_formulation_details.create_formulation_details(
            db=db,
            formulation=formulation,
            user_uid=current_user.uid,
            user_role=current_user.role
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/{formulation_id}", response_model=FormulationDetailsResponse)
def update_formulation_details(
    formulation_id: int,
    formulation_update: FormulationDetailsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a formulation detail"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    try:
        updated_formulation = crud_formulation_details.update_formulation_details(
            db=db,
            formulation_id=formulation_id,
            formulation_update=formulation_update,
            user_uid=current_user.uid,
            user_role=current_user.role
        )
        if not updated_formulation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Formulation detail not found"
            )
        return updated_formulation
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )

@router.post("/{formulation_id}/notes", response_model=FormulationDetailsResponse)
def add_note_to_formulation_details(
    formulation_id: int,
    note_data: FormulationDetailsAddNote,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a note to a formulation detail"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    updated_formulation = crud_formulation_details.add_note_to_formulation_details(
        db=db,
        formulation_id=formulation_id,
        note_data=note_data,
        user_uid=current_user.uid,
        user_role=current_user.role
    )
    if not updated_formulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulation detail not found"
        )
    return updated_formulation

@router.delete("/{formulation_id}")
def delete_formulation_details(
    formulation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a formulation detail"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved"
        )
    
    try:
        success = crud_formulation_details.delete_formulation_details(
            db=db,
            formulation_id=formulation_id,
            user_uid=current_user.uid,
            user_role=current_user.role
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Formulation detail not found"
            )
        return {"message": "Formulation detail deleted successfully"}
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        ) 