#!/usr/bin/env python3
"""
Database Migration Script for Updated Chemical Inventory System
Updates the existing schema to match the new unified chemical structure
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def update_chemical_system():
    """Update the existing chemical system schema"""
    
    print("🔄 Starting chemical system schema update...")
    
    with engine.connect() as connection:
        try:
            # Check if we need to add new columns
            metadata = MetaData()
            metadata.reflect(bind=engine)
            
            # 1. Update chemicals table
            print("📝 Updating chemicals table...")
            
            # Add is_manufactured column if it doesn't exist
            try:
                connection.execute(text("""
                    ALTER TABLE chemicals 
                    ADD COLUMN IF NOT EXISTS is_manufactured BOOLEAN DEFAULT FALSE
                """))
                print("✅ Added is_manufactured column to chemicals table")
            except Exception as e:
                print(f"⚠️  is_manufactured column already exists or error: {e}")
            
            # 2. Update chemical_products table
            print("📝 Updating chemical_products table...")
            
            # Add chemical_id column if it doesn't exist
            try:
                connection.execute(text("""
                    ALTER TABLE chemical_products 
                    ADD COLUMN IF NOT EXISTS chemical_id INTEGER
                """))
                print("✅ Added chemical_id column to chemical_products table")
            except Exception as e:
                print(f"⚠️  chemical_id column already exists or error: {e}")
            
            # Rename total_quantity to base_composition_qty if it exists
            try:
                connection.execute(text("""
                    ALTER TABLE chemical_products 
                    RENAME COLUMN total_quantity TO base_composition_qty
                """))
                print("✅ Renamed total_quantity to base_composition_qty")
            except Exception as e:
                print(f"⚠️  Column rename failed or not needed: {e}")
            
            # 3. Update formulations table
            print("📝 Updating formulations table...")
            
            # Remove component_type column if it exists
            try:
                connection.execute(text("""
                    ALTER TABLE formulations 
                    DROP COLUMN IF EXISTS component_type
                """))
                print("✅ Removed component_type column from formulations table")
            except Exception as e:
                print(f"⚠️  component_type column removal failed or not needed: {e}")
            
            # Rename component_id to component_chemical_id if it exists
            try:
                connection.execute(text("""
                    ALTER TABLE formulations 
                    RENAME COLUMN component_id TO component_chemical_id
                """))
                print("✅ Renamed component_id to component_chemical_id")
            except Exception as e:
                print(f"⚠️  Column rename failed or not needed: {e}")
            
            # Add foreign key constraint for component_chemical_id
            try:
                connection.execute(text("""
                    ALTER TABLE formulations 
                    ADD CONSTRAINT fk_formulations_component_chemical 
                    FOREIGN KEY (component_chemical_id) REFERENCES chemicals(id)
                """))
                print("✅ Added foreign key constraint for component_chemical_id")
            except Exception as e:
                print(f"⚠️  Foreign key constraint already exists or error: {e}")
            
            # Add foreign key constraint for chemical_id in chemical_products
            try:
                connection.execute(text("""
                    ALTER TABLE chemical_products 
                    ADD CONSTRAINT fk_chemical_products_chemical 
                    FOREIGN KEY (chemical_id) REFERENCES chemicals(id)
                """))
                print("✅ Added foreign key constraint for chemical_id in chemical_products")
            except Exception as e:
                print(f"⚠️  Foreign key constraint already exists or error: {e}")
            
            # 4. Create indexes for better performance
            print("📝 Creating performance indexes...")
            
            try:
                connection.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_chemicals_is_manufactured 
                    ON chemicals(is_manufactured)
                """))
                print("✅ Created index on chemicals.is_manufactured")
            except Exception as e:
                print(f"⚠️  Index creation failed: {e}")
            
            try:
                connection.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_formulations_component_chemical 
                    ON formulations(component_chemical_id)
                """))
                print("✅ Created index on formulations.component_chemical_id")
            except Exception as e:
                print(f"⚠️  Index creation failed: {e}")
            
            try:
                connection.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_chemical_products_chemical 
                    ON chemical_products(chemical_id)
                """))
                print("✅ Created index on chemical_products.chemical_id")
            except Exception as e:
                print(f"⚠️  Index creation failed: {e}")
            
            connection.commit()
            print("✅ Schema update completed successfully!")
            
        except Exception as e:
            print(f"❌ Schema update failed: {e}")
            connection.rollback()
            raise

