from .auth import router as auth_router
from .admin import router as admin_router
from .user_routes import router as user_router
from .chemicals import router as chemicals_router
from .products import router as products_router
from .notifications import router as notifications_router
from .alerts import router as alerts_router
from .purchases import router as purchases_router
from .stock_movements import router as stock_movements_router
from .roles import router as roles_router

__all__ = [
    "auth_router", 
    "admin_router", 
    "user_router", 
    "chemicals_router", 
    "products_router",
    "notifications_router",
    "alerts_router",
    "purchases_router",
    "stock_movements_router",
    "roles_router"
] 