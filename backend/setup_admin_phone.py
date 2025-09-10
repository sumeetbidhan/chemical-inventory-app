#!/usr/bin/env python3
"""
Setup script to configure admin phone number for OTP delivery
Run this script to set up the admin phone number for receiving OTPs
"""

import os
import sys
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User

def setup_admin_phone():
    """Set up admin phone number for OTP delivery"""
    
    print("🔧 Admin Phone Number Setup for OTP Delivery")
    print("=" * 50)
    
    # Get admin phone number from user
    admin_phone = input("Enter admin phone number (e.g., +1234567890): ").strip()
    
    if not admin_phone:
        print("❌ Phone number is required!")
        return False
    
    # Validate phone number format
    import re
    cleaned = re.sub(r'[^\d+]', '', admin_phone)
    if not re.match(r'^\+?1?\d{9,15}$', cleaned):
        print("❌ Invalid phone number format. Please use international format (e.g., +1234567890)")
        return False
    
    # Get database session
    db = next(get_db())
    
    try:
        # Find admin user
        admin = db.query(User).filter(User.role == "admin").first()
        
        if not admin:
            print("❌ No admin user found in database!")
            print("   Please create an admin user first.")
            return False
        
        # Update admin phone number
        admin.admin_phone_number = admin_phone
        db.commit()
        
        print(f"✅ Admin phone number updated successfully!")
        print(f"   Admin: {admin.first_name} {admin.last_name or ''}")
        print(f"   Phone: {admin_phone}")
        print(f"   Email: {admin.email}")
        
        # Test AWS SNS configuration
        print("\n🔍 Testing AWS SNS Configuration...")
        
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        if aws_access_key and aws_secret_key:
            print(f"✅ AWS credentials found")
            print(f"   Region: {aws_region}")
            print(f"   Access Key: {aws_access_key[:8]}...")
            
            # Test AWS SNS connection
            try:
                import boto3
                sns_client = boto3.client(
                    'sns',
                    aws_access_key_id=aws_access_key,
                    aws_secret_access_key=aws_secret_key,
                    region_name=aws_region
                )
                
                # Test by getting topic list (this will fail if credentials are wrong)
                sns_client.list_topics()
                print("✅ AWS SNS connection successful!")
                
            except Exception as e:
                print(f"❌ AWS SNS connection failed: {e}")
                print("   Please check your AWS credentials and region.")
                return False
        else:
            print("⚠️ AWS credentials not found in environment variables")
            print("   Set the following environment variables:")
            print("   - AWS_ACCESS_KEY_ID")
            print("   - AWS_SECRET_ACCESS_KEY")
            print("   - AWS_REGION (optional, defaults to us-east-1)")
            return False
        
        print("\n🎉 Setup completed successfully!")
        print("   All OTPs will now be sent to the admin phone number.")
        print("   Users will need to contact the admin to get OTP codes.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up admin phone: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = setup_admin_phone()
    sys.exit(0 if success else 1)
