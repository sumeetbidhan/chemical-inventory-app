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
from app.crud.user import get_user_by_phone
from app.crud.activity_log import create_activity_log

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
    # Test connection
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("✅ Redis connection established")
except Exception as e:
    REDIS_AVAILABLE = False
    logger.warning(f"⚠️ Redis not available: {e}. Using in-memory OTP storage")

# In-memory storage fallback
otp_storage: Dict[str, Dict] = {}

# Initialize SMS providers
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "twilio").lower()

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

if SMS_PROVIDER == "twilio" and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    TWILIO_AVAILABLE = True
    logger.info("✅ Twilio SMS provider configured")
else:
    TWILIO_AVAILABLE = False
    logger.warning("⚠️ Twilio credentials not found, using mock SMS service")

# AWS SNS configuration (alternative)
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

# Rate limiting configuration
MAX_OTP_ATTEMPTS_PER_HOUR = int(os.getenv("MAX_OTP_ATTEMPTS_PER_HOUR", 5))
MAX_OTP_ATTEMPTS_PER_DAY = int(os.getenv("MAX_OTP_ATTEMPTS_PER_DAY", 20))
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", 10))

class OTPService:
    """Service for handling OTP generation, sending, and verification"""
    
    @staticmethod
    def generate_otp() -> str:
        """Generate a 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format"""
        import re
        # Remove all non-digit characters except +
        cleaned = re.sub(r'[^\d+]', '', phone)
        # Check if it's a valid international format
        pattern = r'^\+?1?\d{9,15}$'
        return bool(re.match(pattern, cleaned))
    
    @staticmethod
    def check_rate_limit(phone_number: str) -> Dict:
        """Check if user has exceeded rate limits"""
        current_time = datetime.now()
        hour_ago = current_time - timedelta(hours=1)
        day_ago = current_time - timedelta(days=1)
        
        if REDIS_AVAILABLE:
            try:
                # Check hourly limit
                hourly_key = f"otp_rate_hour:{phone_number}"
                hourly_count = redis_client.get(hourly_key)
                if hourly_count and int(hourly_count) >= MAX_OTP_ATTEMPTS_PER_HOUR:
                    return {
                        "allowed": False,
                        "message": f"Too many OTP requests. Please wait before requesting another OTP.",
                        "retry_after": "1 hour"
                    }
                
                # Check daily limit
                daily_key = f"otp_rate_day:{phone_number}"
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
                return {"allowed": True}  # Allow if Redis fails
        else:
            # Simple in-memory rate limiting (not persistent across restarts)
            return {"allowed": True}
    
    @staticmethod
    def update_rate_limit(phone_number: str) -> bool:
        """Update rate limit counters"""
        if REDIS_AVAILABLE:
            try:
                # Update hourly counter
                hourly_key = f"otp_rate_hour:{phone_number}"
                redis_client.incr(hourly_key)
                redis_client.expire(hourly_key, 3600)  # 1 hour
                
                # Update daily counter
                daily_key = f"otp_rate_day:{phone_number}"
                redis_client.incr(daily_key)
                redis_client.expire(daily_key, 86400)  # 24 hours
                
                return True
            except Exception as e:
                logger.error(f"Rate limit update failed: {e}")
                return False
        return True
    
    @staticmethod
    def store_otp(phone_number: str, otp: str, user_id: int) -> bool:
        """Store OTP with expiration time"""
        expiration_time = datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        
        otp_data = {
            'otp': otp,
            'user_id': user_id,
            'expires_at': expiration_time.isoformat(),
            'attempts': 0,
            'created_at': datetime.now().isoformat()
        }
        
        if REDIS_AVAILABLE:
            try:
                redis_client.setex(
                    f"otp:{phone_number}",
                    OTP_EXPIRY_MINUTES * 60,  # Convert to seconds
                    json.dumps(otp_data)
                )
                return True
            except Exception as e:
                logger.error(f"Redis error storing OTP: {e}")
                return False
        else:
            # Fallback to in-memory storage
            otp_storage[phone_number] = otp_data
            return True
    
    @staticmethod
    def get_otp_data(phone_number: str) -> Optional[Dict]:
        """Retrieve OTP data"""
        if REDIS_AVAILABLE:
            try:
                data = redis_client.get(f"otp:{phone_number}")
                if data:
                    return json.loads(data)
                return None
            except Exception as e:
                logger.error(f"Redis error retrieving OTP: {e}")
                return None
        else:
            return otp_storage.get(phone_number)
    
    @staticmethod
    def increment_attempts(phone_number: str) -> bool:
        """Increment OTP verification attempts"""
        otp_data = OTPService.get_otp_data(phone_number)
        if otp_data:
            otp_data['attempts'] += 1
            
            if REDIS_AVAILABLE:
                try:
                    redis_client.setex(
                        f"otp:{phone_number}",
                        OTP_EXPIRY_MINUTES * 60,
                        json.dumps(otp_data)
                    )
                    return True
                except Exception as e:
                    logger.error(f"Redis error updating attempts: {e}")
                    return False
            else:
                otp_storage[phone_number] = otp_data
                return True
        return False
    
    @staticmethod
    def clear_otp(phone_number: str) -> bool:
        """Clear OTP after successful verification"""
        if REDIS_AVAILABLE:
            try:
                redis_client.delete(f"otp:{phone_number}")
                return True
            except Exception as e:
                logger.error(f"Redis error clearing OTP: {e}")
                return False
        else:
            if phone_number in otp_storage:
                del otp_storage[phone_number]
                return True
            return False
    
    @staticmethod
    def send_otp_sms(phone_number: str, otp: str) -> bool:
        """Send OTP via SMS using configured provider"""
        
        # Validate phone number
        if not OTPService.validate_phone_number(phone_number):
            logger.error(f"Invalid phone number format: {phone_number}")
            return False
        
        # Try Twilio first
        if TWILIO_AVAILABLE:
            try:
                message = twilio_client.messages.create(
                    body=f"Your Chemical Inventory OTP is: {otp}. Valid for {OTP_EXPIRY_MINUTES} minutes.",
                    from_=TWILIO_PHONE_NUMBER,
                    to=phone_number
                )
                logger.info(f"✅ Twilio SMS sent successfully: {message.sid}")
                return True
            except TwilioException as e:
                logger.error(f"❌ Twilio error: {e}")
            except Exception as e:
                logger.error(f"❌ Twilio SMS sending error: {e}")
        
        # Try AWS SNS as fallback
        if AWS_SNS_AVAILABLE:
            try:
                response = sns_client.publish(
                    PhoneNumber=phone_number,
                    Message=f"Your Chemical Inventory OTP is: {otp}. Valid for {OTP_EXPIRY_MINUTES} minutes.",
                    MessageAttributes={
                        'AWS.SNS.SMS.SMSType': {
                            'DataType': 'String',
                            'StringValue': 'Transactional'
                        }
                    }
                )
                logger.info(f"✅ AWS SNS SMS sent successfully: {response['MessageId']}")
                return True
            except Exception as e:
                logger.error(f"❌ AWS SNS error: {e}")
        
        # Fallback to mock SMS for development
        logger.warning(f"📱 [MOCK SMS] OTP {otp} sent to {phone_number}")
        return True
    
    @staticmethod
    def send_otp(phone_number: str, db: Session) -> Dict:
        """Main method to send OTP to a phone number"""
        
        # Validate phone number
        if not OTPService.validate_phone_number(phone_number):
            return {
                "success": False,
                "message": "Invalid phone number format. Please use international format (e.g., +1234567890)"
            }
        
        # Check rate limits
        rate_limit_check = OTPService.check_rate_limit(phone_number)
        if not rate_limit_check["allowed"]:
            return {
                "success": False,
                "message": rate_limit_check["message"]
            }
        
        # Check if user exists with this phone number
        user = get_user_by_phone(db, phone_number)
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
        
        # Generate OTP
        otp = OTPService.generate_otp()
        
        # Store OTP
        if not OTPService.store_otp(phone_number, otp, user.id):
            return {
                "success": False,
                "message": "Failed to store OTP. Please try again."
            }
        
        # Send SMS
        if not OTPService.send_otp_sms(phone_number, otp):
            return {
                "success": False,
                "message": "Failed to send SMS. Please try again."
            }
        
        # Update rate limit
        OTPService.update_rate_limit(phone_number)
        
        # Log activity
        create_activity_log(
            db, user.id, "otp_sent",
            f"OTP sent to phone number: {phone_number}"
        )
        
        return {
            "success": True,
            "message": "OTP sent successfully",
            "phone_number": phone_number,
            "note": f"OTP is valid for {OTP_EXPIRY_MINUTES} minutes"
        }
    
    @staticmethod
    def verify_otp(phone_number: str, otp_code: str, db: Session) -> Dict:
        """Verify OTP and return user info if valid"""
        
        # Validate phone number
        if not OTPService.validate_phone_number(phone_number):
            return {
                "success": False,
                "message": "Invalid phone number format"
            }
        
        # Get stored OTP data
        otp_data = OTPService.get_otp_data(phone_number)
        if not otp_data:
            return {
                "success": False,
                "message": "OTP expired or not found. Please request a new OTP."
            }
        
        # Check expiration
        expires_at = datetime.fromisoformat(otp_data['expires_at'])
        if datetime.now() > expires_at:
            OTPService.clear_otp(phone_number)
            return {
                "success": False,
                "message": f"OTP has expired. Please request a new OTP."
            }
        
        # Check attempts
        if otp_data['attempts'] >= 3:
            OTPService.clear_otp(phone_number)
            return {
                "success": False,
                "message": "Too many failed attempts. Please request a new OTP."
            }
        
        # Verify OTP
        if otp_data['otp'] != otp_code:
            OTPService.increment_attempts(phone_number)
            return {
                "success": False,
                "message": "Invalid OTP code. Please try again."
            }
        
        # OTP is valid - get user info
        user = get_user_by_phone(db, phone_number)
        if not user:
            return {
                "success": False,
                "message": "User not found."
            }
        
        # Clear OTP after successful verification
        OTPService.clear_otp(phone_number)
        
        # Log successful login
        create_activity_log(
            db, user.id, "login",
            f"User logged in via OTP: {phone_number}"
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