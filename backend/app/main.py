from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import user, invitation, activity_log

# Create database tables
user.Base.metadata.create_all(bind=engine)
invitation.Base.metadata.create_all(bind=engine)
activity_log.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chemical Inventory API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.user_routes import router as user_router

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(user_router, prefix="/user", tags=["User"])

@app.get("/")
def root():
    return {"message": "Chemical Inventory API is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