def migrate_existing_data():
    """Migrate existing data to match new schema"""
    
    print("🔄 Starting data migration...")
    
    with engine.connect() as connection:
        try:
            # 1. Create manufactured chemicals for existing products
            print("📝 Creating manufactured chemicals for existing products...")
            
            # Get all existing chemical products
            result = connection.execute(text("""
                SELECT id, name, base_composition_qty, unit 
                FROM chemical_products 
                WHERE chemical_id IS NULL
            """))
            
            existing_products = result.fetchall()
            
            for product in existing_products:
                product_id, name, base_composition_qty, unit = product
                
                # Create a chemical entry for this product
                chemical_result = connection.execute(text("""
                    INSERT INTO chemicals (name, unit, available_qty, threshold_qty, is_manufactured, created_at)
                    VALUES (%s, %s, 0, 0, TRUE, NOW())
                    RETURNING id
                """), (name, unit))
                
                chemical_id = chemical_result.fetchone()[0]
                
                # Update the chemical_product to reference the new chemical
                connection.execute(text("""
                    UPDATE chemical_products 
                    SET chemical_id = %s 
                    WHERE id = %s
                """), (chemical_id, product_id))
                
                print(f"✅ Created chemical for product: {name} (ID: {chemical_id})")
            
            # 2. Update any formulations that might have invalid component references
            print("📝 Validating formulation component references...")
            
            # Find formulations with invalid component references
            invalid_formulations = connection.execute(text("""
                SELECT f.id, f.component_chemical_id 
                FROM formulations f 
                LEFT JOIN chemicals c ON f.component_chemical_id = c.id 
                WHERE c.id IS NULL
            """)).fetchall()
            
            if invalid_formulations:
                print(f"⚠️  Found {len(invalid_formulations)} formulations with invalid component references")
                print("   These will need manual review and correction")
            
            connection.commit()
            print("✅ Data migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Data migration failed: {e}")
            connection.rollback()
            raise

def verify_schema():
    """Verify the updated schema"""
    
    print("🔍 Verifying updated schema...")
    
    with engine.connect() as connection:
        try:
            # Check chemicals table structure
            result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'chemicals' 
                ORDER BY ordinal_position
            """))
            
            print("📊 Chemicals table structure:")
            for row in result.fetchall():
                print(f"   {row[0]}: {row[1]} ({'NULL' if row[2] == 'YES' else 'NOT NULL'})")
            
            # Check chemical_products table structure
            result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'chemical_products' 
                ORDER BY ordinal_position
            """))
            
            print("📊 Chemical_products table structure:")
            for row in result.fetchall():
                print(f"   {row[0]}: {row[1]} ({'NULL' if row[2] == 'YES' else 'NOT NULL'})")
            
            # Check formulations table structure
            result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'formulations' 
                ORDER BY ordinal_position
            """))
            
            print("📊 Formulations table structure:")
            for row in result.fetchall():
                print(f"   {row[0]}: {row[1]} ({'NULL' if row[2] == 'YES' else 'NOT NULL'})")
            
            # Check sample data
            print("📊 Sample data verification:")
            
            chemicals_count = connection.execute(text("SELECT COUNT(*) FROM chemicals")).fetchone()[0]
            products_count = connection.execute(text("SELECT COUNT(*) FROM chemical_products")).fetchone()[0]
            formulations_count = connection.execute(text("SELECT COUNT(*) FROM formulations")).fetchone()[0]
            
            print(f"   Chemicals: {chemicals_count}")
            print(f"   Products: {products_count}")
            print(f"   Formulations: {formulations_count}")
            
            print("✅ Schema verification completed!")
            
        except Exception as e:
            print(f"❌ Schema verification failed: {e}")
            raise

def main():
    """Main migration function"""
    
    print("🚀 Chemical Inventory System Schema Update")
    print("=" * 50)
    
    try:
        # Step 1: Update schema
        update_chemical_system()
        
        # Step 2: Migrate existing data
        migrate_existing_data()
        
        # Step 3: Verify schema
        verify_schema()
        
        print("\n🎉 Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart your backend server")
        print("2. Test the new API endpoints")
        print("3. Verify that all data is accessible")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("Please check the error and try again")
        sys.exit(1)

if __name__ == "__main__":
    main()
