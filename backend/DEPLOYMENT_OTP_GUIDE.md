# OTP Deployment Guide

This guide explains how to set up OTP functionality for production deployment of your chemical inventory app.

## Overview

The OTP system uses:
- **SMS Provider**: Twilio (primary) or other SMS services
- **Storage**: Redis (production) or in-memory (development)
- **Backend**: FastAPI with OTP service

## 1. SMS Provider Options

### Option A: Twilio (Recommended)
**Pros**: Reliable, good documentation, global coverage
**Cons**: Can be expensive for high volume

#### Setup:
1. Create Twilio account: https://www.twilio.com/
2. Get your credentials:
   - Account SID
   - Auth Token
   - Phone number (for sending SMS)

#### Environment Variables:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Option B: AWS SNS (Alternative)
**Pros**: Cost-effective, integrates well with AWS
**Cons**: Requires AWS setup

#### Setup:
1. Create AWS account
2. Set up SNS service
3. Configure SMS settings

#### Environment Variables:
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

### Option C: MessageBird
**Pros**: Good European coverage, competitive pricing
**Cons**: Less documentation than Twilio

### Option D: Vonage (formerly Nexmo)
**Pros**: Good global coverage, reliable
**Cons**: Slightly more complex setup

## 2. Redis Setup for Production

### Option A: Managed Redis Services

#### Redis Cloud (Recommended for small-medium apps)
1. Sign up at https://redis.com/
2. Create database
3. Get connection details

#### AWS ElastiCache
1. Create Redis cluster in AWS
2. Configure security groups
3. Get endpoint details

#### Google Cloud Memorystore
1. Create Redis instance in GCP
2. Configure network settings
3. Get connection details

### Option B: Self-hosted Redis
```bash
# Install Redis on Ubuntu
sudo apt update
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Environment Variables for Redis:
```bash
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
```

## 3. Deployment Platforms

### Option A: Heroku
```bash
# Add Redis addon
heroku addons:create heroku-redis:hobby-dev

# Add environment variables
heroku config:set TWILIO_ACCOUNT_SID=your_sid
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set TWILIO_PHONE_NUMBER=your_number
```

### Option B: Railway
```bash
# Add Redis service
railway service add redis

# Add environment variables
railway variables set TWILIO_ACCOUNT_SID=your_sid
railway variables set TWILIO_AUTH_TOKEN=your_token
railway variables set TWILIO_PHONE_NUMBER=your_number
```

### Option C: DigitalOcean App Platform
1. Create app from GitHub
2. Add Redis database
3. Configure environment variables

### Option D: AWS/GCP/Azure
1. Deploy to cloud platform
2. Set up managed Redis
3. Configure environment variables

## 4. Environment Configuration

### Production .env file:
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url

# SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Redis
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# App Settings
ENVIRONMENT=production
DEBUG=false
```

## 5. Cost Estimation

### Twilio SMS Costs (US):
- Incoming SMS: $0.0075 per message
- Outgoing SMS: $0.0079 per message
- Phone number: $1/month

### Redis Costs:
- Redis Cloud: Free tier (30MB), then $5/month
- AWS ElastiCache: ~$15/month for small instance
- Self-hosted: Server costs only

### Example Monthly Costs (1000 OTPs):
- Twilio SMS: ~$8
- Redis: $5-15
- **Total: ~$13-23/month**

## 6. Security Considerations

### Rate Limiting
```python
# Add to OTP service
MAX_OTP_ATTEMPTS_PER_HOUR = 5
MAX_OTP_ATTEMPTS_PER_DAY = 20
```

### Phone Number Validation
```python
# Validate phone number format
import re
def validate_phone(phone: str) -> bool:
    pattern = r'^\+?1?\d{9,15}$'
    return bool(re.match(pattern, phone))
```

### OTP Expiration
- Current: 10 minutes
- Consider: 5 minutes for high-security apps

## 7. Testing in Production

### Test Phone Numbers
```bash
# Twilio test numbers (free)
+15005550006  # Always succeeds
+15005550007  # Always fails
+15005550008  # Always fails with error
```

### Monitoring
```python
# Add logging for production
import logging
logging.info(f"OTP sent to {phone_number}")
logging.error(f"OTP failed for {phone_number}: {error}")
```

## 8. Alternative OTP Methods

### Email OTP (Backup)
```python
# Add email OTP as fallback
def send_email_otp(email: str, otp: str):
    # Send email with OTP
    pass
```

### WhatsApp Business API
```python
# For WhatsApp OTP
def send_whatsapp_otp(phone: str, otp: str):
    # Send WhatsApp message
    pass
```

## 9. Deployment Checklist

- [ ] Set up SMS provider account
- [ ] Configure Redis (managed or self-hosted)
- [ ] Set environment variables
- [ ] Test OTP functionality
- [ ] Set up monitoring/logging
- [ ] Configure rate limiting
- [ ] Test with real phone numbers
- [ ] Set up backup OTP method (optional)

## 10. Troubleshooting

### Common Issues:

1. **Redis Connection Failed**
   - Check Redis host/port
   - Verify network connectivity
   - Check firewall settings

2. **SMS Not Sending**
   - Verify Twilio credentials
   - Check phone number format
   - Verify account balance

3. **OTP Not Storing**
   - Check Redis connection
   - Verify Redis permissions
   - Check data serialization

### Debug Commands:
```bash
# Test Redis connection
redis-cli ping

# Test Twilio
curl -X POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json \
  -u {AccountSid}:{AuthToken} \
  -d "To=+1234567890" \
  -d "From=+0987654321" \
  -d "Body=Test message"
```

## 11. Scaling Considerations

### For High Volume:
- Use Redis cluster
- Implement OTP caching
- Add load balancing
- Use multiple SMS providers
- Implement queue system

### Performance Optimization:
- Cache user data
- Batch SMS sending
- Optimize database queries
- Use connection pooling

This guide should help you deploy OTP functionality successfully in production! 