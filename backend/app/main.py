from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, check_database_connection
from app.models import user, activity_log, chemical_inventory, formulation_details, notifications, account_transactions
import os

app = FastAPI(title="Chemical Inventory API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    try:
        # Create all tables
        user.Base.metadata.create_all(bind=engine)
        activity_log.Base.metadata.create_all(bind=engine)
        chemical_inventory.Base.metadata.create_all(bind=engine)
        formulation_details.Base.metadata.create_all(bind=engine)
        notifications.Base.metadata.create_all(bind=engine)
        account_transactions.Base.metadata.create_all(bind=engine)
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
from app.routers.chemical_inventory import router as chemical_inventory_router
from app.routers.formulation_details import router as formulation_details_router
from app.routers.notifications import router as notifications_router
from app.routers.account_transactions import router as account_transactions_router

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(user_router, prefix="/user", tags=["User"])
app.include_router(chemical_inventory_router, prefix="/chemicals", tags=["Chemical Inventory"])
app.include_router(formulation_details_router, prefix="/formulations", tags=["Formulation Details"])
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
app.include_router(account_transactions_router, prefix="/account", tags=["Account Transactions"])

@app.get("/")
def root():
    return {"message": "Chemical Inventory API is running!"}

@app.get("/health")
def health_check():
    """Enhanced health check with database status"""
    db_status = check_database_connection()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "tables": ["users", "activity_logs", "chemical_inventory", "formulation_details", "notifications", "account_transactions", "purchase_orders", "purchase_order_items"]
    }
