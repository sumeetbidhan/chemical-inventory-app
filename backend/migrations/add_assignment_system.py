#!/usr/bin/env python3
"""
Migration script to add product assignment system
"""
import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_engine(DATABASE_URL)

def create_assignment_system():
    """Create the product assignment system tables"""
    print("🔧 Creating Product Assignment System Tables")
    print("=" * 60)
    
    with engine.connect() as connection:
        try:
            # 1. Create product_assignments table
            print("📋 Creating product_assignments table...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS product_assignments (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES chemical_products(id) ON DELETE CASCADE,
                    assigned_to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    assigned_by_admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    team_type VARCHAR(20) NOT NULL CHECK (team_type IN ('LAB_STAFF', 'PRODUCT_TEAM')),
                    quantity_requested DOUBLE PRECISION NOT NULL,
                    unit VARCHAR(50) NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED')),
                    
                    -- Time Management
                    time_allotted_minutes INTEGER NOT NULL,
                    started_at TIMESTAMP WITH TIME ZONE,
                    expires_at TIMESTAMP WITH TIME ZONE,
                    otp_token VARCHAR(255),
                    otp_expires_at TIMESTAMP WITH TIME ZONE,
                    
                    -- Progress Tracking
                    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            print("✅ product_assignments table created")
            
            # 2. Create extension_requests table
            print("📋 Creating extension_requests table...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS extension_requests (
                    id SERIAL PRIMARY KEY,
                    assignment_id INTEGER NOT NULL REFERENCES product_assignments(id) ON DELETE CASCADE,
                    requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    reason TEXT NOT NULL,
                    current_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
                    requested_extension_minutes INTEGER NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
                    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    approved_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            print("✅ extension_requests table created")
            
            # 3. Create formulation_progress table for tracking individual components
            print("📋 Creating formulation_progress table...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS formulation_progress (
                    id SERIAL PRIMARY KEY,
                    assignment_id INTEGER NOT NULL REFERENCES product_assignments(id) ON DELETE CASCADE,
                    component_chemical_id INTEGER NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
                    quantity_required DOUBLE PRECISION NOT NULL,
                    unit VARCHAR(50) NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
                    completed_at TIMESTAMP WITH TIME ZONE,
                    completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            print("✅ formulation_progress table created")
            
            # 4. Add indexes for better performance
            print("📋 Creating indexes...")
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_product_assignments_product_id ON product_assignments(product_id);
                CREATE INDEX IF NOT EXISTS idx_product_assignments_assigned_to ON product_assignments(assigned_to_user_id);
                CREATE INDEX IF NOT EXISTS idx_product_assignments_status ON product_assignments(status);
                CREATE INDEX IF NOT EXISTS idx_product_assignments_expires_at ON product_assignments(expires_at);
                CREATE INDEX IF NOT EXISTS idx_extension_requests_assignment_id ON extension_requests(assignment_id);
                CREATE INDEX IF NOT EXISTS idx_extension_requests_status ON extension_requests(status);
                CREATE INDEX IF NOT EXISTS idx_formulation_progress_assignment_id ON formulation_progress(assignment_id);
                CREATE INDEX IF NOT EXISTS idx_formulation_progress_status ON formulation_progress(status);
            """))
            print("✅ Indexes created")
            
            # 5. Add admin_phone_number to users table if it doesn't exist
            print("📋 Checking admin phone number field...")
            try:
                connection.execute(text("""
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_phone_number VARCHAR(20)
                """))
                print("✅ admin_phone_number field added/verified")
            except Exception as e:
                print(f"⚠️  Could not add admin_phone_number field: {e}")
            
            connection.commit()
            print("\n🎉 Product Assignment System tables created successfully!")
            
        except Exception as e:
            print(f"❌ Error creating tables: {e}")
            connection.rollback()
            raise

def verify_tables():
    """Verify that all tables were created correctly"""
    print("\n🔍 Verifying table creation...")
    print("=" * 40)
    
    with engine.connect() as connection:
        try:
            tables = ['product_assignments', 'extension_requests', 'formulation_progress']
            for table in tables:
                result = connection.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.fetchone()[0]
                print(f"✅ {table}: {count} records")
            
            # Check table structure
            print("\n📊 Table structures:")
            for table in tables:
                result = connection.execute(text(f"""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' 
                    ORDER BY ordinal_position
                """))
                print(f"\n{table} table:")
                for row in result.fetchall():
                    default = f" (default: {row[3]})" if row[3] else ""
                    print(f"   {row[0]}: {row[1]} ({'NULL' if row[2] == 'YES' else 'NOT NULL'}){default}")
            
            print("\n✅ Table verification completed!")
            
        except Exception as e:
            print(f"❌ Error verifying tables: {e}")
            raise

def main():
    """Main function"""
    print("🚀 Product Assignment System Migration")
    print("=" * 60)
    try:
        create_assignment_system()
        verify_tables()
        print("\n🎉 Migration completed successfully!")
        print("\nNext steps:")
        print("1. Create the new models")
        print("2. Create the assignment service")
        print("3. Create the new router")
        print("4. Update the frontend")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("Please check the error and try again")
        sys.exit(1)

if __name__ == "__main__":
    main()

