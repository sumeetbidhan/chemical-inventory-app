"""
API routes for Manufacturing operations
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..services.inventory_service import InventoryService
from ..services.unit_converter import UnitConverter
from ..crud.chemical_product import get_chemical_product
from ..crud.formulation import get_formulation_summary
from ..firebase_auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/manufacturing", tags=["Manufacturing"])


@router.get("/feasibility/{product_id}")
def check_manufacturing_feasibility(
    product_id: int,
    target_quantity: float = Query(..., description="Quantity to manufacture (e.g., 2.0 for 2kg)"),
    target_unit: str = Query(..., description="Unit of the target quantity (e.g., 'kg', 'g', 'l')"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if manufacturing a product is feasible with current stock"""
    
    try:
        inventory_service = InventoryService(db)
        feasibility = inventory_service.check_manufacturing_feasibility(product_id, target_quantity, target_unit)
        
        if not feasibility.get("feasible") and "error" in feasibility:
            raise HTTPException(status_code=400, detail=feasibility["error"])
        
        return feasibility
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check feasibility: {str(e)}")


@router.post("/manufacture/{product_id}")
def manufacture_product(
    product_id: int,
    target_quantity: float = Query(..., description="Quantity to manufacture (e.g., 2.0 for 2kg)"),
    target_unit: str = Query(..., description="Unit of the target quantity (e.g., 'kg', 'g', 'l')"),
    note: Optional[str] = Query(None, description="Additional notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manufacture a chemical product using its formulation with automatic unit conversion"""
    
    try:
        inventory_service = InventoryService(db)
        result = inventory_service.manufacture_product(
            product_id=product_id,
            target_quantity=target_quantity,
            target_unit=target_unit,
            manufactured_by=current_user.id,
            note=note
        )
        
        return {
            "success": True,
            "message": f"Successfully manufactured {result['quantity_produced']}{target_unit} of {result['product_name']}",
            "result": result
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manufacturing failed: {str(e)}")


@router.get("/summary/{product_id}")
def get_manufacturing_summary(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get manufacturing summary for a product"""
    
    try:
        inventory_service = InventoryService(db)
        summary = inventory_service.get_manufacturing_summary(product_id)
        
        if not summary:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get manufacturing summary: {str(e)}")


@router.get("/formulation/{product_id}")
def get_formulation_details(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed formulation information for a product"""
    
    try:
        summary = get_formulation_summary(db, product_id)
        
        if not summary:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get formulation details: {str(e)}")


@router.get("/products")
def get_manufacturable_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all products that can be manufactured"""
    
    try:
        # Get all chemical products (these are the ones that can be manufactured)
        from ..crud.chemical_product import get_chemical_products
        
        products = get_chemical_products(db, skip=skip, limit=limit)
        
        # Add manufacturing information for each product
        inventory_service = InventoryService(db)
        enhanced_products = []
        
        for product in products:
            try:
                # Check feasibility for 1x base composition
                feasibility = inventory_service.check_manufacturing_feasibility(
                    product.id, 
                    product.base_composition_qty, 
                    product.unit
                )
                enhanced_products.append({
                    "id": product.id,
                    "name": product.name,
                    "base_composition_qty": product.base_composition_qty,
                    "unit": product.unit,
                    "note": product.note,
                    "created_by": product.created_by,
                    "created_at": product.created_at,
                    "last_updated": product.last_updated,
                    "can_manufacture_1x": feasibility.get("feasible", False),
                    "insufficient_components": len(feasibility.get("insufficient_components", [])),
                    "unit_conversion_supported": True,
                    "supported_units": UnitConverter.get_common_units(UnitConverter.get_unit_type(product.unit))
                })
            except:
                # If feasibility check fails, still include the product
                enhanced_products.append({
                    "id": product.id,
                    "name": product.name,
                    "base_composition_qty": product.base_composition_qty,
                    "unit": product.unit,
                    "note": product.note,
                    "created_by": product.created_by,
                    "created_at": product.created_at,
                    "last_updated": product.last_updated,
                    "can_manufacture_1x": False,
                    "insufficient_components": 0,
                    "unit_conversion_supported": True,
                    "supported_units": UnitConverter.get_common_units(UnitConverter.get_unit_type(product.unit))
                })
        
        return {
            "products": enhanced_products,
            "total": len(enhanced_products),
            "page": skip // limit + 1,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get manufacturable products: {str(e)}")


@router.get("/stock-status")
def get_manufacturing_stock_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall stock status for manufacturing operations"""
    
    try:
        from ..crud.chemical import get_low_stock_chemicals, get_chemicals
        
        all_chemicals = get_chemicals(db, skip=0, limit=1000)
        low_stock_chemicals = get_low_stock_chemicals(db)
        
        stock_summary = {
            "total_chemicals": len(all_chemicals),
            "low_stock_chemicals": len(low_stock_chemicals),
            "low_stock_details": [
                {
                    "id": chem.id,
                    "name": chem.name,
                    "available_qty": chem.available_qty,
                    "threshold_qty": chem.threshold_qty,
                    "unit": chem.unit,
                    "is_manufactured": chem.is_manufactured
                }
                for chem in low_stock_chemicals
            ],
            "stock_overview": {
                "raw_chemicals": len([c for c in all_chemicals if not c.is_manufactured]),
                "manufactured_chemicals": len([c for c in all_chemicals if c.is_manufactured]),
                "total_available": sum(c.available_qty for c in all_chemicals),
                "total_threshold": sum(c.threshold_qty for c in all_chemicals)
            }
        }
        
        return stock_summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stock status: {str(e)}")
