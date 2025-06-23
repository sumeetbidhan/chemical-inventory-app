#!/usr/bin/env python3
"""
Script to create initial admin user for Chemical Inventory System
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models import user, invitation, activity_log
from app.crud.user import create_user
from app.schema.user import UserCreate

def create_initial_admin():
    """Create initial admin user"""
    print("🔧 Setting up initial admin user...")
    
    # Create tables if they don't exist
    try:
        user.Base.metadata.create_all(bind=engine)
        invitation.Base.metadata.create_all(bind=engine)
        activity_log.Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        
        if existing_admin:
            print(f"✅ Admin user already exists: {existing_admin.email}")
            print(f"   ID: {existing_admin.id}")
            print(f"   Role: {existing_admin.role}")
            print(f"   Approved: {existing_admin.is_approved}")
            return existing_admin
        
        # Create admin user
        admin_data = UserCreate(
            uid="001",  # This will be replaced when admin logs in with Firebase
            email="admin@chemical-inventory.com",
            role=UserRole.ADMIN
        )
        
        admin_user = create_user(db, admin_data)
        admin_user.is_approved = True  # Admin is auto-approved
        
        db.commit()
        print(f"✅ Admin user created successfully!")
        print(f"   Email: {admin_user.email}")
        print(f"   ID: {admin_user.id}")
        print(f"   Role: {admin_user.role}")
        print(f"   Approved: {admin_user.is_approved}")
        print(f"   Created: {admin_user.created_at}")
        
        return admin_user
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def list_all_users():
    """List all users in the database"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"\n📋 Current users in database ({len(users)} total):")
        for user in users:
            print(f"   - {user.email} (ID: {user.id}, Role: {user.role}, Approved: {user.is_approved})")
    except Exception as e:
        print(f"❌ Error listing users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Chemical Inventory - Admin Setup")
    print("=" * 50)
    
    # Create admin user
    admin = create_initial_admin()
    
    # List all users
    list_all_users()
    
    print("\n✅ Setup complete!")
    print("💡 Next steps:")
    print("   1. Start the server: uvicorn app.main:app --reload")
    print("   2. Test health endpoint: curl http://localhost:8000/health")
    print("   3. Login with Firebase to replace the temporary admin UID") 