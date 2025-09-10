"""
Inventory Service for Chemical Inventory System
Handles stock tracking, formulations, and manufacturing operations
"""

from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import json
from datetime import datetime

from ..models import (
    Chemical, ChemicalProduct, Formulation, StockMovement, 
    Purchase, Alert, Notification, ActivityLog, User
)
from ..models.stock_movement import ChangeType
from .unit_converter import UnitConverter, smart_convert


class InventoryService:
    def __init__(self, db: Session):
        self.db = db
    
    def add_purchase(self, chemical_id: int, quantity: float, unit: str, 
                    amount: Optional[float], purchase_date: datetime, 
                    added_by: int, note: Optional[str] = None) -> Purchase:
        """Add a new purchase and update stock"""
        
        # Create purchase record
        purchase = Purchase(
            chemical_id=chemical_id,
            quantity_purchased=quantity,
            unit=unit,
            amount=amount,
            purchase_date=purchase_date,
            added_by=added_by,
            note=note
        )
        self.db.add(purchase)
        self.db.flush()  # Get the ID
        
        # Update chemical stock
        chemical = self.db.query(Chemical).filter(Chemical.id == chemical_id).first()
        if chemical:
            chemical.available_qty += quantity
            chemical.last_purchase = purchase_date
            chemical.updated_at = datetime.utcnow()
        
        # Record stock movement
        stock_movement = StockMovement(
            chemical_id=chemical_id,
            change_type=ChangeType.INCREASE,
            quantity_changed=quantity,
            unit=unit,
            action="Purchase",
            reference_id=purchase.id,
            reference_type="purchase"
        )
        self.db.add(stock_movement)
        
        # Log activity
        self._log_activity(
            user_id=added_by,
            action="PURCHASE",
            description=f"Purchased {quantity}{unit} of {chemical.name if chemical else 'Unknown Chemical'}",
            new_value={
                "purchase_id": purchase.id,
                "quantity": quantity,
                "unit": unit,
                "amount": amount
            }
        )
        
        self.db.commit()
        return purchase
    
    def manufacture_product(self, product_id: int, target_quantity: float, target_unit: str,
                          manufactured_by: int, note: Optional[str] = None) -> Dict:
        """
        Manufacture a chemical product using its formulation with automatic unit conversion
        
        Args:
            product_id: ID of the product to manufacture
            target_quantity: Quantity to manufacture (e.g., 2.0 for 2kg)
            target_unit: Unit of the target quantity (e.g., 'kg', 'g', 'l')
            manufactured_by: User ID who is manufacturing
            note: Optional note about the manufacturing
        """
        
        # Get the product and its formulations
        product = self.db.query(ChemicalProduct).filter(ChemicalProduct.id == product_id).first()
        if not product:
            raise ValueError(f"Product with ID {product_id} not found")
        
        formulations = self.db.query(Formulation).filter(Formulation.product_id == product_id).all()
        if not formulations:
            raise ValueError(f"No formulations found for product {product.name}")
        
        # Convert target quantity to base unit for calculations
        try:
            target_in_base_unit, base_unit = UnitConverter.convert_to_base_unit(target_quantity, target_unit)
            base_composition_in_base_unit, _ = UnitConverter.convert_to_base_unit(product.base_composition_qty, product.unit)
            
            # Calculate scale factor based on base units
            scale_factor = target_in_base_unit / base_composition_in_base_unit
            
        except ValueError as e:
            raise ValueError(f"Unit conversion error: {e}. Cannot convert {target_unit} to {product.unit}")
        
        # Calculate required quantities for each component
        required_quantities = {}
        insufficient_stock = []
        
        for formulation in formulations:
            chemical = self.db.query(Chemical).filter(Chemical.id == formulation.component_chemical_id).first()
            if not chemical:
                raise ValueError(f"Chemical with ID {formulation.component_chemical_id} not found")
            
            # Convert formulation unit to chemical's unit if different
            try:
                if formulation.unit.lower() != chemical.unit.lower():
                    required_qty_in_chem_unit = smart_convert(
                        formulation.quantity_required * scale_factor, 
                        formulation.unit, 
                        chemical.unit
                    )
                else:
                    required_qty_in_chem_unit = formulation.quantity_required * scale_factor
            except ValueError as e:
                raise ValueError(f"Cannot convert {formulation.unit} to {chemical.unit} for {chemical.name}: {e}")
            
                required_quantities[chemical.id] = {
                    'chemical': chemical,
                'required': required_qty_in_chem_unit,
                'unit': chemical.unit,
                'original_required': formulation.quantity_required * scale_factor,
                'original_unit': formulation.unit
            }
            
            if chemical.available_qty < required_qty_in_chem_unit:
                    insufficient_stock.append({
                        'chemical_name': chemical.name,
                        'available': chemical.available_qty,
                    'required': required_qty_in_chem_unit,
                    'required_unit': chemical.unit
                })
        
        # Check if we have sufficient stock
        if insufficient_stock:
            raise ValueError(f"Insufficient stock for manufacturing: {insufficient_stock}")
        
        # Deduct stock for all components
        stock_movements = []
        for chem_id, req_data in required_quantities.items():
            chemical = req_data['chemical']
            required_qty = req_data['required']
            
            # Update chemical stock
            chemical.available_qty -= required_qty
            chemical.updated_at = datetime.utcnow()
            
            # Record stock movement
            stock_movement = StockMovement(
                chemical_id=chem_id,
                change_type=ChangeType.DECREASE,
                quantity_changed=required_qty,
                unit=req_data['unit'],
                action="Manufacturing Consumption",
                reference_id=product_id,
                reference_type="manufacturing"
            )
            self.db.add(stock_movement)
            stock_movements.append(stock_movement)
        
        # Produce the manufactured chemical
        manufactured_chemical = self.db.query(Chemical).filter(Chemical.id == product.chemical_id).first()
        if manufactured_chemical:
            # Convert produced quantity to chemical's unit
            try:
                if product.unit.lower() != manufactured_chemical.unit.lower():
                    produced_qty = smart_convert(
                        product.base_composition_qty * scale_factor,
                        product.unit,
                        manufactured_chemical.unit
                    )
                else:
                    produced_qty = product.base_composition_qty * scale_factor
            except ValueError as e:
                raise ValueError(f"Cannot convert {product.unit} to {manufactured_chemical.unit} for production: {e}")
            
            manufactured_chemical.available_qty += produced_qty
            manufactured_chemical.updated_at = datetime.utcnow()
            
            # Record stock movement for production
            production_movement = StockMovement(
                chemical_id=product.chemical_id,
                change_type=ChangeType.INCREASE,
                quantity_changed=produced_qty,
                unit=manufactured_chemical.unit,
                action="Manufacturing Production",
                reference_id=product_id,
                reference_type="manufacturing"
            )
            self.db.add(production_movement)
            stock_movements.append(production_movement)
        
        # Log activity
        self._log_activity(
            user_id=manufactured_by,
            action="MANUFACTURING",
            description=f"Manufactured {target_quantity}{target_unit} of {product.name} (scale factor: {scale_factor:.3f})",
            new_value={
                "product_id": product_id,
                "product_name": product.name,
                "target_quantity": target_quantity,
                "target_unit": target_unit,
                "scale_factor": scale_factor,
                "components_consumed": len(required_quantities),
                "quantity_produced": target_quantity,
                "stock_movements": len(stock_movements)
            }
        )
        
        self.db.commit()
        
        return {
            "product_name": product.name,
            "target_quantity": target_quantity,
            "target_unit": target_unit,
            "scale_factor": scale_factor,
            "components_consumed": len(required_quantities),
            "quantity_produced": target_quantity,
            "stock_movements": len(stock_movements)
        }
    
    def check_manufacturing_feasibility(self, product_id: int, target_quantity: float, target_unit: str) -> Dict:
        """
        Check if manufacturing a product is feasible with current stock
        
        Args:
            product_id: ID of the product to check
            target_quantity: Quantity to manufacture (e.g., 2.0 for 2kg)
            target_unit: Unit of the target quantity (e.g., 'kg', 'g', 'l')
        """
        
        product = self.db.query(ChemicalProduct).filter(ChemicalProduct.id == product_id).first()
        if not product:
            return {"feasible": False, "error": "Product not found"}
        
        formulations = self.db.query(Formulation).filter(Formulation.product_id == product_id).all()
        if not formulations:
            return {"feasible": False, "error": "No formulations found for product"}
        
        # Convert target quantity to base unit for calculations
        try:
            target_in_base_unit, base_unit = UnitConverter.convert_to_base_unit(target_quantity, target_unit)
            base_composition_in_base_unit, _ = UnitConverter.convert_to_base_unit(product.base_composition_qty, product.unit)
            
            # Calculate scale factor based on base units
            scale_factor = target_in_base_unit / base_composition_in_base_unit
            
        except ValueError as e:
            return {"feasible": False, "error": f"Unit conversion error: {e}. Cannot convert {target_unit} to {product.unit}"}
        
        feasibility_check = {
            "feasible": True,
            "product_name": product.name,
            "target_quantity": target_quantity,
            "target_unit": target_unit,
            "scale_factor": scale_factor,
            "base_composition": product.base_composition_qty,
            "base_composition_unit": product.unit,
            "components": [],
            "insufficient_components": []
        }
        
        for formulation in formulations:
            chemical = self.db.query(Chemical).filter(Chemical.id == formulation.component_chemical_id).first()
            if not chemical:
                continue
            
            # Convert formulation unit to chemical's unit if different
            try:
                if formulation.unit.lower() != chemical.unit.lower():
                    required_qty_in_chem_unit = smart_convert(
                        formulation.quantity_required * scale_factor, 
                        formulation.unit, 
                        chemical.unit
                    )
                else:
                    required_qty_in_chem_unit = formulation.quantity_required * scale_factor
            except ValueError as e:
                return {"feasible": False, "error": f"Cannot convert {formulation.unit} to {chemical.unit} for {chemical.name}: {e}"}
            
            available_qty = chemical.available_qty
            sufficient = available_qty >= required_qty_in_chem_unit
            
            component_info = {
                "chemical_id": chemical.id,
                "chemical_name": chemical.name,
                "required_quantity": required_qty_in_chem_unit,
                "required_unit": chemical.unit,
                "available_quantity": available_qty,
                "available_unit": chemical.unit,
                "sufficient": sufficient,
                "proportion": round((formulation.quantity_required / product.base_composition_qty) * 100, 2)
            }
            
            feasibility_check["components"].append(component_info)
            
            if not sufficient:
                feasibility_check["insufficient_components"].append(component_info)
                feasibility_check["feasible"] = False
        
        return feasibility_check
    
    def get_manufacturing_summary(self, product_id: int) -> Dict:
        """Get manufacturing summary for a product"""
        
        product = self.db.query(ChemicalProduct).filter(ChemicalProduct.id == product_id).first()
        if not product:
            return {}
        
        formulations = self.db.query(Formulation).filter(Formulation.product_id == product_id).all()
        
        summary = {
            "product_id": product_id,
            "product_name": product.name,
            "base_composition_qty": product.base_composition_qty,
            "unit": product.unit,
            "total_components": len(formulations),
            "components": []
        }
        
        for formulation in formulations:
            chemical = self.db.query(Chemical).filter(Chemical.id == formulation.component_chemical_id).first()
            if chemical:
                proportion = (formulation.quantity_required / product.base_composition_qty) * 100
                summary["components"].append({
                    "chemical_id": chemical.id,
                    "chemical_name": chemical.name,
                    "quantity_required": formulation.quantity_required,
                    "unit": formulation.unit,
                    "proportion_percentage": round(proportion, 2),
                    "available_quantity": chemical.available_qty,
                    "sufficient_for_1x": chemical.available_qty >= formulation.quantity_required
            })
        
        return summary
    
    def _log_activity(self, user_id: int, action: str, description: str, new_value: Dict = None):
        """Log activity for audit trail"""
        try:
            activity_log = ActivityLog(
                user_id=user_id,
                action=action,
                description=description,
                new_value=json.dumps(new_value) if new_value else None
            )
            self.db.add(activity_log) 
        except Exception as e:
            print(f"Failed to log activity: {e}")
            # Don't fail the main operation if logging fails 