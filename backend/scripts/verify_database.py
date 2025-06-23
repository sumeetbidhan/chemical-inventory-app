#!/usr/bin/env python3
"""
Script to verify database setup and show table information
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, check_database_connection
from app.models.user import User, UserRole
from app.models.invitation import Invitation, InvitationStatus
from app.models.activity_log import ActivityLog
from sqlalchemy import text

def verify_database_connection():
    """Verify database connection"""
    print("🔍 Verifying database connection...")
    
    if check_database_connection():
        print("✅ Database connection successful!")
        return True
    else:
        print("❌ Database connection failed!")
        return False

def check_tables():
    """Check if all required tables exist"""
    print("\n📋 Checking database tables...")
    
    try:
        with engine.connect() as connection:
            # Check if tables exist
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('users', 'invitations', 'activity_logs')
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result]
            
            required_tables = ['users', 'invitations', 'activity_logs']
            missing_tables = [table for table in required_tables if table not in tables]
            
            if missing_tables:
                print(f"❌ Missing tables: {missing_tables}")
                return False
            else:
                print("✅ All required tables exist!")
                for table in tables:
                    print(f"   - {table}")
                return True
                
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False

def show_table_counts():
    """Show record counts for each table"""
    print("\n📊 Table record counts:")
    
    db = SessionLocal()
    try:
        # Count users
        user_count = db.query(User).count()
        print(f"   Users: {user_count}")
        
        # Count invitations
        invitation_count = db.query(Invitation).count()
        print(f"   Invitations: {invitation_count}")
        
        # Count activity logs
        log_count = db.query(ActivityLog).count()
        print(f"   Activity Logs: {log_count}")
        
    except Exception as e:
        print(f"❌ Error counting records: {e}")
    finally:
        db.close()

def show_admin_users():
    """Show admin users"""
    print("\n👑 Admin users:")
    
    db = SessionLocal()
    try:
        admin_users = db.query(User).filter(User.role == UserRole.ADMIN).all()
        
        if admin_users:
            for admin in admin_users:
                print(f"   - {admin.email} (ID: {admin.id}, Approved: {admin.is_approved})")
        else:
            print("   No admin users found")
            
    except Exception as e:
        print(f"❌ Error checking admin users: {e}")
    finally:
        db.close()

def show_recent_activity():
    """Show recent activity logs"""
    print("\n📝 Recent activity logs:")
    
    db = SessionLocal()
    try:
        recent_logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(5).all()
        
        if recent_logs:
            for log in recent_logs:
                print(f"   - {log.timestamp}: {log.action} - {log.description}")
        else:
            print("   No activity logs found")
            
    except Exception as e:
        print(f"❌ Error checking activity logs: {e}")
    finally:
        db.close()

def show_database_info():
    """Show database information"""
    print("\n🗄️ Database information:")
    
    try:
        with engine.connect() as connection:
            # Get database name
            result = connection.execute(text("SELECT current_database()"))
            db_name = result.fetchone()[0]
            print(f"   Database: {db_name}")
            
            # Get PostgreSQL version
            result = connection.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"   PostgreSQL: {version.split(',')[0]}")
            
    except Exception as e:
        print(f"❌ Error getting database info: {e}")

if __name__ == "__main__":
    print("🔍 Chemical Inventory - Database Verification")
    print("=" * 50)
    
    # Verify connection
    if not verify_database_connection():
        print("\n❌ Cannot proceed without database connection")
        sys.exit(1)
    
    # Show database info
    show_database_info()
    
    # Check tables
    if not check_tables():
        print("\n❌ Database tables are not properly set up")
        print("💡 Run the server first: uvicorn app.main:app --reload")
        sys.exit(1)
    
    # Show table counts
    show_table_counts()
    
    # Show admin users
    show_admin_users()
    
    # Show recent activity
    show_recent_activity()
    
    print("\n✅ Database verification complete!") 