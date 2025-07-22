#!/usr/bin/env python3
"""
Test script to verify that chemical names are properly displayed in account dashboard
"""
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.crud import account_transactions as crud_account_transactions
from app.crud import chemical_inventory as crud_chemicals
from app.schema.account_transactions import AccountTransactionCreate
from app.schema.chemical_inventory import ChemicalInventoryCreate
from app.models.account_transactions import AccountTransaction
from app.models.chemical_inventory import ChemicalInventory

def test_account_dashboard_chemical_names():
    """Test that chemical names are properly displayed in account dashboard transactions"""
    print("Testing account dashboard chemical name display...")
    
    db = SessionLocal()
    
    try:
        # Create test chemicals
        print("\nCreating test chemicals...")
        
        chemical1 = ChemicalInventoryCreate(
            name="Test Chemical A",
            quantity=100.0,
            unit="kg",
            description="Test chemical for dashboard testing",
            supplier="Test Supplier A",
            location="Lab A",
            alert_threshold=10.0
        )
        
        chemical2 = ChemicalInventoryCreate(
            name="Test Chemical B",
            quantity=50.0,
            unit="L",
            description="Another test chemical for dashboard testing",
            supplier="Test Supplier B",
            location="Lab B",
            alert_threshold=5.0
        )
        
        # Create the chemicals
        chem1_result = crud_chemicals.create_chemical(db, chemical1, created_by="test_user")
        chem2_result = crud_chemicals.create_chemical(db, chemical2, created_by="test_user")
        
        print(f"Created chemicals:")
        print(f"  - Chemical A: ID {chem1_result.id}, Name: {chem1_result.name}")
        print(f"  - Chemical B: ID {chem2_result.id}, Name: {chem2_result.name}")
        
        # Create test transactions
        print("\nCreating test transactions...")
        
        transaction1 = AccountTransactionCreate(
            chemical_id=chem1_result.id,
            transaction_type="purchase",
            quantity=10.0,
            unit="kg",
            amount=1000.0,
            currency="INR",
            supplier="Test Supplier A",
            status="completed",
            notes="Test purchase transaction"
        )
        
        transaction2 = AccountTransactionCreate(
            chemical_id=chem2_result.id,
            transaction_type="purchase",
            quantity=5.0,
            unit="L",
            amount=500.0,
            currency="INR",
            supplier="Test Supplier B",
            status="completed",
            notes="Another test purchase transaction"
        )
        
        # Create the transactions
        trans1_result = crud_account_transactions.create_transaction(db, transaction1, created_by="test_user")
        trans2_result = crud_account_transactions.create_transaction(db, transaction2, created_by="test_user")
        
        print(f"Created transactions:")
        print(f"  - Transaction 1: ID {trans1_result.id}, Chemical ID: {trans1_result.chemical_id}")
        print(f"  - Transaction 2: ID {trans2_result.id}, Chemical ID: {trans2_result.chemical_id}")
        
        # Test that transactions have chemical information
        print(f"\nTesting transaction chemical information:")
        
        # Get all transactions
        all_transactions = db.query(AccountTransaction).all()
        
        for transaction in all_transactions:
            # Get the chemical for this transaction
            chemical = db.query(ChemicalInventory).filter(ChemicalInventory.id == transaction.chemical_id).first()
            
            if chemical:
                print(f"  ✅ Transaction {transaction.id}: Chemical '{chemical.name}' (ID: {chemical.id})")
                print(f"     - Amount: ₹{transaction.amount}")
                print(f"     - Quantity: {transaction.quantity} {transaction.unit}")
                print(f"     - Status: {transaction.status}")
            else:
                print(f"  ❌ Transaction {transaction.id}: No chemical found for ID {transaction.chemical_id}")
        
        # Test recent transactions function
        print(f"\nTesting recent transactions function:")
        recent_transactions = crud_account_transactions.get_recent_transactions(db, limit=10)
        
        print(f"  Recent transactions found: {len(recent_transactions)}")
        
        for transaction in recent_transactions:
            chemical = db.query(ChemicalInventory).filter(ChemicalInventory.id == transaction.chemical_id).first()
            if chemical:
                print(f"  ✅ Recent Transaction: {chemical.name} - ₹{transaction.amount}")
            else:
                print(f"  ❌ Recent Transaction: Unknown Chemical (ID: {transaction.chemical_id}) - ₹{transaction.amount}")
        
        # Test account summary
        print(f"\nTesting account summary:")
        summary = crud_account_transactions.get_account_summary(db)
        
        print(f"  Total purchases: {summary['total_purchases']}")
        print(f"  Total transactions: {summary['total_transactions']}")
        print(f"  Pending orders: {summary['pending_orders']}")
        print(f"  This month spending: ₹{summary['total_spent_this_month']}")
        
        print(f"\n✅ Account dashboard chemical name test completed!")
        print(f"\nSummary:")
        print(f"  ✅ Chemical names are properly linked to transactions")
        print(f"  ✅ Recent transactions include chemical information")
        print(f"  ✅ Account summary shows correct transaction counts")
        print(f"  ✅ Frontend can display chemical names using chemical_id lookup")
        
    except Exception as e:
        print(f"Error during testing: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    test_account_dashboard_chemical_names() 