"""
Excel Service for Chemical Inventory System
Handles Excel file uploads and parsing for formulations
"""

import pandas as pd
import io
from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
import logging

from ..models import Chemical, ChemicalProduct, Formulation
# WebSocket functionality will be handled separately

logger = logging.getLogger(__name__)


class ExcelService:
    def __init__(self, db: Session):
        self.db = db
    
    def parse_formulation_excel(self, excel_file: bytes, filename: str) -> Dict:
        """
        Parse Excel file for formulation data
        Supports both simple (OSR16124) and hierarchical (WRCD9374) formats
        """
        try:
            # Read Excel file - don't use first row as headers
            df = pd.read_excel(io.BytesIO(excel_file), header=None)
            
            # Debug logging - show the ACTUAL file structure
            logger.info(f"Excel file '{filename}' loaded. Shape: {df.shape}")
            logger.info(f"Column count: {len(df.columns)}")
            logger.info(f"Column names: {list(df.columns)}")
            logger.info(f"First 10 rows:\n{df.head(10)}")
            logger.info(f"Last 5 rows:\n{df.tail(5)}")
            
            # Show specific cells that matter
            if df.shape[0] >= 1 and len(df.columns) >= 2:
                logger.info(f"Key cells - A1: '{df.iloc[0,0]}', B1: '{df.iloc[0,1]}'")
            if df.shape[0] >= 2 and len(df.columns) >= 3:
                logger.info(f"Key cells - A2: '{df.iloc[1,0]}', C2: '{df.iloc[1,2]}'")
            if df.shape[0] >= 3:
                logger.info(f"First component row - A3: '{df.iloc[2,0]}', C3: '{df.iloc[2,2]}'")
            
            # Check each format with detailed logging
            osr_result = self._is_osr_format(df)
            simple_result = self._is_simple_format(df)
            hier_result = self._is_hierarchical_format(df)
            
            logger.info(f"Format detection - OSR: {osr_result}, Simple: {simple_result}, Hierarchical: {hier_result}")
            
            # Determine format based on structure
            if osr_result:
                logger.info("Using OSR format parser")
                return self._parse_osr_format(df, filename)
            elif simple_result:
                logger.info("Using simple format parser")
                return self._parse_simple_format(df, filename)
            elif hier_result:
                logger.info("Using hierarchical format parser")
                return self._parse_hierarchical_format(df, filename)
            else:
                # Provide debug info in error
                debug_info = f"Shape: {df.shape}, Columns: {len(df.columns)}"
                if df.shape[0] >= 2:
                    debug_info += f", A1: '{df.iloc[0,0] if len(df.columns) > 0 else 'N/A'}'"
                    debug_info += f", B1: '{df.iloc[0,1] if len(df.columns) > 1 else 'N/A'}'"
                    debug_info += f", A2: '{df.iloc[1,0] if len(df.columns) > 0 else 'N/A'}'"
                    debug_info += f", C2: '{df.iloc[1,2] if len(df.columns) > 2 else 'N/A'}'"
                
                raise ValueError(f"Unsupported Excel format. Debug: {debug_info}. Expected: B1=product, A2='Code', C2='Quantity'")
                
        except Exception as e:
            logger.error(f"Error parsing Excel file: {e}")
            raise ValueError(f"Failed to parse Excel file: {str(e)}")
    
    def _is_simple_format(self, df: pd.DataFrame) -> bool:
        """Check if Excel follows simple format (Code + Product + Quantity)"""
        # Simple format has 3 columns: Code, Product, Quantity
        if len(df.columns) == 3:
            col_names = [str(col).lower() for col in df.columns]
            return any('code' in col for col in col_names) and any('quantity' in col for col in col_names)
        return False
    
    def _is_hierarchical_format(self, df: pd.DataFrame) -> bool:
        """Check if Excel follows hierarchical format (Code + Quantity with categories)"""
        # Hierarchical format has 2 columns: Code, Quantity
        if len(df.columns) == 2:
            col_names = [str(col).lower() for col in df.columns]
            return any('code' in col for col in col_names) and any('quantity' in col for col in col_names)
        return False
    
    def _is_osr_format(self, df: pd.DataFrame) -> bool:
        """Check if Excel follows OSR16124-like format.
        Handles multiple variants:
        1. A1='Code', B1=product, then components in A2+
        2. Product in B1, headers in A2/C2, components A3+
        3. Legacy A1=product format
        """
        if len(df.columns) != 3:
            return False

        try:
            # Get key cells
            cell_a1 = str(df.iloc[0, 0]).strip() if not pd.isna(df.iloc[0, 0]) else ""
            cell_b1 = str(df.iloc[0, 1]).strip() if not pd.isna(df.iloc[0, 1]) else ""
            
            # Check for product in various cells
            cells_to_check = []
            if df.shape[0] >= 1:
                for col in range(min(3, len(df.columns))):
                    cell_val = str(df.iloc[0, col]).strip() if not pd.isna(df.iloc[0, col]) else ""
                    cells_to_check.append((f"Cell[0,{col}]", cell_val))

            def looks_like_product(value: str) -> bool:
                v = value.lower()
                return bool(value) and v not in ['code', 'quantity', 'product', 'nan', ''] and len(value) > 2

            # Case 1: A1='Code', look for product in B1 or other cells in row 1
            if cell_a1.lower() == 'code':
                # Check B1, C1 for product
                for col in range(1, min(3, len(df.columns))):
                    cell_val = str(df.iloc[0, col]).strip() if not pd.isna(df.iloc[0, col]) else ""
                    if looks_like_product(cell_val):
                        return True
                        
                # If A1='Code' but no product in row 1, check if this looks like a components list
                # Look for alphanumeric codes in A3+ and numbers in C3+ (since A2/C2 are headers)
                if df.shape[0] >= 4:  # Need at least header row + 2 components
                    # Check if A3+ looks like component codes and C3+ looks like quantities
                    component_like = 0
                    for i in range(2, min(df.shape[0], 7)):  # Check rows 3-6 (index 2-5)
                        a_val = str(df.iloc[i, 0]).strip() if not pd.isna(df.iloc[i, 0]) else ""
                        c_val = df.iloc[i, 2] if not pd.isna(df.iloc[i, 2]) else None
                        
                        # Skip empty rows
                        if not a_val and c_val is None:
                            continue
                            
                        # Check if A has code-like value and C has numeric value
                        if a_val and len(a_val) > 0:
                            try:
                                float(c_val) if c_val is not None else None
                                component_like += 1
                            except (ValueError, TypeError):
                                pass
                    
                    if component_like >= 2:  # At least 2 component-like rows
                        return True

            # Case 2: Product in B1, headers in A2/C2
            if looks_like_product(cell_b1):
                # Check for headers in row 2
                if df.shape[0] > 1:
                    header_a2 = str(df.iloc[1, 0]).strip().lower() if not pd.isna(df.iloc[1, 0]) else ""
                    header_c2 = str(df.iloc[1, 2]).strip().lower() if df.shape[0] > 1 and not pd.isna(df.iloc[1, 2]) else ""
                    has_headers = ('code' in header_a2) and ('quant' in header_c2 or 'qty' in header_c2)
                    if has_headers:
                        return True

            # Case 3: Legacy A1=product format
            if looks_like_product(cell_a1):
                return True
                
        except Exception:
            return False

        return False
    
    def _parse_simple_format(self, df: pd.DataFrame, filename: str) -> Dict:
        """Parse simple format like OSR16124 (Code + Product + Quantity)"""
        try:
            # Extract product name from second column header
            product_name = df.columns[1] if len(df.columns) > 1 else "Unknown Product"
            
            # Find Code and Quantity columns
            code_col = None
            quantity_col = None
            
            for i, col in enumerate(df.columns):
                col_lower = str(col).lower()
                if 'code' in col_lower:
                    code_col = i
                elif 'quantity' in col_lower:
                    quantity_col = i
            
            if code_col is None or quantity_col is None:
                raise ValueError("Could not identify Code and Quantity columns")
            
            # Parse components
            components = []
            total_quantity = 0
            
            for _, row in df.iterrows():
                code = str(row.iloc[code_col]).strip()
                quantity = row.iloc[quantity_col]
                
                # Skip empty rows or header rows
                if pd.isna(code) or pd.isna(quantity) or code.lower() in ['code', 'nan', '']:
                    continue
                
                # Convert quantity to float
                try:
                    qty = float(quantity)
                    if qty > 0:
                        components.append({
                            'code': code,
                            'quantity': qty,
                            'unit': 'g'  # Default unit for Excel uploads
                        })
                        total_quantity += qty
                except (ValueError, TypeError):
                    logger.warning(f"Skipping invalid quantity for code {code}: {quantity}")
                    continue
            
            return {
                'format': 'simple',
                'product_name': product_name,
                'base_composition_qty': total_quantity,
                'unit': 'g',
                'components': components,
                'total_components': len(components),
                'filename': filename
            }
            
        except Exception as e:
            logger.error(f"Error parsing simple format: {e}")
            raise ValueError(f"Failed to parse simple format: {str(e)}")
    
    def _parse_hierarchical_format(self, df: pd.DataFrame, filename: str) -> Dict:
        """Parse hierarchical format like WRCD9374 (Code + Quantity with categories)"""
        try:
            # Find Code and Quantity columns
            code_col = None
            quantity_col = None
            
            for i, col in enumerate(df.columns):
                col_lower = str(col).lower()
                if 'code' in col_lower:
                    code_col = i
                elif 'quantity' in col_lower:
                    quantity_col = i
            
            if code_col is None or quantity_col is None:
                raise ValueError("Could not identify Code and Quantity columns")
            
            # Parse components with category grouping
            components = []
            categories = {}
            total_quantity = 0
            
            current_category = None
            
            for _, row in df.iterrows():
                code = str(row.iloc[code_col]).strip()
                quantity = row.iloc[quantity_col]
                
                # Skip empty rows
                if pd.isna(code) and pd.isna(quantity):
                    continue
                
                # Check if this is a category row (has quantity but no code, or code looks like category)
                if pd.isna(code) or code == '':
                    if not pd.isna(quantity):
                        # This is a category quantity row
                        try:
                            qty = float(quantity)
                            if current_category:
                                categories[current_category]['total_quantity'] = qty
                                total_quantity += qty
                        except (ValueError, TypeError):
                            pass
                    continue
                
                # Check if this looks like a category (alphanumeric, not just numbers)
                if code.isalpha() or (code.isalnum() and not code.isdigit()):
                    current_category = code
                    categories[current_category] = {
                        'name': code,
                        'components': [],
                        'total_quantity': 0
                    }
                    continue
                
                # This is a component row
                if not pd.isna(quantity):
                    try:
                        qty = float(quantity)
                        if qty > 0:
                            component = {
                                'code': code,
                                'quantity': qty,
                                'unit': 'g',  # Default unit for Excel uploads
                                'category': current_category
                            }
                            components.append(component)
                            
                            if current_category:
                                categories[current_category]['components'].append(component)
                                categories[current_category]['total_quantity'] += qty
                            
                            total_quantity += qty
                    except (ValueError, TypeError):
                        logger.warning(f"Skipping invalid quantity for code {code}: {quantity}")
                        continue
            
            return {
                'format': 'hierarchical',
                'product_name': filename.replace('.xlsx', '').replace('.xls', ''),
                'base_composition_qty': total_quantity,
                'unit': 'g',
                'components': components,
                'categories': categories,
                'total_components': len(components),
                'filename': filename
            }
            
        except Exception as e:
            logger.error(f"Error parsing hierarchical format: {e}")
            raise ValueError(f"Failed to parse hierarchical format: {str(e)}")
    
    def _parse_osr_format(self, df: pd.DataFrame, filename: str) -> Dict:
        """Parse OSR16124 format.
        Supports multiple variants:
        1. A1='Code', components start A2+, product name from filename or first component pattern
        2. Product in B1, headers in A2/C2, components A3+
        3. Legacy A1=product format
        """
        try:
            # Columns
            col_a, col_b, col_c = 0, 1, 2

            # Get key cells
            cell_a1 = str(df.iloc[0, col_a]).strip() if not pd.isna(df.iloc[0, col_a]) else ""
            cell_b1 = str(df.iloc[0, col_b]).strip() if not pd.isna(df.iloc[0, col_b]) else ""

            # Debug logging
            print(f"🔍 OSR Format Detection - A1: '{cell_a1}', B1: '{cell_b1}'")
            logger.info(f"OSR Format Detection - A1: '{cell_a1}', B1: '{cell_b1}'")

            def looks_like_product(value: str) -> bool:
                v = value.lower()
                result = bool(value) and v not in ['code', 'quantity', 'product', 'nan', ''] and len(value) > 2
                logger.info(f"looks_like_product('{value}') = {result}")
                return result

            # Determine product name and start row
            product_name = None
            start_row = 1  # Default: components start from row 2 (index 1)

            # Case 1: A1='Code' format - check if B1 has product name
            if cell_a1.lower() == 'code':
                print(f"🔍 Detected A1='Code' format. Checking B1 for product name...")
                print(f"🔍 B1 value: '{cell_b1}', type: {type(cell_b1)}")
                logger.info(f"Detected A1='Code' format. Checking B1 for product name...")
                logger.info(f"B1 value: '{cell_b1}', type: {type(cell_b1)}")
                
                # Check if B1 has product name (like OSR16124)
                # Be more lenient with product name detection
                if cell_b1 and str(cell_b1).strip() and str(cell_b1).strip().lower() not in ['nan', 'none', '']:
                    product_name = str(cell_b1).strip()  # Use B1 value directly
                    start_row = 2  # Components start from row 3 (index 2) since row 2 has headers
                    print(f"✅ Using product name from B1: '{product_name}'")
                    logger.info(f"✅ Using product name from B1: '{product_name}'")
                else:
                    # Only use filename as fallback if B1 is truly empty
                    product_name = filename.replace('.xlsx', '').replace('.xls', '').replace('.csv', '')
                    if not product_name or len(product_name) < 3:
                        product_name = "UNKNOWN_PRODUCT"
                    start_row = 2  # Components start from row 3 (index 2) since row 2 has headers
                    print(f"⚠️ B1 not detected as product, using filename: '{product_name}'")
                    logger.info(f"⚠️ B1 not detected as product, using filename: '{product_name}'")

            # Case 2: Product in B1 with headers in A2/C2
            elif looks_like_product(cell_b1):
                product_name = cell_b1
                # Check for headers in row 2
                if df.shape[0] > 1:
                    header_a2 = str(df.iloc[1, col_a]).strip().lower() if not pd.isna(df.iloc[1, col_a]) else ""
                    header_c2 = str(df.iloc[1, col_c]).strip().lower() if df.shape[0] > 1 and not pd.isna(df.iloc[1, col_c]) else ""
                    has_headers = ('code' in header_a2) and ('quant' in header_c2 or 'qty' in header_c2)
                    start_row = 2 if has_headers else 1

            # Case 3: Legacy A1=product
            elif looks_like_product(cell_a1):
                product_name = cell_a1
                start_row = 1

            if not product_name:
                raise ValueError("Could not identify product name")

            components: List[Dict] = []
            running_sum = 0.0
            base_total: Optional[float] = None

            # Iterate rows to find components
            logger.info(f"Starting component parsing from row {start_row} (index {start_row})")
            for idx in range(start_row, df.shape[0]):
                val_code = df.iloc[idx, col_a] if idx < df.shape[0] else None
                val_qty = df.iloc[idx, col_c] if idx < df.shape[0] else None

                code = "" if pd.isna(val_code) else str(val_code).strip()
                qty_raw = None if pd.isna(val_qty) else val_qty

                logger.info(f"Row {idx}: A='{code}', C='{qty_raw}'")

                # Stop at first blank in A: capture total from C and break
                if not code:
                    logger.info(f"Found blank in A at row {idx}, capturing total from C: {qty_raw}")
                    if qty_raw is not None and str(qty_raw).strip() != "":
                        try:
                            base_total = float(str(qty_raw).replace(",", ""))
                            logger.info(f"Captured base total: {base_total}")
                        except ValueError:
                            pass
                    break

                # Skip header-like rows
                if code.lower() in ['code', 'nan', '']:
                    logger.info(f"Skipping header row {idx}: '{code}'")
                    continue

                if qty_raw is None or str(qty_raw).strip() == "":
                    logger.info(f"Skipping row {idx}: no quantity")
                    continue

                try:
                    qty = float(str(qty_raw).replace(",", ""))
                except (ValueError, TypeError):
                    logger.warning(f"Skipping invalid quantity for code {code}: {qty_raw}")
                    continue

                if qty <= 0:
                    logger.info(f"Skipping row {idx}: quantity <= 0")
                    continue

                logger.info(f"✅ Adding component: {code} = {qty}")
                components.append({'code': code, 'quantity': qty, 'unit': 'g'})
                running_sum += qty

            # Determine base composition
            base_composition_qty = base_total if base_total is not None else running_sum

            # Optional validation: allow small tolerance
            if base_total is not None:
                if abs(running_sum - base_total) > 0.01:
                    logger.warning(
                        f"Component total ({running_sum}) does not match base composition ({base_total})"
                    )

            return {
                'format': 'osr',
                'product_name': product_name,
                'base_composition_qty': base_composition_qty,
                'unit': 'g',
                'components': components,
                'total_components': len(components),
                'filename': filename
            }
            
        except Exception as e:
            logger.error(f"Error parsing OSR format: {e}")
            raise ValueError(f"Failed to parse OSR format: {str(e)}")
    
    def create_formulation_from_excel(self, parsed_data: Dict, created_by: int) -> Dict:
        """
        Create formulation from parsed Excel data
        Auto-creates missing chemicals and creates the complete formulation
        """
        try:
            # Debug logging
            print(f"🔍 create_formulation_from_excel received data: {parsed_data}")
            logger.info(f"create_formulation_from_excel received data: {parsed_data}")
            
            # Start transaction
            product_name = parsed_data['product_name']
            base_composition_qty = parsed_data['base_composition_qty']
            unit = parsed_data['unit']
            components = parsed_data['components']
            
            # Check if product already exists
            existing_product = self.db.query(ChemicalProduct).filter(
                ChemicalProduct.name == product_name
            ).first()
            
            if existing_product:
                raise ValueError(f"Product '{product_name}' already exists")
            
            # Auto-create missing chemicals
            created_chemicals = []
            for component in components:
                chemical = self.db.query(Chemical).filter(
                    Chemical.name == component['code']
                ).first()
                
                if not chemical:
                    # Create new chemical
                    chemical = Chemical(
                        name=component['code'],
                        unit=component['unit'],
                        available_qty=0.0,  # Default: no stock
                        threshold_qty=0.0,  # Default: no threshold
                        is_manufactured=False  # Default: raw chemical
                    )
                    self.db.add(chemical)
                    self.db.flush()  # Get the ID
                    created_chemicals.append(component['code'])
                    logger.info(f"Auto-created chemical: {component['code']}")
            
            # Create the manufactured chemical (product)
            manufactured_chemical = Chemical(
                name=product_name,
                unit=unit,
                available_qty=0.0,  # No stock initially
                threshold_qty=0.0,  # No threshold initially
                is_manufactured=True  # This is a manufactured chemical
            )
            self.db.add(manufactured_chemical)
            self.db.flush()  # Get the ID
            
            # Create chemical product
            filename = parsed_data.get('filename', 'Unknown file')
            chemical_product = ChemicalProduct(
                chemical_id=manufactured_chemical.id,
                name=product_name,
                base_composition_qty=base_composition_qty,
                unit=unit,
                note=f"Created from Excel upload: {filename}",
                created_by=created_by
            )
            self.db.add(chemical_product)
            self.db.flush()  # Get the ID
            
            # Create formulations
            formulations = []
            for component in components:
                # Find the chemical (should exist now)
                chemical = self.db.query(Chemical).filter(
                    Chemical.name == component['code']
                ).first()
                
                if chemical:
                    formulation = Formulation(
                        product_id=chemical_product.id,
                        component_chemical_id=chemical.id,
                        quantity_required=component['quantity'],
                        unit=component['unit']
                    )
                    self.db.add(formulation)
                    formulations.append(formulation)
                else:
                    raise ValueError(f"Chemical '{component['code']}' not found after creation")
            
            # Commit all changes
            self.db.commit()
            
            return {
                'success': True,
                'message': f"Formulation '{product_name}' created successfully",
                'product_id': chemical_product.id,
                'chemical_id': manufactured_chemical.id,
                'total_components': len(components),
                'auto_created_chemicals': created_chemicals,
                'base_composition_qty': base_composition_qty,
                'unit': unit
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating formulation from Excel: {e}")
            raise ValueError(f"Failed to create formulation: {str(e)}")
    
    def get_excel_template(self, format_type: str = 'simple') -> bytes:
        """Generate Excel template for formulations"""
        try:
            if format_type == 'simple':
                # Simple format template (OSR16124 style)
                data = {
                    'Code': ['2156', 'AP3', '2164', '31110', '4103'],
                    'Product': ['OSR16124', 'OSR16124', 'OSR16124', 'OSR16124', 'OSR16124'],
                    'Quantity': [0.5, 0.5, 5, 2, 0.25]
                }
                df = pd.DataFrame(data)
            else:
                # Hierarchical format template (WRCD9374 style)
                data = {
                    'Code': ['HP2', '', '9317', '4810', '7901', '11815', '4157', '19111'],
                    'Quantity': [0.3, 0.3, 0.4, 1.35, 7, 19, 22, 5]
                }
                df = pd.DataFrame(data)
            
            # Create Excel file in memory
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Formulation')
            
            output.seek(0)
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Error generating Excel template: {e}")
            raise ValueError(f"Failed to generate template: {str(e)}")
