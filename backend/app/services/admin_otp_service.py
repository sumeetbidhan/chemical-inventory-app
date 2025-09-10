"""
Admin OTP Service for Chemical Inventory System
Sends all OTPs to a single admin phone number instead of individual users
"""

import os
import random
import string
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict
import redis
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
from sqlalchemy.orm import Session

from app.crud.activity_log import create_activity_log
from app.models.user import User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Redis for OTP storage (fallback to in-memory if Redis not available)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_DB = int(os.getenv("REDIS_DB", 0))

try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        db=REDIS_DB,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("✅ Redis connection established")
except Exception as e:
    REDIS_AVAILABLE = False
    logger.warning(f"⚠️ Redis not available: {e}. Using in-memory OTP storage")

# In-memory storage fallback
otp_storage: Dict[str, Dict] = {}

# Initialize SMS providers
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "aws_sns").lower()

# AWS SNS configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

if SMS_PROVIDER == "aws_sns" and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    try:
        import boto3
        sns_client = boto3.client(
            'sns',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        AWS_SNS_AVAILABLE = True
        logger.info("✅ AWS SNS SMS provider configured")
    except ImportError:
        AWS_SNS_AVAILABLE = False
        logger.warning("⚠️ boto3 not installed, AWS SNS not available")
    except Exception as e:
        AWS_SNS_AVAILABLE = False
        logger.warning(f"⚠️ AWS SNS configuration failed: {e}")
else:
    AWS_SNS_AVAILABLE = False

# Twilio configuration (fallback)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

if SMS_PROVIDER == "twilio" and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    TWILIO_AVAILABLE = True
    logger.info("✅ Twilio SMS provider configured")
else:
    TWILIO_AVAILABLE = False

# Rate limiting configuration
MAX_OTP_ATTEMPTS_PER_HOUR = int(os.getenv("MAX_OTP_ATTEMPTS_PER_HOUR", 10))
MAX_OTP_ATTEMPTS_PER_DAY = int(os.getenv("MAX_OTP_ATTEMPTS_PER_DAY", 50))
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", 10))

class AdminOTPService:
    """Service for handling OTP generation, sending to admin phone, and verification"""
    
    @staticmethod
    def get_admin_phone_number(db: Session) -> str:
        """Get the admin phone number for OTP delivery"""
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin:
            raise ValueError("No admin user found in database")
        
        # Use admin_phone_number if available, otherwise use regular phone
        admin_phone = admin.admin_phone_number or admin.phone
        if not admin_phone:
            raise ValueError("Admin phone number not configured")
        
        return admin_phone
    
    @staticmethod
    def generate_otp() -> str:
        """Generate a 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format"""
        import re
        cleaned = re.sub(r'[^\d+]', '', phone)
        pattern = r'^\+?1?\d{9,15}$'
        return bool(re.match(pattern, cleaned))
    
    @staticmethod
    def check_rate_limit(phone_number: str) -> Dict:
        """Check if admin has exceeded rate limits"""
        current_time = datetime.now()
        
        if REDIS_AVAILABLE:
            try:
                # Check hourly limit
                hourly_key = f"admin_otp_rate_hour:{phone_number}"
                hourly_count = redis_client.get(hourly_key)
                if hourly_count and int(hourly_count) >= MAX_OTP_ATTEMPTS_PER_HOUR:
                    return {
                        "allowed": False,
                        "message": f"Too many OTP requests. Please wait before requesting another OTP.",
                        "retry_after": "1 hour"
                    }
                
                # Check daily limit
                daily_key = f"admin_otp_rate_day:{phone_number}"
                daily_count = redis_client.get(daily_key)
                if daily_count and int(daily_count) >= MAX_OTP_ATTEMPTS_PER_DAY:
                    return {
                        "allowed": False,
                        "message": f"Daily OTP limit exceeded. Please try again tomorrow.",
                        "retry_after": "24 hours"
                    }
                
                return {"allowed": True}
            except Exception as e:
                logger.error(f"Rate limit check failed: {e}")
                return {"allowed": True}
        else:
            return {"allowed": True}
    
    @staticmethod
    def update_rate_limit(phone_number: str) -> bool:
        """Update rate limit counters"""
        if REDIS_AVAILABLE:
            try:
                # Update hourly counter
                hourly_key = f"admin_otp_rate_hour:{phone_number}"
                redis_client.incr(hourly_key)
                redis_client.expire(hourly_key, 3600)  # 1 hour
                
                # Update daily counter
                daily_key = f"admin_otp_rate_day:{phone_number}"
                redis_client.incr(daily_key)
                redis_client.expire(daily_key, 86400)  # 24 hours
                
                return True
            except Exception as e:
                logger.error(f"Rate limit update failed: {e}")
                return False
        return True
    
    @staticmethod
    def store_otp(phone_number: str, otp: str, user_id: int, request_type: str = "extension") -> bool:
        """Store OTP with expiration time and request context"""
        expiration_time = datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        
        otp_data = {
            'otp': otp,
            'user_id': user_id,
            'request_type': request_type,
            'expires_at': expiration_time.isoformat(),
            'attempts': 0,
            'created_at': datetime.now().isoformat()
        }
        
        if REDIS_AVAILABLE:
            try:
                redis_client.setex(
                    f"admin_otp:{phone_number}:{user_id}",
                    OTP_EXPIRY_MINUTES * 60,
                    json.dumps(otp_data)
                )
                return True
            except Exception as e:
                logger.error(f"Redis error storing OTP: {e}")
                return False
        else:
            otp_storage[f"{phone_number}:{user_id}"] = otp_data
            return True
    
    @staticmethod
    def get_otp_data(phone_number: str, user_id: int) -> Optional[Dict]:
        """Retrieve OTP data"""
        if REDIS_AVAILABLE:
            try:
                data = redis_client.get(f"admin_otp:{phone_number}:{user_id}")
                if data:
                    return json.loads(data)
                return None
            except Exception as e:
                logger.error(f"Redis error retrieving OTP: {e}")
                return None
        else:
            return otp_storage.get(f"{phone_number}:{user_id}")
    
    @staticmethod
    def increment_attempts(phone_number: str, user_id: int) -> bool:
        """Increment OTP verification attempts"""
        otp_data = AdminOTPService.get_otp_data(phone_number, user_id)
        if otp_data:
            otp_data['attempts'] += 1
            
            if REDIS_AVAILABLE:
                try:
                    redis_client.setex(
                        f"admin_otp:{phone_number}:{user_id}",
                        OTP_EXPIRY_MINUTES * 60,
                        json.dumps(otp_data)
                    )
                    return True
                except Exception as e:
                    logger.error(f"Redis error updating attempts: {e}")
                    return False
            else:
                otp_storage[f"{phone_number}:{user_id}"] = otp_data
                return True
        return False
    
    @staticmethod
    def clear_otp(phone_number: str, user_id: int) -> bool:
        """Clear OTP after successful verification"""
        if REDIS_AVAILABLE:
            try:
                redis_client.delete(f"admin_otp:{phone_number}:{user_id}")
                return True
            except Exception as e:
                logger.error(f"Redis error clearing OTP: {e}")
                return False
        else:
            key = f"{phone_number}:{user_id}"
            if key in otp_storage:
                del otp_storage[key]
                return True
            return False
    
    @staticmethod
    def send_otp_sms(admin_phone: str, otp: str, user_name: str, request_type: str = "extension") -> bool:
        """Send OTP via SMS to admin phone"""
        
        # Validate phone number
        if not AdminOTPService.validate_phone_number(admin_phone):
            logger.error(f"Invalid admin phone number format: {admin_phone}")
            return False
        
        # Create message based on request type
        if request_type == "extension":
            message = f"🔔 Extension Request OTP: {otp}\n\nUser: {user_name}\nType: Time Extension\nValid for {OTP_EXPIRY_MINUTES} minutes."
        else:
            message = f"🔔 Chemical Inventory OTP: {otp}\n\nUser: {user_name}\nType: {request_type.title()}\nValid for {OTP_EXPIRY_MINUTES} minutes."
        
        # Try AWS SNS first
        if AWS_SNS_AVAILABLE:
            try:
                response = sns_client.publish(
                    PhoneNumber=admin_phone,
                    Message=message,
                    MessageAttributes={
                        'AWS.SNS.SMS.SMSType': {
                            'DataType': 'String',
                            'StringValue': 'Transactional'
                        }
                    }
                )
                logger.info(f"✅ AWS SNS SMS sent to admin: {response['MessageId']}")
                return True
            except Exception as e:
                logger.error(f"❌ AWS SNS error: {e}")
        
        # Try Twilio as fallback
        if TWILIO_AVAILABLE:
            try:
                message_obj = twilio_client.messages.create(
                    body=message,
                    from_=TWILIO_PHONE_NUMBER,
                    to=admin_phone
                )
                logger.info(f"✅ Twilio SMS sent to admin: {message_obj.sid}")
                return True
            except TwilioException as e:
                logger.error(f"❌ Twilio error: {e}")
            except Exception as e:
                logger.error(f"❌ Twilio SMS sending error: {e}")
        
        # Fallback to mock SMS for development
        logger.warning(f"📱 [MOCK SMS] Admin OTP {otp} for {user_name} sent to {admin_phone}")
        return True
    
    @staticmethod
    def send_otp(user_phone: str, db: Session, request_type: str = "extension") -> Dict:
        """Main method to send OTP to admin phone for user verification"""
        
        # Get user info
        user = db.query(User).filter(User.phone == user_phone).first()
        if not user:
            return {
                "success": False,
                "message": "No user found with this phone number"
            }
        
        # Check if user is approved
        if not user.is_approved:
            return {
                "success": False,
                "message": "Account pending approval. Please contact administrator."
            }
        
        # Get admin phone number
        try:
            admin_phone = AdminOTPService.get_admin_phone_number(db)
        except ValueError as e:
            return {
                "success": False,
                "message": str(e)
            }
        
        # Check rate limits
        rate_limit_check = AdminOTPService.check_rate_limit(admin_phone)
        if not rate_limit_check["allowed"]:
            return {
                "success": False,
                "message": rate_limit_check["message"]
            }
        
        # Generate OTP
        otp = AdminOTPService.generate_otp()
        
        # Store OTP
        if not AdminOTPService.store_otp(admin_phone, otp, user.id, request_type):
            return {
                "success": False,
                "message": "Failed to store OTP. Please try again."
            }
        
        # Send SMS to admin
        user_name = f"{user.first_name} {user.last_name or ''}".strip()
        if not AdminOTPService.send_otp_sms(admin_phone, otp, user_name, request_type):
            return {
                "success": False,
                "message": "Failed to send SMS to admin. Please try again."
            }
        
        # Update rate limit
        AdminOTPService.update_rate_limit(admin_phone)
        
        # Log activity
        create_activity_log(
            db, user.id, "admin_otp_sent",
            f"OTP sent to admin phone for {request_type} verification"
        )
        
        return {
            "success": True,
            "message": f"OTP sent to admin phone for verification",
            "user_name": user_name,
            "note": f"OTP is valid for {OTP_EXPIRY_MINUTES} minutes"
        }
    
    @staticmethod
    def verify_otp(user_phone: str, otp_code: str, db: Session) -> Dict:
        """Verify OTP and return user info if valid"""
        
        # Get user info
        user = db.query(User).filter(User.phone == user_phone).first()
        if not user:
            return {
                "success": False,
                "message": "User not found."
            }
        
        # Get admin phone
        try:
            admin_phone = AdminOTPService.get_admin_phone_number(db)
        except ValueError as e:
            return {
                "success": False,
                "message": str(e)
            }
        
        # Get stored OTP data
        otp_data = AdminOTPService.get_otp_data(admin_phone, user.id)
        if not otp_data:
            return {
                "success": False,
                "message": "OTP expired or not found. Please request a new OTP."
            }
        
        # Check expiration
        expires_at = datetime.fromisoformat(otp_data['expires_at'])
        if datetime.now() > expires_at:
            AdminOTPService.clear_otp(admin_phone, user.id)
            return {
                "success": False,
                "message": f"OTP has expired. Please request a new OTP."
            }
        
        # Check attempts
        if otp_data['attempts'] >= 3:
            AdminOTPService.clear_otp(admin_phone, user.id)
            return {
                "success": False,
                "message": "Too many failed attempts. Please request a new OTP."
            }
        
        # Verify OTP
        if otp_data['otp'] != otp_code:
            AdminOTPService.increment_attempts(admin_phone, user.id)
            return {
                "success": False,
                "message": "Invalid OTP code. Please try again."
            }
        
        # OTP is valid - clear it
        AdminOTPService.clear_otp(admin_phone, user.id)
        
        # Log successful verification
        create_activity_log(
            db, user.id, "admin_otp_verified",
            f"User verified OTP for {otp_data.get('request_type', 'unknown')} request"
        )
        
        return {
            "success": True,
            "message": "OTP verification successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "role": user.role,
                "is_approved": user.is_approved
            }
        }
