# 🗄️ Database Setup Guide

This guide will help you set up the database tables and admin access for the Chemical Inventory System.

## 📋 Prerequisites

1. **PostgreSQL Database** - Running and accessible
2. **Environment File** - `.env` with `DATABASE_URL`
3. **Firebase JSON** - Service account credentials file
4. **Python Dependencies** - All required packages installed

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# Navigate to backend directory
cd backend

# Run the complete setup script
python setup_database.py

# Start the server
python setup_database.py --start-server
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create admin user
python scripts/create_admin.py

# 3. Verify database setup
python scripts/verify_database.py

# 4. Start the server
uvicorn app.main:app --reload
```

## 📊 Database Tables

The system creates three main tables:

### 1. Users Table (`users`)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR UNIQUE NOT NULL,        -- Firebase UID
    email VARCHAR UNIQUE NOT NULL,      -- User email
    role VARCHAR NOT NULL,              -- admin, lab_staff, product, account, all_users
    is_approved BOOLEAN DEFAULT FALSE,  -- Approval status
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Invitations Table (`invitations`)
```sql
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending',   -- pending, accepted, expired
    invited_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP NULL
);
```

### 3. Activity Logs Table (`activity_logs`)
```sql
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR NOT NULL,            -- login, invite_user, approve_user, etc.
    description TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    note TEXT NULL                      -- Admin notes
);
```

## 👑 Admin Access

### Initial Admin User
- **Email**: `admin@chemical-inventory.com`
- **Role**: `ADMIN`
- **Status**: `Approved`
- **UID**: `admin_initial` (temporary, will be replaced on Firebase login)

### Admin Permissions
The admin user has access to all these operations:

#### User Management
- ✅ Create new users
- ✅ Invite users with specific roles
- ✅ Approve pending users
- ✅ Modify user roles and status
- ✅ Delete users
- ✅ View all users and their details

#### Invitation Management
- ✅ Send invitations to new users
- ✅ Track invitation status
- ✅ Delete expired invitations
- ✅ View all invitations

#### Activity Monitoring
- ✅ View all activity logs
- ✅ Filter logs by user, action, date
- ✅ Add admin notes to logs
- ✅ Monitor system usage

#### System Access
- ✅ Full access to all API endpoints
- ✅ Database read/write permissions
- ✅ System configuration access

## 🔧 API Endpoints for Admin

### Authentication
```
POST /auth/login          - Login with Firebase token
GET  /auth/me             - Get current user info
```

### Admin Operations
```
POST   /admin/invite                    - Invite new user
POST   /admin/approve/{user_id}         - Approve pending user
PATCH  /admin/user/{user_id}            - Modify user
DELETE /admin/user/{user_id}            - Delete user
GET    /admin/users                     - List all users
GET    /admin/pending-users             - List pending users
GET    /admin/invitations               - List all invitations
DELETE /admin/invitation/{invitation_id} - Delete invitation
GET    /admin/logs                      - View activity logs
PATCH  /admin/logs/{log_id}/note        - Add log note
```

### User Operations
```
GET /user/me        - Get current user info
GET /user/dashboard - Get user dashboard
GET /user/activity  - Get user activity
```

## 🧪 Testing the Setup

### 1. Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "tables": ["users", "invitations", "activity_logs"]
}
```

### 2. API Documentation
Visit: http://localhost:8000/docs

### 3. Database Verification
```bash
python scripts/verify_database.py
```

### 4. Test Admin Login
```bash
# You'll need a Firebase token for this
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"firebase_token": "your_firebase_token"}'
```

## 🔍 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
psql -h localhost -U your_username -d chemical_inventory

# Test connection
python -c "
from app.database import check_database_connection
print('Connected:', check_database_connection())
"
```

### Missing Tables
```bash
# Start the server to create tables
uvicorn app.main:app --reload

# Or run admin setup
python scripts/create_admin.py
```

### Admin User Issues
```bash
# Check if admin exists
python scripts/verify_database.py

# Recreate admin if needed
python scripts/create_admin.py
```

## 📈 Data Flow

### How Data Goes to Database

1. **API Request** → FastAPI Router
2. **Authentication** → Firebase token verification
3. **Authorization** → Role-based access check
4. **Database Session** → SQLAlchemy session injection
5. **CRUD Operation** → Database query execution
6. **Data Storage** → PostgreSQL table insertion
7. **Activity Logging** → Audit trail creation
8. **Response** → JSON response to client

### Example: Admin Inviting User
```python
# 1. Admin sends invitation
POST /admin/invite
{
    "email": "newuser@example.com",
    "role": "lab_staff"
}

# 2. Data flows to database
def create_invitation(db: Session, invitation: InvitationCreate):
    db_invitation = Invitation(
        email=invitation.email,
        role=invitation.role,
        status=InvitationStatus.PENDING
    )
    db.add(db_invitation)
    db.commit()  # Data saved to database
    return db_invitation

# 3. Activity logged
create_activity_log(
    db, admin_user.id, "invite_user",
    f"Invited user: {invitation.email}"
)
```

## 🎯 Next Steps

1. **Start the server** and verify all endpoints work
2. **Login with Firebase** to replace the temporary admin UID
3. **Invite additional users** with appropriate roles
4. **Monitor activity logs** to track system usage
5. **Configure production settings** for deployment

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify your `.env` file configuration
3. Ensure PostgreSQL is running and accessible
4. Check the server logs for error messages
5. Use the verification scripts to diagnose issues 