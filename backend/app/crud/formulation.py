"""
CRUD operations for Formulation model
"""

from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.formulation import Formulation
from ..models.chemical import Chemical
from ..models.chemical_product import ChemicalProduct


def create_formulation(db: Session, product_id: int, component_chemical_id: int, 
                      quantity_required: float, unit: str) -> Formulation:
    """Create a new formulation"""
    # Verify the product exists
    product = db.query(ChemicalProduct).filter(ChemicalProduct.id == product_id).first()
    if not product:
        raise ValueError(f"Product with ID {product_id} does not exist")
    
    # Verify the component chemical exists
    chemical = db.query(Chemical).filter(Chemical.id == component_chemical_id).first()
    if not chemical:
        raise ValueError(f"Chemical with ID {component_chemical_id} does not exist")
    
    formulation = Formulation(
        product_id=product_id,
        component_chemical_id=component_chemical_id,
        quantity_required=quantity_required,
        unit=unit
    )
    db.add(formulation)
    db.commit()
    db.refresh(formulation)
    return formulation


def get_formulation(db: Session, formulation_id: int) -> Optional[Formulation]:
    """Get formulation by ID"""
    return db.query(Formulation).filter(Formulation.id == formulation_id).first()


def get_formulations(db: Session, skip: int = 0, limit: int = 100) -> List[Formulation]:
    """Get all formulations with pagination"""
    return db.query(Formulation).offset(skip).limit(limit).all()


def get_formulations_with_component_names(db: Session, skip: int = 0, limit: int = 100) -> List[Dict]:
    """Get all formulations with component chemical names joined"""
    from sqlalchemy.orm import joinedload
    
    # Query formulations with joined chemical data
    formulations = db.query(Formulation).options(
        joinedload(Formulation.component_chemical)
    ).offset(skip).limit(limit).all()
    
    # Convert to dictionary format with component names
    result = []
    for formulation in formulations:
        formulation_dict = {
            "id": formulation.id,
            "product_id": formulation.product_id,
            "component_chemical_id": formulation.component_chemical_id,
            "quantity_required": formulation.quantity_required,
            "unit": formulation.unit,
            "created_at": formulation.created_at,
            "component_name": formulation.component_chemical.name if formulation.component_chemical else "Unknown Chemical"
        }
        result.append(formulation_dict)
    
    return result


def get_formulations_by_product(db: Session, product_id: int) -> List[Formulation]:
    """Get all formulations for a product"""
    return db.query(Formulation).filter(Formulation.product_id == product_id).all()


def get_formulations_by_component(db: Session, component_chemical_id: int) -> List[Formulation]:
    """Get all formulations that use a specific chemical component"""
    return db.query(Formulation).filter(
        Formulation.component_chemical_id == component_chemical_id
    ).all()


def update_formulation(db: Session, formulation_id: int, **kwargs) -> Optional[Formulation]:
    """Update formulation"""
    formulation = get_formulation(db, formulation_id)
    if formulation:
        for key, value in kwargs.items():
            if hasattr(formulation, key):
                setattr(formulation, key, value)
        db.commit()
        db.refresh(formulation)
    return formulation


def delete_formulation(db: Session, formulation_id: int) -> bool:
    """Delete formulation"""
    formulation = get_formulation(db, formulation_id)
    if formulation:
        db.delete(formulation)
        db.commit()
        return True
    return False


def delete_formulations_by_product(db: Session, product_id: int) -> int:
    """Delete all formulations for a product"""
    deleted_count = db.query(Formulation).filter(
        Formulation.product_id == product_id
    ).delete()
    db.commit()
    return deleted_count


def get_formulation_details(db: Session, product_id: int) -> List[Dict]:
    """Get detailed formulation information including component names"""
    formulations = get_formulations_by_product(db, product_id)
    details = []
    
    for formulation in formulations:
        chemical = db.query(Chemical).filter(Chemical.id == formulation.component_chemical_id).first()
        component_name = chemical.name if chemical else "Unknown Chemical"
        
        details.append({
            'id': formulation.id,
            'component_chemical_id': formulation.component_chemical_id,
            'component_name': component_name,
            'quantity_required': formulation.quantity_required,
            'unit': formulation.unit
        })
    
    return details


def validate_formulation(db: Session, product_id: int, formulations: List[Dict]) -> List[str]:
    """Validate formulation data"""
    errors = []
    
    for formulation in formulations:
        component_chemical_id = formulation.get('component_chemical_id')
        quantity_required = formulation.get('quantity_required')
        
        if not component_chemical_id:
            errors.append("Component chemical ID is required")
        
        if not quantity_required or quantity_required <= 0:
            errors.append("Quantity required must be greater than 0")
        
        # Check if component chemical exists
        chemical = db.query(Chemical).filter(Chemical.id == component_chemical_id).first()
        if not chemical:
            errors.append(f"Chemical with ID {component_chemical_id} does not exist")
    
    return errors


def create_bulk_formulations(db: Session, product_id: int, formulations: List[Dict]) -> List[Formulation]:
    """Create multiple formulations for a product"""
    created_formulations = []
    
    for formulation_data in formulations:
        formulation = create_formulation(
            db=db,
            product_id=product_id,
            component_chemical_id=formulation_data['component_chemical_id'],
            quantity_required=formulation_data['quantity_required'],
            unit=formulation_data['unit']
        )
        created_formulations.append(formulation)
    
    return created_formulations


def get_formulation_summary(db: Session, product_id: int) -> Dict:
    """Get formulation summary with total quantities and proportions"""
    formulations = get_formulations_by_product(db, product_id)
    product = db.query(ChemicalProduct).filter(ChemicalProduct.id == product_id).first()
    
    if not product:
        return {}
    
    total_base_composition = product.base_composition_qty
    components = []
    total_quantity = 0
    
    for formulation in formulations:
        chemical = db.query(Chemical).filter(Chemical.id == formulation.component_chemical_id).first()
        if chemical:
            proportion = (formulation.quantity_required / total_base_composition) * 100
            components.append({
                'id': formulation.id,
                'chemical_id': formulation.component_chemical_id,
                'chemical_name': chemical.name,
                'quantity_required': formulation.quantity_required,
                'unit': formulation.unit,
                'proportion_percentage': round(proportion, 2)
            })
            total_quantity += formulation.quantity_required
    
    return {
        'product_id': product_id,
        'product_name': product.name,
        'base_composition_qty': total_base_composition,
        'unit': product.unit,
        'total_components': len(components),
        'total_quantity': total_quantity,
        'components': components
    } 