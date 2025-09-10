# AWS OTP Setup Guide

This guide explains how to set up AWS SNS for OTP delivery to a single admin phone number.

## 🎯 Overview

Instead of sending OTPs to individual user phones, all OTPs are sent to a single admin phone number. This simplifies management and reduces costs.

## 🔧 Setup Steps

### 1. AWS SNS Configuration

#### Create AWS Account & SNS Service
1. Go to [AWS Console](https://aws.amazon.com/console/)
2. Navigate to **Simple Notification Service (SNS)**
3. Create a new topic or use the default

#### Get AWS Credentials
1. Go to **IAM** → **Users** → **Your User** → **Security Credentials**
2. Create **Access Keys** if you don't have them
3. Note down:
   - Access Key ID
   - Secret Access Key
   - Region (e.g., us-east-1)

### 2. Environment Variables

Add these to your `.env` file:

```bash
# AWS SNS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# SMS Provider (set to aws_sns)
SMS_PROVIDER=aws_sns

# OTP Configuration
OTP_EXPIRY_MINUTES=10
MAX_OTP_ATTEMPTS_PER_HOUR=10
MAX_OTP_ATTEMPTS_PER_DAY=50
```

### 3. Install Dependencies

```bash
pip install boto3
```

### 4. Configure Admin Phone

Run the setup script:

```bash
cd chemical-inventory-app/backend
python setup_admin_phone.py
```

This will:
- Set the admin phone number in the database
- Test AWS SNS connection
- Verify configuration

### 5. Test the System

1. Start your backend server
2. Try requesting an extension from the frontend
3. Check if the admin receives the OTP SMS

## 📱 How It Works

### User Flow:
1. **User requests extension** → Frontend sends request
2. **System generates OTP** → 6-digit code created
3. **OTP sent to admin** → AWS SNS sends SMS to admin phone
4. **Admin shares OTP** → Admin tells user the OTP code
5. **User enters OTP** → Frontend verifies with backend
6. **Extension approved** → Request submitted for admin approval

### Admin Flow:
1. **Receive SMS** → Admin gets OTP via SMS
2. **Share with user** → Admin tells user the OTP code
3. **Monitor requests** → Admin can see all pending requests in admin panel

## 💰 Cost Estimation

### AWS SNS Pricing (US East):
- **SMS to US numbers**: $0.0075 per message
- **SMS to international**: $0.0075 - $0.75 per message

### Example Costs:
- 100 extension requests/month = $0.75
- 500 extension requests/month = $3.75
- 1000 extension requests/month = $7.50

## 🔒 Security Features

- **Rate Limiting**: Max 10 OTPs per hour, 50 per day
- **OTP Expiry**: Codes expire after 10 minutes
- **Attempt Limiting**: Max 3 verification attempts per OTP
- **Admin Verification**: Only admin phone receives OTPs
- **Audit Trail**: All OTP activities are logged

## 🛠️ Troubleshooting

### Common Issues:

#### 1. AWS Credentials Error
```
❌ AWS SNS connection failed: Invalid credentials
```
**Solution**: Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

#### 2. Phone Number Format Error
```
❌ Invalid phone number format
```
**Solution**: Use international format: +1234567890

#### 3. No Admin User Found
```
❌ No admin user found in database
```
**Solution**: Create an admin user first using the user management system

#### 4. SMS Not Received
- Check AWS SNS delivery status in AWS Console
- Verify phone number format
- Check AWS region configuration
- Ensure sufficient AWS credits

### Debug Mode:

Enable debug logging by setting:
```bash
LOG_LEVEL=DEBUG
```

## 📊 Monitoring

### AWS SNS Console:
- Go to **SNS** → **Text messaging (SMS)**
- View delivery statistics
- Check failed deliveries

### Application Logs:
- Check backend logs for OTP activities
- Monitor rate limiting
- Track verification attempts

## 🔄 Fallback Options

If AWS SNS fails, the system will:
1. Try Twilio (if configured)
2. Fall back to mock SMS (development only)
3. Log errors for debugging

## 📞 Support

For issues with:
- **AWS SNS**: Check AWS documentation and support
- **Application**: Check application logs and error messages
- **Configuration**: Run the setup script again

## 🎉 Benefits

✅ **Simplified Management**: One phone number to manage
✅ **Cost Effective**: Lower SMS costs
✅ **Better Security**: Admin controls all OTPs
✅ **Easy Setup**: Simple configuration process
✅ **Reliable**: AWS infrastructure
✅ **Scalable**: Handles high volume
