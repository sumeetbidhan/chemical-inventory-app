# Quick Start: OTP Setup for Deployment

This guide will help you quickly set up OTP functionality for your chemical inventory app deployment.

## 🚀 Quick Setup (5 minutes)

### 1. Choose Your SMS Provider

**Option A: Twilio (Recommended for beginners)**
- Sign up at https://www.twilio.com/
- Get free trial credits
- Get your Account SID, Auth Token, and phone number

**Option B: AWS SNS (Cost-effective)**
- Set up AWS account
- Configure SNS service
- Get access keys

### 2. Set Up Redis

**Option A: Redis Cloud (Easiest)**
- Go to https://redis.com/
- Create free account
- Get connection details

**Option B: Self-hosted**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install redis-server
sudo systemctl start redis-server
```

### 3. Configure Environment

Run the setup script:
```bash
cd backend
python deploy_otp_setup.py
```

This will:
- Check your environment
- Test connections
- Generate `.env.template`
- Guide you through setup

### 4. Deploy

**Heroku:**
```bash
# Add Redis addon
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set TWILIO_ACCOUNT_SID=your_sid
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set TWILIO_PHONE_NUMBER=your_number
```

**Railway:**
```bash
# Add Redis service
railway service add redis

# Set environment variables
railway variables set TWILIO_ACCOUNT_SID=your_sid
railway variables set TWILIO_AUTH_TOKEN=your_token
railway variables set TWILIO_PHONE_NUMBER=your_number
```

## 💰 Cost Estimation

**For 1000 OTPs/month:**
- Twilio SMS: ~$8
- Redis: $5-15
- **Total: ~$13-23/month**

## 🔧 Environment Variables

Create `.env` file with:
```bash
# SMS Provider
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Redis
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# OTP Settings
OTP_EXPIRY_MINUTES=10
MAX_OTP_ATTEMPTS_PER_HOUR=5
MAX_OTP_ATTEMPTS_PER_DAY=20
```

## 🧪 Testing

### Test Phone Numbers (Twilio)
- `+15005550006` - Always succeeds
- `+15005550007` - Always fails
- `+15005550008` - Always fails with error

### Test Your Setup
```bash
# Test Redis
redis-cli ping

# Test Twilio
curl -X POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json \
  -u {AccountSid}:{AuthToken} \
  -d "To=+15005550006" \
  -d "From=+0987654321" \
  -d "Body=Test message"
```

## 📱 Frontend Integration

The frontend is already configured to support OTP login. Users can:

1. Enter phone number
2. Click "Send OTP"
3. Enter 6-digit code
4. Login successfully

## 🚨 Troubleshooting

### Common Issues:

1. **"Redis not available"**
   - Check Redis connection
   - Verify host/port/password

2. **"Twilio credentials not found"**
   - Set environment variables
   - Check account balance

3. **"Invalid phone number"**
   - Use international format: `+1234567890`
   - Remove spaces and special characters

### Debug Commands:
```bash
# Check environment
python deploy_otp_setup.py

# Test OTP service
python -c "
from app.services.otp_service import OTPService
print('OTP Service loaded successfully')
"
```

## 📚 Next Steps

1. **Read the full guide**: `DEPLOYMENT_OTP_GUIDE.md`
2. **Set up monitoring**: Check logs for OTP status
3. **Configure alerts**: Get notified of failures
4. **Optimize costs**: Monitor SMS usage

## 🆘 Need Help?

- Check the full deployment guide
- Review environment variables
- Test with Twilio test numbers
- Check application logs

---

**That's it!** Your OTP system should be ready for production deployment. 🎉 