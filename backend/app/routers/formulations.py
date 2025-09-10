"""
API routes for Formulation management
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io

from ..database import get_db
from ..firebase_auth import get_current_user
from ..models.user import User
from ..crud.formulation import (
    create_formulation, get_formulation, get_formulations, get_formulations_with_component_names,
    get_formulations_by_product, get_formulations_by_component, update_formulation, delete_formulation
)
from ..schema.formulation import (
    FormulationCreate, FormulationUpdate, FormulationResponse, FormulationDetail
)

router = APIRouter(prefix="/formulations", tags=["Formulations"])


@router.get("/", response_model=List[FormulationResponse])
def get_formulations_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all formulations with pagination"""
    return get_formulations_with_component_names(db, skip=skip, limit=limit)


@router.get("/chemical/{chemical_id}", response_model=List[FormulationResponse])
def get_formulations_by_chemical_endpoint(
    chemical_id: int,
    db: Session = Depends(get_db)
):
    """Get all formulations that use a specific chemical"""
    from ..models import ComponentType
    return get_formulations_by_component(db, ComponentType.CHEMICAL, chemical_id)


@router.get("/{formulation_id}", response_model=FormulationResponse)
def get_formulation_endpoint(formulation_id: int, db: Session = Depends(get_db)):
    """Get a specific formulation by ID"""
    formulation = get_formulation(db, formulation_id)
    
    if not formulation:
        raise HTTPException(status_code=404, detail="Formulation not found")
    
    return formulation


@router.post("/", response_model=FormulationResponse)
def create_formulation_endpoint(
    formulation: FormulationCreate,
    db: Session = Depends(get_db)
):
    """Create a new formulation"""
    return create_formulation(
        db=db,
        product_id=formulation.product_id,
        component_chemical_id=formulation.component_chemical_id,
        quantity_required=formulation.quantity_required,
        unit=formulation.unit
    )


