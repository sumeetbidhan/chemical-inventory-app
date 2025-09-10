#!/usr/bin/env python3
"""
Debug script to check assignments and user data
"""

import sys
import os
from sqlalchemy import text

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal

def debug_assignments():
    """Debug assignments and user data"""
    print("🔍 Debugging Assignments and User Data")
    print("=" * 50)
    
    db = SessionLocal()
    
    try:
        # Check users
        print("\n👥 Users in database:")
        result = db.execute(text("""
            SELECT u.id, u.uid, u.email, u.first_name, u.last_name, u.role_id, u.is_approved, r.name as role_name
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            ORDER BY u.id
        """))
        users = result.fetchall()
        
        for user in users:
            status = "✅ Approved" if user[6] else "⏳ Pending"
            print(f"  - ID: {user[0]}, UID: {user[1][:20]}..., Email: {user[2]}, Role: {user[7]}, Status: {status}")
        
        # Check assignments
        print("\n📋 Assignments in database:")
        result = db.execute(text("""
            SELECT pa.id, pa.product_id, pa.assigned_to_user_id, pa.team_type, pa.status, 
                   u.email as assigned_to_email, cp.name as product_name
            FROM product_assignments pa
            LEFT JOIN users u ON pa.assigned_to_user_id = u.id
            LEFT JOIN chemical_products cp ON pa.product_id = cp.id
            ORDER BY pa.id
        """))
        assignments = result.fetchall()
        
        if assignments:
            for assignment in assignments:
                print(f"  - ID: {assignment[0]}, Product: {assignment[6]}, Assigned to: {assignment[5]}, Team: {assignment[3]}, Status: {assignment[4]}")
        else:
            print("  - No assignments found")
        
        # Check products
        print("\n🧪 Products in database:")
        result = db.execute(text("SELECT id, name FROM chemical_products LIMIT 5"))
        products = result.fetchall()
        
        for product in products:
            print(f"  - ID: {product[0]}, Name: {product[1]}")
        
        # Check roles
        print("\n🎭 Roles in database:")
        result = db.execute(text("SELECT id, name FROM roles ORDER BY id"))
        roles = result.fetchall()
        
        for role in roles:
            print(f"  - ID: {role[0]}, Name: {role[1]}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_assignments()
