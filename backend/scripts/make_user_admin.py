#!/usr/bin/env python3
"""
Script to make existing user an admin
"""
import sys
import os
from sqlalchemy import text

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal

def make_user_admin():
    """Make the existing user an admin"""
    print("👑 Making User Admin")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # First, let's see what users exist
        result = db.execute(text("SELECT id, uid, email, first_name, last_name, role, is_approved FROM users"))
        users = result.fetchall()
        
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"  - ID: {user[0]}, Email: {user[2]}, Role: {user[5]}, Approved: {user[6]}")
        
        if not users:
            print("❌ No users found in database!")
            return
        
        # Make the first user an admin
        user_id = users[0][0]
        user_email = users[0][2]
        
        print(f"\n🔄 Making user {user_email} an admin...")
        
        # Update user to admin role and approve them
        db.execute(text("""
            UPDATE users 
            SET role = 'ADMIN', is_approved = TRUE, is_online = TRUE
            WHERE id = :user_id
        """), {"user_id": user_id})
        
        db.commit()
        print(f"✅ User {user_email} is now an admin and approved!")
        
        # Verify the change
        result = db.execute(text("SELECT id, email, role, is_approved FROM users WHERE id = :user_id"), 
                          {"user_id": user_id})
        user = result.fetchone()
        
        print(f"\n📋 Updated user details:")
        print(f"  - ID: {user[0]}")
        print(f"  - Email: {user[1]}")
        print(f"  - Role: {user[2]}")
        print(f"  - Approved: {user[3]}")
        
    except Exception as e:
        print(f"❌ Error making user admin: {e}")
        db.rollback()
    finally:
        db.close()

def create_sample_data():
    """Create some sample data for testing"""
    print("\n📊 Creating Sample Data")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # Create sample chemicals
        print("  🧪 Creating sample chemicals...")
        chemicals = [
            ("Sodium Hydroxide", "1310-73-2", "NaOH", 40.0, "Base", "Corrosive", "Store in dry place", 500.0, "g", 2.5, "INR", "ChemSupply", "Shelf A1"),
            ("Hydrochloric Acid", "7647-01-0", "HCl", 36.46, "Acid", "Corrosive", "Store in fume hood", 250.0, "ml", 5.0, "INR", "AcidCorp", "Shelf B2"),
            ("Ethanol", "64-17-5", "C2H5OH", 46.07, "Solvent", "Flammable", "Store away from heat", 1000.0, "ml", 3.0, "INR", "SolventCo", "Shelf C3")
        ]
        
        for chem in chemicals:
            db.execute(text("""
                INSERT INTO chemical_inventory 
                (name, cas_number, molecular_formula, molecular_weight, category, hazards, storage_conditions, quantity, unit, cost_per_unit, currency, supplier, location)
                VALUES (:name, :cas, :formula, :weight, :category, :hazards, :storage, :qty, :unit, :cost, :currency, :supplier, :location)
            """), {
                "name": chem[0], "cas": chem[1], "formula": chem[2], "weight": chem[3],
                "category": chem[4], "hazards": chem[5], "storage": chem[6], "qty": chem[7],
                "unit": chem[8], "cost": chem[9], "currency": chem[10], "supplier": chem[11], "location": chem[12]
            })
        
        print("  ✅ Created 3 sample chemicals")
        
        # Create sample account transactions
        print("  💰 Creating sample transactions...")
        transactions = [
            (1, "purchase", 100.0, "g", 250.0, "INR", "ChemSupply", "pending", "Sample purchase"),
            (2, "purchase", 50.0, "ml", 250.0, "INR", "AcidCorp", "completed", "Sample acid purchase"),
            (3, "purchase", 200.0, "ml", 600.0, "INR", "SolventCo", "pending", "Sample solvent purchase")
        ]
        
        for trans in transactions:
            db.execute(text("""
                INSERT INTO account_transactions 
                (chemical_id, transaction_type, quantity, unit, amount, currency, supplier, status, notes)
                VALUES (:chem_id, :type, :qty, :unit, :amount, :currency, :supplier, :status, :notes)
            """), {
                "chem_id": trans[0], "type": trans[1], "qty": trans[2], "unit": trans[3],
                "amount": trans[4], "currency": trans[5], "supplier": trans[6], "status": trans[7], "notes": trans[8]
            })
        
        print("  ✅ Created 3 sample transactions")
        
        db.commit()
        print("✅ Sample data created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Main function"""
    make_user_admin()
    create_sample_data()
    
    print("\n🎉 Setup Complete!")
    print("\n📋 Summary:")
    print("  ✅ User is now admin and approved")
    print("  ✅ Sample chemicals added")
    print("  ✅ Sample transactions added")
    print("\n🚀 Next steps:")
    print("  1. Start the server from the backend directory")
    print("  2. Test the account team dashboard")
    print("  3. Login with the admin user")

if __name__ == "__main__":
    main() 