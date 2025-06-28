#!/usr/bin/env python3
"""
Database migration script to add first_name and last_name columns to users table.
This script handles the migration for existing users by setting default values.
"""

import sys
import os
from sqlalchemy import create_engine, text, Column, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import DATABASE_URL, engine, SessionLocal
from app.models.user import User

def migrate_user_names():
    """Migrate existing users to include first_name and last_name"""
    print("🔄 Starting user names migration...")
    
    try:
        # Create a session
        db = SessionLocal()
        
        # Check if first_name column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'first_name'
        """))
        
        if result.fetchone():
            print("✅ first_name column already exists")
        else:
            print("📝 Adding first_name column...")
            db.execute(text("ALTER TABLE users ADD COLUMN first_name VARCHAR NOT NULL DEFAULT 'User'"))
            print("✅ first_name column added")
        
        # Check if last_name column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'last_name'
        """))
        
        if result.fetchone():
            print("✅ last_name column already exists")
        else:
            print("📝 Adding last_name column...")
            db.execute(text("ALTER TABLE users ADD COLUMN last_name VARCHAR"))
            print("✅ last_name column added")
        
        # Update existing users with default first_name if it's empty
        result = db.execute(text("""
            UPDATE users 
            SET first_name = 'User' 
            WHERE first_name IS NULL OR first_name = ''
        """))
        
        print(f"✅ Updated {result.rowcount} users with default first_name")
        
        # Commit changes
        db.commit()
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def verify_migration():
    """Verify that the migration was successful"""
    print("\n🔍 Verifying migration...")
    
    try:
        db = SessionLocal()
        
        # Check column structure
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('first_name', 'last_name')
            ORDER BY column_name
        """))
        
        columns = result.fetchall()
        print("📋 Current user table structure:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
        
        # Check user count
        result = db.execute(text("SELECT COUNT(*) FROM users"))
        user_count = result.fetchone()[0]
        print(f"👥 Total users: {user_count}")
        
        # Check users with first_name
        result = db.execute(text("SELECT COUNT(*) FROM users WHERE first_name IS NOT NULL AND first_name != ''"))
        users_with_name = result.fetchone()[0]
        print(f"✅ Users with first_name: {users_with_name}")
        
        if user_count == users_with_name:
            print("✅ All users have first_name set!")
        else:
            print(f"⚠️  {user_count - users_with_name} users still need first_name")
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 User Names Migration Script")
    print("=" * 40)
    
    try:
        migrate_user_names()
        verify_migration()
        print("\n🎉 Migration completed successfully!")
    except Exception as e:
        print(f"\n💥 Migration failed: {e}")
        sys.exit(1) 