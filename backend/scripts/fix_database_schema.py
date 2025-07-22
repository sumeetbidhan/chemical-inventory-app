#!/usr/bin/env python3
"""
Comprehensive database schema fix script
"""
import sys
import os
from sqlalchemy import text

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, SessionLocal

def drop_all_tables():
    """Drop all existing tables"""
    print("🗑️  Dropping all existing tables...")
    
    db = SessionLocal()
    
    try:
        # Drop tables in reverse dependency order
        tables_to_drop = [
            "purchase_order_items",
            "purchase_orders", 
            "account_transactions",
            "activity_logs",
            "alerts",
            "notifications",
            "formulation_details",
            "chemical_inventory",
            "users"
        ]
        
        for table in tables_to_drop:
            try:
                db.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                print(f"  ✅ Dropped table: {table}")
            except Exception as e:
                print(f"  ⚠️  Could not drop {table}: {e}")
        
        db.commit()
        print("✅ All tables dropped successfully!")
        
    except Exception as e:
        print(f"❌ Error dropping tables: {e}")
        db.rollback()
    finally:
        db.close()

def create_all_tables():
    """Create all tables with proper schema"""
    print("\n🔨 Creating all tables with proper schema...")
    
    db = SessionLocal()
    
    try:
        # Create users table
        print("  📋 Creating users table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                uid VARCHAR UNIQUE NOT NULL,
                email VARCHAR UNIQUE NOT NULL,
                first_name VARCHAR NOT NULL,
                last_name VARCHAR,
                phone VARCHAR,
                role VARCHAR NOT NULL DEFAULT 'lab_staff',
                is_approved BOOLEAN DEFAULT FALSE,
                is_online BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP WITH TIME ZONE
            )
        """))
        
        # Create chemical_inventory table
        print("  📋 Creating chemical_inventory table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS chemical_inventory (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                cas_number VARCHAR,
                molecular_formula VARCHAR,
                molecular_weight DECIMAL,
                category VARCHAR,
                hazards TEXT,
                storage_conditions TEXT,
                quantity DECIMAL DEFAULT 0,
                unit VARCHAR DEFAULT 'g',
                cost_per_unit DECIMAL,
                currency VARCHAR DEFAULT 'INR',
                supplier VARCHAR,
                location VARCHAR,
                expiry_date DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create account_transactions table
        print("  📋 Creating account_transactions table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS account_transactions (
                id SERIAL PRIMARY KEY,
                chemical_id INTEGER REFERENCES chemical_inventory(id),
                transaction_type VARCHAR NOT NULL,
                quantity DECIMAL NOT NULL,
                unit VARCHAR NOT NULL,
                amount DECIMAL NOT NULL,
                currency VARCHAR DEFAULT 'INR',
                supplier VARCHAR,
                purchase_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                delivery_date TIMESTAMP WITH TIME ZONE,
                status VARCHAR DEFAULT 'pending',
                notes TEXT,
                created_by VARCHAR REFERENCES users(uid),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create purchase_orders table
        print("  📋 Creating purchase_orders table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id SERIAL PRIMARY KEY,
                order_number VARCHAR UNIQUE NOT NULL,
                supplier VARCHAR NOT NULL,
                total_amount DECIMAL NOT NULL,
                currency VARCHAR DEFAULT 'INR',
                order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expected_delivery TIMESTAMP WITH TIME ZONE,
                status VARCHAR DEFAULT 'draft',
                notes TEXT,
                created_by VARCHAR REFERENCES users(uid),
                approved_by VARCHAR REFERENCES users(uid),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create purchase_order_items table
        print("  📋 Creating purchase_order_items table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id SERIAL PRIMARY KEY,
                purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
                chemical_id INTEGER REFERENCES chemical_inventory(id),
                quantity DECIMAL NOT NULL,
                unit VARCHAR NOT NULL,
                unit_price DECIMAL NOT NULL,
                total_price DECIMAL NOT NULL,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create activity_logs table
        print("  📋 Creating activity_logs table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                action VARCHAR NOT NULL,
                description TEXT,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                note TEXT
            )
        """))
        
        # Create notifications table
        print("  📋 Creating notifications table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                type VARCHAR NOT NULL,
                title VARCHAR NOT NULL,
                message TEXT NOT NULL,
                severity VARCHAR DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create alerts table
        print("  📋 Creating alerts table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS alerts (
                id SERIAL PRIMARY KEY,
                chemical_id INTEGER REFERENCES chemical_inventory(id),
                alert_type VARCHAR NOT NULL,
                message TEXT NOT NULL,
                severity VARCHAR DEFAULT 'warning',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        # Create formulation_details table
        print("  📋 Creating formulation_details table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS formulation_details (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                description TEXT,
                chemical_id INTEGER REFERENCES chemical_inventory(id),
                quantity DECIMAL NOT NULL,
                unit VARCHAR NOT NULL,
                percentage DECIMAL,
                created_by VARCHAR REFERENCES users(uid),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        db.commit()
        print("✅ All tables created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_indexes():
    """Create necessary indexes"""
    print("\n🔍 Creating indexes...")
    
    db = SessionLocal()
    
    try:
        # Create indexes for better performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid)",
            "CREATE INDEX IF NOT EXISTS idx_chemical_inventory_name ON chemical_inventory(name)",
            "CREATE INDEX IF NOT EXISTS idx_account_transactions_chemical_id ON account_transactions(chemical_id)",
            "CREATE INDEX IF NOT EXISTS idx_account_transactions_created_by ON account_transactions(created_by)",
            "CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON purchase_orders(order_number)",
            "CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_chemical_id ON alerts(chemical_id)"
        ]
        
        for index_sql in indexes:
            db.execute(text(index_sql))
            print(f"  ✅ Created index")
        
        db.commit()
        print("✅ All indexes created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
        db.rollback()
    finally:
        db.close()

def verify_schema():
    """Verify the schema is correct"""
    print("\n🔍 Verifying database schema...")
    
    db = SessionLocal()
    
    try:
        # Check all tables exist
        result = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        
        tables = [row[0] for row in result.fetchall()]
        expected_tables = [
            'users', 'chemical_inventory', 'account_transactions', 
            'purchase_orders', 'purchase_order_items', 'activity_logs',
            'notifications', 'alerts', 'formulation_details'
        ]
        
        print(f"  📊 Found {len(tables)} tables:")
        for table in tables:
            print(f"    - {table}")
        
        missing_tables = set(expected_tables) - set(tables)
        if missing_tables:
            print(f"  ❌ Missing tables: {missing_tables}")
        else:
            print("  ✅ All expected tables exist!")
        
        # Check users table structure
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """))
        
        print(f"  📋 Users table columns:")
        for row in result.fetchall():
            print(f"    - {row[0]}: {row[1]} (nullable: {row[2]})")
        
    except Exception as e:
        print(f"❌ Error verifying schema: {e}")
    finally:
        db.close()

def main():
    """Main function"""
    print("🚀 Database Schema Fix")
    print("=" * 60)
    
    # Drop all tables
    drop_all_tables()
    
    # Create all tables
    create_all_tables()
    
    # Create indexes
    create_indexes()
    
    # Verify schema
    verify_schema()
    
    print("\n✅ Database schema fix completed!")
    print("\n🎯 Next steps:")
    print("   1. Restart the backend server")
    print("   2. Test the account team dashboard")
    print("   3. Verify all endpoints work correctly")

if __name__ == "__main__":
    main() 