#!/usr/bin/env python3
"""
Script to setup admin user for the new chemical inventory system
"""

import sys
import os
from sqlalchemy import text

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal

def setup_admin_user():
    """Setup admin user for the new system"""
    print("👑 Setting up Admin User for New Chemical Inventory System")
    print("=" * 70)
    
    db = SessionLocal()
    
    try:
        # First, let's see what users exist
        result = db.execute(text("SELECT id, uid, email, first_name, last_name, role_id, is_approved FROM users"))
        users = result.fetchall()
        
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"  - ID: {user[0]}, Email: {user[2]}, Role ID: {user[5]}, Approved: {user[6]}")
        
        if not users:
            print("❌ No users found in database!")
            return
        
        # Check if roles table exists and has admin role
        try:
            result = db.execute(text("SELECT id, name FROM roles ORDER BY id"))
            roles = result.fetchall()
            print(f"\n📋 Available roles:")
            for role in roles:
                print(f"  - ID: {role[0]}, Name: {role[1]}")
        except Exception as e:
            print(f"⚠️  Could not check roles table: {e}")
            print("   Creating basic roles...")
            
            # Create basic roles if they don't exist
            try:
                db.execute(text("""
                    INSERT INTO roles (id, name) VALUES 
                    (1, 'ADMIN'),
                    (2, 'LAB_STAFF'),
                    (3, 'PRODUCT_TEAM'),
                    (4, 'ACCOUNT_TEAM'),
                    (5, 'ALL_USERS')
                    ON CONFLICT (id) DO NOTHING
                """))
                db.commit()
                print("✅ Created basic roles")
            except Exception as e2:
                print(f"❌ Could not create roles: {e2}")
        
        # Find admin role ID
        admin_role_id = None
        try:
            result = db.execute(text("SELECT id FROM roles WHERE name = 'ADMIN'"))
            admin_role = result.fetchone()
            if admin_role:
                admin_role_id = admin_role[0]
                print(f"✅ Found admin role with ID: {admin_role_id}")
            else:
                print("❌ Admin role not found!")
                return
        except Exception as e:
            print(f"❌ Error finding admin role: {e}")
            return
        
        # Make the first user an admin
        user_id = users[0][0]
        user_email = users[0][2]
        
        print(f"\n🔄 Making user {user_email} an admin...")
        
        # Update user to admin role and approve them
        db.execute(text("""
            UPDATE users 
            SET role_id = :admin_role_id, is_approved = TRUE
            WHERE id = :user_id
        """), {"admin_role_id": admin_role_id, "user_id": user_id})
        
        db.commit()
        print(f"✅ User {user_email} is now an admin and approved!")
        
        # Verify the change
        result = db.execute(text("""
            SELECT u.id, u.email, u.role_id, u.is_approved, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.id = :user_id
        """), {"user_id": user_id})
        user = result.fetchone()
        
        print(f"\n📋 Updated user details:")
        print(f"  - ID: {user[0]}")
        print(f"  - Email: {user[1]}")
        print(f"  - Role ID: {user[2]}")
        print(f"  - Role Name: {user[4]}")
        print(f"  - Approved: {user[3]}")
        
        # Check if there are any other users that need approval
        result = db.execute(text("""
            SELECT u.id, u.email, u.first_name, u.last_name, u.is_approved, r.name as role_name
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.id != :user_id
        """), {"user_id": user_id})
        other_users = result.fetchall()
        
        if other_users:
            print(f"\n📋 Other users in system:")
            for user in other_users:
                status = "✅ Approved" if user[4] else "⏳ Pending Approval"
                role_name = user[5] if user[5] else "Unknown"
                print(f"  - {user[2]} {user[3]} ({user[1]}): {role_name} - {status}")
        
    except Exception as e:
        print(f"❌ Error setting up admin user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def check_database_schema():
    """Check if the database schema is correct"""
    print("\n🔍 Checking Database Schema")
    print("=" * 50)
    
    db = SessionLocal()
    
    try:
        # Check if required tables exist
        required_tables = ['users', 'roles', 'chemicals', 'chemical_products', 'formulations']
        
        for table in required_tables:
            try:
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.fetchone()[0]
                print(f"✅ {table}: {count} records")
            except Exception as e:
                print(f"❌ {table}: {e}")
        
        # Check users table structure
        try:
            result = db.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position
            """))
            
            print(f"\n📋 Users table structure:")
            for row in result.fetchall():
                print(f"   {row[0]}: {row[1]} ({'NULL' if row[2] == 'YES' else 'NOT NULL'})")
        except Exception as e:
            print(f"❌ Could not check users table structure: {e}")
        
    except Exception as e:
        print(f"❌ Error checking schema: {e}")
    finally:
        db.close()

def main():
    """Main function"""
    try:
        check_database_schema()
        setup_admin_user()
        
        print("\n🎉 Admin Setup Complete!")
        print("\n📋 Summary:")
        print("  ✅ Admin user created and approved")
        print("  ✅ Database schema verified")
        print("\n🚀 Next steps:")
        print("  1. Restart your backend server")
        print("  2. Login with the admin user")
        print("  3. Access the admin dashboard")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        print("Please check the error and try again")
        sys.exit(1)

if __name__ == "__main__":
    main()

