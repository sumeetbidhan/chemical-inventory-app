#!/usr/bin/env python3
"""
OTP Deployment Setup Script

This script helps configure OTP services for production deployment.
Run this script to test and configure your OTP setup.
"""

import os
import sys
import json
from datetime import datetime

def print_header(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_section(title):
    print(f"\n--- {title} ---")

def check_environment():
    """Check if required environment variables are set"""
    print_header("Environment Check")
    
    required_vars = {
        "DATABASE_URL": "Database connection string",
        "FIREBASE_PROJECT_ID": "Firebase project ID",
        "FIREBASE_PRIVATE_KEY": "Firebase private key",
        "FIREBASE_CLIENT_EMAIL": "Firebase client email"
    }
    
    sms_provider = os.getenv("SMS_PROVIDER", "twilio").lower()
    
    if sms_provider == "twilio":
        sms_vars = {
            "TWILIO_ACCOUNT_SID": "Twilio Account SID",
            "TWILIO_AUTH_TOKEN": "Twilio Auth Token", 
            "TWILIO_PHONE_NUMBER": "Twilio phone number"
        }
    elif sms_provider == "aws_sns":
        sms_vars = {
            "AWS_ACCESS_KEY_ID": "AWS Access Key ID",
            "AWS_SECRET_ACCESS_KEY": "AWS Secret Access Key",
            "AWS_REGION": "AWS Region"
        }
    else:
        sms_vars = {}
    
    redis_vars = {
        "REDIS_HOST": "Redis host (optional, defaults to localhost)",
        "REDIS_PORT": "Redis port (optional, defaults to 6379)",
        "REDIS_PASSWORD": "Redis password (optional)",
        "REDIS_DB": "Redis database (optional, defaults to 0)"
    }
    
    all_vars = {**required_vars, **sms_vars, **redis_vars}
    
    missing_vars = []
    present_vars = []
    
    for var, description in all_vars.items():
        value = os.getenv(var)
        if value:
            present_vars.append(f"✅ {var}: {description}")
        else:
            missing_vars.append(f"❌ {var}: {description}")
    
    print("Present environment variables:")
    for var in present_vars:
        print(f"  {var}")
    
    if missing_vars:
        print("\nMissing environment variables:")
        for var in missing_vars:
            print(f"  {var}")
        
        print(f"\n⚠️  Please set the missing environment variables before deployment.")
        return False
    else:
        print("\n✅ All required environment variables are set!")
        return True

def test_redis_connection():
    """Test Redis connection"""
    print_section("Redis Connection Test")
    
    try:
        import redis
        
        host = os.getenv("REDIS_HOST", "localhost")
        port = int(os.getenv("REDIS_PORT", 6379))
        password = os.getenv("REDIS_PASSWORD")
        db = int(os.getenv("REDIS_DB", 0))
        
        print(f"Attempting to connect to Redis at {host}:{port}...")
        
        client = redis.Redis(
            host=host,
            port=port,
            password=password,
            db=db,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        
        # Test connection
        response = client.ping()
        if response:
            print("✅ Redis connection successful!")
            
            # Test OTP storage
            test_key = "test_otp:1234567890"
            test_data = {
                "otp": "123456",
                "user_id": 1,
                "expires_at": datetime.now().isoformat(),
                "attempts": 0
            }
            
            client.setex(test_key, 60, json.dumps(test_data))
            stored_data = client.get(test_key)
            client.delete(test_key)
            
            if stored_data:
                print("✅ Redis OTP storage test successful!")
            else:
                print("❌ Redis OTP storage test failed!")
                return False
                
        else:
            print("❌ Redis connection failed!")
            return False
            
    except ImportError:
        print("❌ Redis package not installed. Install with: pip install redis")
        return False
    except Exception as e:
        print(f"❌ Redis connection error: {e}")
        return False
    
    return True

def test_sms_provider():
    """Test SMS provider configuration"""
    print_section("SMS Provider Test")
    
    sms_provider = os.getenv("SMS_PROVIDER", "twilio").lower()
    
    if sms_provider == "twilio":
        return test_twilio()
    elif sms_provider == "aws_sns":
        return test_aws_sns()
    else:
        print(f"❌ Unknown SMS provider: {sms_provider}")
        return False

def test_twilio():
    """Test Twilio configuration"""
    try:
        from twilio.rest import Client
        
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        phone_number = os.getenv("TWILIO_PHONE_NUMBER")
        
        if not all([account_sid, auth_token, phone_number]):
            print("❌ Twilio credentials not found in environment variables")
            return False
        
        print("Testing Twilio configuration...")
        
        client = Client(account_sid, auth_token)
        
        # Test account info
        account = client.api.accounts(account_sid).fetch()
        print(f"✅ Twilio account verified: {account.friendly_name}")
        
        # Test phone number
        numbers = client.incoming_phone_numbers.list(phone_number=phone_number)
        if numbers:
            print(f"✅ Twilio phone number verified: {phone_number}")
        else:
            print(f"❌ Twilio phone number not found: {phone_number}")
            return False
        
        return True
        
    except ImportError:
        print("❌ Twilio package not installed. Install with: pip install twilio")
        return False
    except Exception as e:
        print(f"❌ Twilio test failed: {e}")
        return False

def test_aws_sns():
    """Test AWS SNS configuration"""
    try:
        import boto3
        
        access_key = os.getenv("AWS_ACCESS_KEY_ID")
        secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        region = os.getenv("AWS_REGION", "us-east-1")
        
        if not all([access_key, secret_key]):
            print("❌ AWS credentials not found in environment variables")
            return False
        
        print("Testing AWS SNS configuration...")
        
        sns = boto3.client(
            'sns',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        
        # Test SNS access
        response = sns.list_platform_applications()
        print("✅ AWS SNS access verified!")
        
        return True
        
    except ImportError:
        print("❌ boto3 package not installed. Install with: pip install boto3")
        return False
    except Exception as e:
        print(f"❌ AWS SNS test failed: {e}")
        return False

def generate_env_template():
    """Generate environment template file"""
    print_section("Environment Template")
    
    template = """# Chemical Inventory App - Environment Configuration

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url

# SMS Provider Configuration
# Choose one: twilio or aws_sns
SMS_PROVIDER=twilio

# Twilio Configuration (if using Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AWS SNS Configuration (if using AWS SNS)
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# AWS_REGION=us-east-1

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# OTP Configuration
OTP_EXPIRY_MINUTES=10
MAX_OTP_ATTEMPTS_PER_HOUR=5
MAX_OTP_ATTEMPTS_PER_DAY=20

# App Configuration
ENVIRONMENT=production
DEBUG=false
"""
    
    with open(".env.template", "w") as f:
        f.write(template)
    
    print("✅ Environment template created: .env.template")
    print("📝 Copy this file to .env and fill in your actual values")

def show_deployment_instructions():
    """Show deployment instructions"""
    print_header("Deployment Instructions")
    
    print("""
1. SET UP SMS PROVIDER:
   - Twilio: Create account at https://www.twilio.com/
   - AWS SNS: Set up AWS account and SNS service
   
2. SET UP REDIS:
   - Redis Cloud: https://redis.com/ (free tier available)
   - AWS ElastiCache: Create Redis cluster
   - Self-hosted: Install Redis on your server
   
3. CONFIGURE ENVIRONMENT:
   - Copy .env.template to .env
   - Fill in your actual credentials
   - Set SMS_PROVIDER to your chosen provider
   
4. DEPLOY:
   - Deploy to your chosen platform (Heroku, Railway, etc.)
   - Set environment variables in your deployment platform
   - Test OTP functionality
   
5. MONITOR:
   - Check logs for OTP sending status
   - Monitor SMS costs
   - Set up alerts for failures
""")

def main():
    """Main function"""
    print_header("OTP Deployment Setup")
    
    print("This script will help you configure OTP services for production deployment.")
    
    # Check environment
    env_ok = check_environment()
    
    if not env_ok:
        print("\n⚠️  Please set up your environment variables first.")
        generate_env_template()
        show_deployment_instructions()
        return
    
    # Test Redis
    redis_ok = test_redis_connection()
    
    # Test SMS provider
    sms_ok = test_sms_provider()
    
    # Summary
    print_header("Setup Summary")
    
    if env_ok and redis_ok and sms_ok:
        print("✅ All tests passed! Your OTP setup is ready for deployment.")
        print("\nNext steps:")
        print("1. Deploy your application")
        print("2. Test OTP functionality with real phone numbers")
        print("3. Monitor logs and costs")
    else:
        print("❌ Some tests failed. Please fix the issues above before deployment.")
        
        if not redis_ok:
            print("\nRedis issues:")
            print("- Install Redis: sudo apt install redis-server")
            print("- Or use Redis Cloud: https://redis.com/")
            
        if not sms_ok:
            print("\nSMS provider issues:")
            print("- Set up Twilio account: https://www.twilio.com/")
            print("- Or configure AWS SNS")
    
    print("\nFor detailed instructions, see: DEPLOYMENT_OTP_GUIDE.md")

if __name__ == "__main__":
    main() 