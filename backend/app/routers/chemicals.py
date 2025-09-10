"""
API routes for Chemical management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..crud.chemical import (
    create_chemical, get_chemical, get_chemicals, get_chemical_by_name,
    update_chemical, delete_chemical, update_chemical_quantity,
    search_chemicals, get_low_stock_chemicals
)
from ..schema.chemical import (
    ChemicalCreate, ChemicalUpdate, ChemicalResponse, 
    ChemicalStockSummary, ChemicalSearchResponse
)
from ..services.inventory_service import InventoryService

router = APIRouter(prefix="/chemicals", tags=["Chemicals"])


@router.post("/", response_model=ChemicalResponse)
def create_chemical_endpoint(
    chemical: ChemicalCreate,
    db: Session = Depends(get_db)
):
    """Create a new chemical"""
    # Check if chemical with same name already exists
    existing = get_chemical_by_name(db, chemical.name)
    if existing:
        raise HTTPException(status_code=400, detail="Chemical with this name already exists")
    
    return create_chemical(
        db=db,
        name=chemical.name,
        unit=chemical.unit,
        available_qty=chemical.available_qty,
        threshold_qty=chemical.threshold_qty
    )


@router.get("/", response_model=ChemicalSearchResponse)
def get_chemicals_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all chemicals with optional search"""
    if search:
        chemicals = search_chemicals(db, search, skip, limit)
        total = len(search_chemicals(db, search))  # Get total count for search
    else:
        chemicals = get_chemicals(db, skip, limit)
        total = len(get_chemicals(db))  # Get total count
    
    return ChemicalSearchResponse(
        chemicals=chemicals,
        total=total,
        page=skip // limit + 1,
        limit=limit
    )


@router.get("/{chemical_id}", response_model=ChemicalResponse)
def get_chemical_endpoint(chemical_id: int, db: Session = Depends(get_db)):
    """Get a specific chemical by ID"""
    chemical = get_chemical(db, chemical_id)
    
    if not chemical:
        raise HTTPException(status_code=404, detail="Chemical not found")
    
    return chemical


@router.put("/{chemical_id}", response_model=ChemicalResponse)
def update_chemical_endpoint(
    chemical_id: int,
    chemical_update: ChemicalUpdate,
    db: Session = Depends(get_db)
):
    """Update a chemical"""
    # Check if chemical exists
    existing = get_chemical(db, chemical_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Chemical not found")
    
    # Check if name is being updated and if it conflicts
    if chemical_update.name and chemical_update.name != existing.name:
        name_conflict = get_chemical_by_name(db, chemical_update.name)
        if name_conflict:
            raise HTTPException(status_code=400, detail="Chemical with this name already exists")
    
    updated_chemical = update_chemical(db, chemical_id, **chemical_update.dict(exclude_unset=True))
    return updated_chemical


@router.delete("/{chemical_id}")
def delete_chemical_endpoint(chemical_id: int, db: Session = Depends(get_db)):
    """Delete a chemical"""
    success = delete_chemical(db, chemical_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chemical not found")
    
    return {"message": "Chemical deleted successfully"}


@router.get("/stock/summary", response_model=List[ChemicalStockSummary])
def get_stock_summary(db: Session = Depends(get_db)):
    """Get summary of all chemical stocks"""
    service = InventoryService(db)
    return service.get_chemical_stock_summary()


@router.get("/stock/low", response_model=List[ChemicalResponse])
def get_low_stock_chemicals_endpoint(db: Session = Depends(get_db)):
    """Get chemicals with low stock"""
    return get_low_stock_chemicals(db)


@router.post("/{chemical_id}/stock/update")
def update_stock_endpoint(
    chemical_id: int,
    quantity_change: float,
    db: Session = Depends(get_db)
):
    """Update chemical stock quantity (manual adjustment)"""
    chemical = update_chemical_quantity(db, chemical_id, quantity_change)
    if not chemical:
        raise HTTPException(status_code=404, detail="Chemical not found")
    
    return {
        "message": f"Stock updated successfully",
        "chemical_id": chemical_id,
        "new_quantity": chemical.available_qty,
        "quantity_change": quantity_change
    } 