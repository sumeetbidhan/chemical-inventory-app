#!/usr/bin/env python3
"""
Test script for account team dashboard after schema fix
"""
import sys
import os
import requests
import json

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_account_endpoints():
    """Test account team dashboard endpoints"""
    print("🧪 Testing Account Team Dashboard Endpoints")
    print("=" * 60)
    
    try:
        # Test health endpoint
        print("\n1. Testing health endpoint...")
        response = requests.get('http://localhost:8000/health')
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        # Test CORS headers
        print("\n2. Testing CORS headers...")
        response = requests.options('http://localhost:8000/account/transactions')
        print(f"   Status: {response.status_code}")
        print(f"   CORS Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"     {header}: {value}")
        
        # Test GET transactions without auth (should return 401)
        print("\n3. Testing GET /account/transactions without auth...")
        response = requests.get('http://localhost:8000/account/transactions')
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        # Test POST transaction without auth (should return 401)
        print("\n4. Testing POST /account/transactions without auth...")
        test_data = {
            "chemical_id": 1,
            "transaction_type": "purchase",
            "quantity": 100.0,
            "unit": "g",
            "amount": 500.0,
            "currency": "INR",
            "supplier": "Test Supplier",
            "status": "pending",
            "notes": "Test transaction"
        }
        response = requests.post('http://localhost:8000/account/transactions', 
                               json=test_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        # Test recent transactions endpoint
        print("\n5. Testing GET /account/recent-transactions without auth...")
        response = requests.get('http://localhost:8000/account/recent-transactions')
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
    except Exception as e:
        print(f"   Error: {e}")

def check_database_tables():
    """Check if database tables exist and have correct structure"""
    print("\n📊 Checking Database Tables")
    print("=" * 60)
    
    try:
        from app.database import SessionLocal
        from sqlalchemy import text
        
        db = SessionLocal()
        
        # Check if tables exist
        result = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        
        tables = [row[0] for row in result.fetchall()]
        print(f"Found {len(tables)} tables:")
        for table in tables:
            print(f"  - {table}")
        
        # Check account_transactions table structure
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'account_transactions'
            ORDER BY ordinal_position
        """))
        
        print(f"\nAccount transactions table columns:")
        for row in result.fetchall():
            print(f"  - {row[0]}: {row[1]} (nullable: {row[2]})")
        
        # Check if there are any transactions
        result = db.execute(text("SELECT COUNT(*) FROM account_transactions"))
        count = result.fetchone()[0]
        print(f"\nAccount transactions count: {count}")
        
        # Check if there are any chemicals
        result = db.execute(text("SELECT COUNT(*) FROM chemical_inventory"))
        count = result.fetchone()[0]
        print(f"Chemical inventory count: {count}")
        
        # Check if there are any users
        result = db.execute(text("SELECT COUNT(*) FROM users"))
        count = result.fetchone()[0]
        print(f"Users count: {count}")
        
        db.close()
        
    except Exception as e:
        print(f"Error checking database: {e}")

def main():
    """Main function"""
    test_account_endpoints()
    check_database_tables()
    
    print("\n💡 Test complete!")
    print("\n🎯 Results:")
    print("   1. Server should be running on http://localhost:8000")
    print("   2. CORS headers should be properly configured")
    print("   3. Account endpoints should return 401 for unauthenticated requests")
    print("   4. Database schema should be properly set up")

if __name__ == "__main__":
    main() 