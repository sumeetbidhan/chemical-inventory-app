from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, check_database_connection, Base
import os

# Import all models to ensure they are registered with SQLAlchemy
from app.models import user, role, chemical, chemical_product, formulation, purchase, stock_movement, alert, notification, activity_log, product_assignment, extension_request, formulation_progress

app = FastAPI(title="Chemical Inventory API", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers"
    ],
    expose_headers=["Content-Length", "Content-Type"],
)

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    try:
        # Create all tables using the new unified Base
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
        
        # Check database connection
        if check_database_connection():
            print("✅ Database connection verified!")
        else:
            print("❌ Database connection failed!")
            
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")
        raise

# Include routers
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.user_routes import router as user_router
from app.routers.chemicals import router as chemicals_router
from app.routers.products import router as products_router
from app.routers.notifications import router as notifications_router
from app.routers.alerts import router as alerts_router
from app.routers.purchases import router as purchases_router
from app.routers.stock_movements import router as stock_movements_router
from app.routers.roles import router as roles_router
from app.routers.formulations import router as formulations_router
from app.routers.manufacturing import router as manufacturing_router
from app.routers.assignments import router as assignments_router
from app.routers.websocket_routes import router as websocket_router
from app.routers.excel_upload import router as excel_upload_router

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(user_router, prefix="/user", tags=["User"])
app.include_router(chemicals_router, tags=["Chemicals"])
app.include_router(products_router, tags=["Products"])
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
app.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
app.include_router(purchases_router, tags=["Purchases"])
app.include_router(stock_movements_router, tags=["Stock Movements"])
app.include_router(roles_router, tags=["Roles"])
app.include_router(formulations_router, tags=["Formulations"])
app.include_router(manufacturing_router, tags=["Manufacturing"])
app.include_router(assignments_router, tags=["Assignments"])
app.include_router(websocket_router, tags=["WebSocket"])
app.include_router(excel_upload_router, tags=["Excel Upload"])

@app.get("/")
def root():
    return {"message": "Chemical Inventory API v2.0 is running!"}

@app.get("/health")
def health_check():
    """Enhanced health check with database status"""
    db_status = check_database_connection()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "version": "2.0.0",
        "tables": [
            "roles", "users", "chemicals", "chemical_products", "formulations",
            "purchases", "stock_movements", "alerts", "notifications", "activity_logs",
            "product_assignments", "extension_requests", "formulation_progress"
        ]
    }
