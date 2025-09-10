"""
Excel Upload Router for Chemical Inventory System
Handles Excel file uploads for formulations with preview and approval
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import io

from ..database import get_db
from ..firebase_auth import get_current_user
from ..models.user import User
from ..services.excel_service import ExcelService

router = APIRouter(prefix="/excel", tags=["Excel Upload"])


@router.post("/upload-formulation")
async def upload_formulation_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload Excel file for formulation creation
    Supports both simple (OSR16124) and hierarchical (WRCD9374) formats
    """
    try:
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Please upload Excel files (.xlsx or .xls)"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Parse Excel file
        excel_service = ExcelService(db)
        parsed_data = excel_service.parse_formulation_excel(file_content, file.filename)
        
        # Return parsed data for preview and approval
        return {
            "success": True,
            "message": "Excel file parsed successfully",
            "parsed_data": parsed_data,
            "requires_approval": True
        }
        
    except Exception as e:
        # Log the full error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Excel upload error for {file.filename}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/approve-formulation")
async def approve_and_create_formulation(
    parsed_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve parsed Excel data and create formulation
    This creates the chemical product, auto-creates missing chemicals, and creates formulations
    """
    try:
        excel_service = ExcelService(db)
        result = excel_service.create_formulation_from_excel(parsed_data, current_user.id)
        
        return {
            "success": True,
            "message": result["message"],
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/template/{format_type}")
async def download_excel_template(
    format_type: str = "simple",
    current_user: User = Depends(get_current_user)
):
    """
    Download Excel template for formulations
    format_type: 'simple' (OSR16124 style) or 'hierarchical' (WRCD9374 style)
    """
    try:
        if format_type not in ['simple', 'hierarchical']:
            raise HTTPException(
                status_code=400, 
                detail="Invalid format type. Use 'simple' or 'hierarchical'"
            )
        
        # Create template
        excel_service = ExcelService(None)  # No DB needed for template generation
        template_data = excel_service.get_excel_template(format_type)
        
        # Create filename
        filename = f"formulation_template_{format_type}.xlsx"
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(template_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/supported-formats")
async def get_supported_formats():
    """Get information about supported Excel formats"""
    return {
        "supported_formats": [
            {
                "name": "Simple Format (OSR16124 style)",
                "description": "3 columns: Code, Product, Quantity",
                "example": "Code | OSR16124 | Quantity",
                "use_case": "Standard formulations with product name in header"
            },
            {
                "name": "Hierarchical Format (WRCD9374 style)",
                "description": "2 columns: Code, Quantity with category grouping",
                "example": "HP2 | 0.3 (category), 9317 | 0.4 (component)",
                "use_case": "Complex formulations with component categories"
            }
        ],
        "notes": [
            "All quantities are assumed to be in grams (g)",
            "Component codes become chemical names in the system",
            "Missing chemicals are automatically created with 0 stock",
            "Product names are extracted from Excel structure"
        ]
    }
