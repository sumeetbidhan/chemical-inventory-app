#!/usr/bin/env python3
"""
Test script for registration process
"""

import sys
import os
import uuid

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.crud.user import create_user, get_user_by_email, get_pending_users
from app.schema.user import UserCreate
from app.models.user import UserRole

def test_registration():
    """Test user registration process"""
    print("🧪 Testing registration process...")
    
    try:
        db = SessionLocal()
        
        # Test data with unique UID
        test_email = "newuser2@example.com"
        test_first_name = "New"
        test_last_name = "User"
        test_role = UserRole.ALL_USERS  # Should default to ALL_USERS
        test_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        
        # Check if user already exists
        existing_user = get_user_by_email(db, test_email)
        if existing_user:
            print(f"⚠️  User already exists: {test_email}")
            print(f"   ID: {existing_user.id}, Role: {existing_user.role}, Approved: {existing_user.is_approved}")
        else:
            # Create new user
            user_data = UserCreate(
                uid=test_uid,
                email=test_email,
                first_name=test_first_name,
                last_name=test_last_name,
                role=test_role,
                password="testpassword"
            )
            
            new_user = create_user(db, user_data)
            
            # Set as pending (not approved)
            new_user.is_approved = False
            db.commit()
            
            print(f"✅ Created new user:")
            print(f"   ID: {new_user.id}")
            print(f"   Email: {new_user.email}")
            print(f"   Name: {new_user.first_name} {new_user.last_name}")
            print(f"   Role: {new_user.role}")
            print(f"   Approved: {new_user.is_approved}")
        
        # Check pending users
        pending_users = get_pending_users(db)
        print(f"\n⏳ Pending users ({len(pending_users)}):")
        for pending in pending_users:
            print(f"   - ID: {pending.id}, Email: {pending.email}, Name: {pending.first_name} {pending.last_name or ''}, Role: {pending.role}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Registration Test Script")
    print("=" * 40)
    test_registration() 