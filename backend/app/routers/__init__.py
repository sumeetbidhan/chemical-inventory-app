from .auth import router as auth_router
from .admin import router as admin_router
from .user_routes import router as user_router

__all__ = ["auth_router", "admin_router", "user_router"] 