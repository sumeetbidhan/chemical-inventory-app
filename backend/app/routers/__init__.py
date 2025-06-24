from .auth import router as auth_router
from .admin import router as admin_router
from .user_routes import router as user_router
from .chemical_inventory import router as chemical_inventory_router
from .formulation_details import router as formulation_details_router

__all__ = ["auth_router", "admin_router", "user_router", "chemical_inventory_router", "formulation_details_router"] 