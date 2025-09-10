"""
API routes for Chemical Product management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..crud.chemical_product import (
    create_chemical_product, get_chemical_product, get_chemical_products, 
    get_chemical_product_by_name, update_chemical_product, delete_chemical_product,
    get_chemical_products_by_creator, search_chemical_products
)
from ..crud.formulation import (
    create_formulation, get_formulation, get_formulations, get_formulations_by_product,
    update_formulation, delete_formulation, get_formulation_details, validate_formulation
)
from ..schema.chemical_product import (
    ChemicalProductCreate, ChemicalProductUpdate, ChemicalProductResponse,
    ChemicalProductWithFormulations, ChemicalProductSearchResponse
)
from ..schema.formulation import FormulationBulkCreate, FormulationValidationResponse

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("/", response_model=ChemicalProductResponse)
def create_product_endpoint(
    product: ChemicalProductCreate,
    db: Session = Depends(get_db)
):
    """Create a new chemical product"""
    # Check if product with same name already exists
    existing = get_chemical_product_by_name(db, product.name)
    if existing:
        raise HTTPException(status_code=400, detail="Product with this name already exists")
    
    return create_chemical_product(
        db=db,
        chemical_id=product.chemical_id,
        name=product.name,
        base_composition_qty=product.base_composition_qty,
        unit=product.unit,
        created_by=product.created_by,
        note=product.note
    )


@router.get("/", response_model=ChemicalProductSearchResponse)
def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    created_by: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all products with optional search and filtering"""
    try:
        print(f"🔍 get_products called with skip={skip}, limit={limit}, search={search}, created_by={created_by}")
        
        if created_by:
            products = get_chemical_products_by_creator(db, created_by, skip, limit)
            total = len(get_chemical_products_by_creator(db, created_by))
        elif search:
            products = search_chemical_products(db, search, skip, limit)
            total = len(search_chemical_products(db, search))
        else:
            products = get_chemical_products(db, skip, limit)
            total = len(get_chemical_products(db))
        
        print(f"📦 Found {len(products)} products, total: {total}")
        
        response = ChemicalProductSearchResponse(
            products=products,
            total=total,
            page=skip // limit + 1,
            limit=limit
        )
        print(f"✅ Response created successfully")
        return response
        
    except Exception as e:
        print(f"❌ Error in get_products: {e}")
        print(f"🔍 Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{product_id}", response_model=ChemicalProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get a specific product by ID"""
    product = get_chemical_product(db, product_id)
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product


@router.get("/{product_id}/with-formulations", response_model=ChemicalProductWithFormulations)
def get_product_with_formulations(product_id: int, db: Session = Depends(get_db)):
    """Get a product with its formulations"""
    product = get_chemical_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    formulations = get_formulations_by_product(db, product_id)
    
    # Create response with formulations
    response = ChemicalProductWithFormulations(
        id=product.id,
        chemical_id=product.chemical_id,
        name=product.name,
        base_composition_qty=product.base_composition_qty,
        unit=product.unit,
        note=product.note,
        created_by=product.created_by,
        created_by_name=None,  # Will need to be populated if user info is available
        last_updated=product.last_updated,
        created_at=product.created_at,
        formulations=formulations
    )
    
    return response


@router.put("/{product_id}", response_model=ChemicalProductResponse)
def update_product(
    product_id: int,
    product_update: ChemicalProductUpdate,
    db: Session = Depends(get_db)
):
    """Update a product"""
    # Check if product exists
    existing = get_chemical_product(db, product_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if name is being updated and if it conflicts
    if product_update.name and product_update.name != existing.name:
        name_conflict = get_chemical_product_by_name(db, product_update.name)
        if name_conflict:
            raise HTTPException(status_code=400, detail="Product with this name already exists")
    
    updated_product = update_chemical_product(db, product_id, **product_update.dict(exclude_unset=True))
    return updated_product


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product and its formulations"""
    try:
        # Check if product exists
        product = get_chemical_product(db, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        print(f"🗑️ Deleting product: {product.name} (ID: {product_id})")
        
        # Step 1: Delete all formulations linked to this product
        from ..crud.formulation import delete_formulations_by_product
        deleted_formulations = delete_formulations_by_product(db, product_id)
        print(f"🗑️ Deleted {deleted_formulations} formulations for product {product_id}")
        
        # Step 2: Delete the chemical product itself
        success = delete_chemical_product(db, product_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete product")
        
        print(f"✅ Successfully deleted product {product_id} and {deleted_formulations} formulations")
        
        return {
            "message": "Product and all linked formulations deleted successfully",
            "deleted_formulations": deleted_formulations,
            "product_id": product_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting product {product_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{product_id}/formulations", response_model=FormulationValidationResponse)
def validate_formulations(
    product_id: int,
    formulations: FormulationBulkCreate,
    db: Session = Depends(get_db)
):
    """Validate formulations for a product"""
    # Validate the formulations
    errors = validate_formulation(db, product_id, formulations.formulations)
    
    if errors:
        return FormulationValidationResponse(
            is_valid=False,
            errors=errors
        )
    
    # Get formulation details for response
    formulation_details = []
    for formulation in formulations.formulations:
        # This would need to be enhanced to get component names
        formulation_details.append({
            'id': 0,  # Will be assigned when created
            'component_type': formulation.component_type,
            'component_id': formulation.component_id,
            'component_name': f"Component {formulation.component_id}",  # Would need to fetch actual name
            'quantity_required': formulation.quantity_required,
            'unit': formulation.unit
        })
    
    return FormulationValidationResponse(
        is_valid=True,
        formulations=formulation_details
    )


@router.post("/{product_id}/formulations/bulk")
def create_formulations_bulk(
    product_id: int,
    formulations: FormulationBulkCreate,
    db: Session = Depends(get_db)
):
    """Create multiple formulations for a product"""
    # Validate the formulations first
    errors = validate_formulation(db, product_id, formulations.formulations)
    if errors:
        raise HTTPException(status_code=400, detail=f"Validation errors: {errors}")
    
    # Create each formulation
    created_formulations = []
    for formulation in formulations.formulations:
        created = create_formulation(
            db=db,
            product_id=product_id,
            component_chemical_id=formulation.component_id,
            quantity_required=formulation.quantity_required,
            unit=formulation.unit
        )
        created_formulations.append(created)
    
    return {
        "message": f"Created {len(created_formulations)} formulations",
        "formulations": created_formulations
    } 