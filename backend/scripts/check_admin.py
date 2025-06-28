#!/usr/bin/env python3
"""
Script to check admin users and database structure
"""

import sys
import os
from sqlalchemy import text

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User, UserRole

def check_admin_users():
    """Check if there are any admin users in the database"""
    print("🔍 Checking admin users...")
    
    try:
        db = SessionLocal()
        
        # Check all users
        users = db.query(User).all()
        print(f"👥 Total users: {len(users)}")
        
        for user in users:
            print(f"  - ID: {user.id}, Email: {user.email}, Role: {user.role}, Approved: {user.is_approved}")
            if hasattr(user, 'first_name'):
                print(f"    Name: {user.first_name} {user.last_name or ''}")
        
        # Check admin users specifically
        admin_users = db.query(User).filter(User.role == UserRole.ADMIN).all()
        print(f"\n👑 Admin users: {len(admin_users)}")
        
        for admin in admin_users:
            print(f"  - ID: {admin.id}, Email: {admin.email}, Approved: {admin.is_approved}")
            if hasattr(admin, 'first_name'):
                print(f"    Name: {admin.first_name} {admin.last_name or ''}")
        
        # Check pending users
        pending_users = db.query(User).filter(User.is_approved == False).all()
        print(f"\n⏳ Pending users: {len(pending_users)}")
        
        for pending in pending_users:
            print(f"  - ID: {pending.id}, Email: {pending.email}, Role: {pending.role}")
            if hasattr(pending, 'first_name'):
                print(f"    Name: {pending.first_name} {pending.last_name or ''}")
        
        # Check table structure
        print(f"\n📋 Checking table structure...")
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """))
        
        columns = result.fetchall()
        print("User table columns:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Admin User Check Script")
    print("=" * 40)
    check_admin_users() 