@router.put("/{formulation_id}", response_model=FormulationResponse)
def update_formulation_endpoint(
    formulation_id: int,
    formulation_update: FormulationUpdate,
    db: Session = Depends(get_db)
):
    """Update a formulation"""
    # Check if formulation exists
    existing = get_formulation(db, formulation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Formulation not found")
    
    updated_formulation = update_formulation(db, formulation_id, **formulation_update.dict(exclude_unset=True))
    return updated_formulation


@router.delete("/{formulation_id}")
def delete_formulation_endpoint(formulation_id: int, db: Session = Depends(get_db)):
    """Delete a formulation"""
    success = delete_formulation(db, formulation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Formulation not found")
    
    return {"message": "Formulation deleted successfully"}


@router.get("/product/{product_id}", response_model=List[FormulationResponse])
def get_formulations_by_product_endpoint(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get all formulations for a specific product"""
    return get_formulations_by_product(db, product_id)


# Lab Staff Formulation Creation Endpoints
@router.post("/create-lab")
def create_formulation_lab(
    formulation_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lab staff creates a new formulation (requires admin review)"""
    try:
        # Check if user is lab staff
        if current_user.role_id != 2:  # LAB_STAFF role ID
            raise HTTPException(status_code=403, detail="Only lab staff can create formulations")
        
        # Extract data from request
        product_name = formulation_data.get('product_name')
        base_composition_qty = formulation_data.get('base_composition_qty')
        unit = formulation_data.get('unit', 'g')
        components = formulation_data.get('components', [])
        
        if not product_name or not base_composition_qty or not components:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Create chemical product first
        from ..models.chemical_product import ChemicalProduct
        from ..models.chemical import Chemical
        from ..models.formulation import Formulation
        
        # Check if product already exists
        existing_product = db.query(ChemicalProduct).filter(
            ChemicalProduct.name == product_name
        ).first()
        
        if existing_product:
            product_id = existing_product.id
        else:
            # Create new product
            new_product = ChemicalProduct(
                name=product_name,
                base_composition_qty=float(base_composition_qty),
                unit=unit,
                created_by_user_id=current_user.id,
                is_approved=True  # No approval required, immediately available
            )
            db.add(new_product)
            db.commit()
            db.refresh(new_product)
            product_id = new_product.id
        
        # Create formulations for each component
        created_formulations = []
        for component in components:
            code = component.get('code', '').strip()
            quantity = component.get('quantity', 0)
            comp_unit = component.get('unit', 'g')
            
            if not code or not quantity:
                continue
                
            # Check if chemical exists, create if not
            chemical = db.query(Chemical).filter(Chemical.code == code).first()
            if not chemical:
                chemical = Chemical(
                    code=code,
                    name=f"Chemical {code}",
                    quantity_available=0,
                    unit=comp_unit,
                    is_manufactured=False,
                    added_by_user_id=current_user.id
                )
                db.add(chemical)
                db.commit()
                db.refresh(chemical)
            
            # Create formulation
            formulation = Formulation(
                product_id=product_id,
                component_chemical_id=chemical.id,
                quantity_required=float(quantity),
                unit=comp_unit,
                created_by_user_id=current_user.id,
                is_approved=True  # No approval required, immediately available
            )
            db.add(formulation)
            created_formulations.append(formulation)
        
        db.commit()
        
        return {
            "message": "Formulation created successfully and is now available",
            "product_id": product_id,
            "formulations_created": len(created_formulations),
            "status": "available"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create formulation: {str(e)}")


@router.post("/preview-excel-lab")
async def preview_excel_lab(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Lab staff previews Excel file before creating formulations"""
    try:
        # Check if user is lab staff
        if current_user.role_id != 2:  # LAB_STAFF role ID
            raise HTTPException(status_code=403, detail="Only lab staff can upload formulations")
        
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Validate Excel format
        required_columns = ['Product Name', 'Base Composition Qty', 'Unit', 'Chemical Code', 'Quantity', 'Component Unit']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"Excel file must contain columns: {', '.join(required_columns)}"
            )
        
        # Group by product and prepare preview data
        products = df.groupby(['Product Name', 'Base Composition Qty', 'Unit'])
        preview_data = []
        
        for (product_name, base_qty, unit), group in products:
            components = []
            for _, row in group.iterrows():
                code = str(row['Chemical Code']).strip()
                quantity = float(row['Quantity'])
                comp_unit = str(row['Component Unit']).strip()
                
                if code and quantity > 0:
                    components.append({
                        'code': code,
                        'quantity': quantity,
                        'unit': comp_unit
                    })
            
            if components:
                preview_data.append({
                    'product_name': product_name,
                    'base_composition_qty': float(base_qty),
                    'unit': unit,
                    'components': components
                })
        
        return {
            "message": "Excel file parsed successfully",
            "preview_data": preview_data,
            "total_products": len(preview_data),
            "total_components": sum(len(p['components']) for p in preview_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Excel file: {str(e)}")


@router.post("/confirm-excel-lab")
def confirm_excel_lab(
    excel_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lab staff confirms and creates formulations from Excel preview data"""
    try:
        # Check if user is lab staff
        if current_user.role_id != 2:  # LAB_STAFF role ID
            raise HTTPException(status_code=403, detail="Only lab staff can create formulations")
        
        preview_data = excel_data.get('preview_data', [])
        if not preview_data:
            raise HTTPException(status_code=400, detail="No preview data provided")
        
        created_products = 0
        created_formulations = 0
        
        for product_data in preview_data:
            product_name = product_data['product_name']
            base_qty = product_data['base_composition_qty']
            unit = product_data['unit']
            components = product_data['components']
            
            # Create or get product
            from ..models.chemical_product import ChemicalProduct
            from ..models.chemical import Chemical
            from ..models.formulation import Formulation
            
            existing_product = db.query(ChemicalProduct).filter(
                ChemicalProduct.name == product_name
            ).first()
            
            if existing_product:
                product_id = existing_product.id
            else:
                new_product = ChemicalProduct(
                    name=product_name,
                    base_composition_qty=float(base_qty),
                    unit=unit,
                    created_by_user_id=current_user.id,
                    is_approved=True  # No approval required, immediately available
                )
                db.add(new_product)
                db.commit()
                db.refresh(new_product)
                product_id = new_product.id
                created_products += 1
            
            # Create formulations for components
            for component in components:
                code = component['code']
                quantity = component['quantity']
                comp_unit = component['unit']
                
                # Create or get chemical
                chemical = db.query(Chemical).filter(Chemical.code == code).first()
                if not chemical:
                    chemical = Chemical(
                        code=code,
                        name=f"Chemical {code}",
                        quantity_available=0,
                        unit=comp_unit,
                        is_manufactured=False,
                        added_by_user_id=current_user.id
                    )
                    db.add(chemical)
                    db.commit()
                    db.refresh(chemical)
                
                # Create formulation
                formulation = Formulation(
                    product_id=product_id,
                    component_chemical_id=chemical.id,
                    quantity_required=quantity,
                    unit=comp_unit,
                    created_by_user_id=current_user.id,
                    is_approved=True  # No approval required, immediately available
                )
                db.add(formulation)
                created_formulations += 1
        
        db.commit()
        
        return {
            "message": "Excel file processed successfully and formulations are now available",
            "products_created": created_products,
            "formulations_created": created_formulations,
            "status": "available"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process Excel file: {str(e)}")




