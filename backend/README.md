# Chemical Inventory Backend API

A comprehensive FastAPI backend system for managing chemical inventory with Firebase authentication, PostgreSQL database, and role-based access control.

## Features

### Authentication & Authorization
- **Firebase Authentication**: Email/password and OTP-based login
- **Role-based Access Control**: 5 user roles (Admin, Lab Staff, Product, Account, All Users)
- **User Approval System**: Admin approval required for new registrations
- **Invitation System**: Admin can invite users with specific roles

### Admin Dashboard
- **User Management**: Invite, approve, modify, and delete users
- **Role Management**: Assign and change user roles
- **Activity Logging**: Comprehensive audit trail with admin notes
- **Invitation Management**: Track and manage user invitations

### Database Schema
- **Users Table**: User profiles with roles and approval status
- **Invitations Table**: Track user invitations and their status
- **Activity Logs Table**: Complete audit trail of system actions

## Tech Stack

- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Primary database
- **Firebase Admin SDK**: Authentication and user management
- **Pydantic**: Data validation and serialization
- **Python-dotenv**: Environment variable management

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Setup**
   Create a `.env` file in the backend directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/chemical_inventory
   GOOGLE_APPLICATION_CREDENTIALS=path/to/firebase-service-account.json
   ```

5. **Database Setup**
   - Ensure PostgreSQL is running
   - Create the database: `chemical_inventory`
   - Tables will be created automatically on first run

6. **Firebase Setup**
   - Download your Firebase service account JSON file
   - Update the `GOOGLE_APPLICATION_CREDENTIALS` path in `.env`

## Running the Application

```bash
# Development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/login` - Login with Firebase token
- `POST /auth/otp` - OTP-based login
- `GET /auth/me` - Get current user info

### Admin (`/admin`)
- `POST /admin/invite` - Invite new user
- `POST /admin/approve/{user_id}` - Approve pending user
- `PATCH /admin/user/{user_id}` - Modify user
- `DELETE /admin/user/{user_id}` - Delete user
- `GET /admin/users` - Get all users
- `GET /admin/pending-users` - Get pending users
- `GET /admin/invitations` - Get all invitations
- `DELETE /admin/invitation/{invitation_id}` - Delete invitation
- `GET /admin/logs` - Get activity logs with filters
- `PATCH /admin/logs/{log_id}/note` - Add/update log note

### User (`/user`)
- `GET /user/me` - Get current user info
- `GET /user/dashboard` - Get user dashboard data
- `GET /user/activity` - Get user activity logs

## User Roles & Permissions

### Admin
- Full system access
- User management (invite, approve, modify, delete)
- Activity log management
- System configuration

### Lab Staff
- View and manage chemical inventory
- Add/update chemicals
- View reports
- Manage safety data

### Product
- View inventory
- View reports
- Export data
- Manage product information

### Account
- View inventory
- View reports
- Manage accounts
- View financial data

### All Users
- View inventory
- View reports

## Database Models

### User
```python
class User(Base):
    id: int (Primary Key)
    uid: str (Firebase UID)
    email: str (Unique)
    role: UserRole (Enum)
    is_approved: bool
    created_at: datetime
    updated_at: datetime
```

### Invitation
```python
class Invitation(Base):
    id: int (Primary Key)
    email: str
    role: UserRole
    status: InvitationStatus
    invited_at: datetime
    accepted_at: datetime (Nullable)
```

### ActivityLog
```python
class ActivityLog(Base):
    id: int (Primary Key)
    user_id: int (Foreign Key)
    action: str
    description: str
    timestamp: datetime
    note: str (Nullable)
```

## Authentication Flow

1. **User Login**: Frontend sends Firebase token to `/auth/login`
2. **Token Verification**: Backend verifies token with Firebase
3. **User Creation/Retrieval**: 
   - If user exists: retrieve from database
   - If invited user: create user and mark invitation as accepted
   - If new user: create with pending approval
4. **Approval Check**: Ensure user is approved
5. **Activity Logging**: Log the login event
6. **Response**: Return user data and token

## Development

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database configuration
│   ├── firebase_auth.py     # Firebase authentication
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── crud/                # Database operations
│   └── routers/             # API routes
├── requirements.txt
├── .env
└── README.md
```

### Adding New Features
1. Create model in `app/models/`
2. Create schema in `app/schemas/`
3. Add CRUD operations in `app/crud/`
4. Create router endpoints in `app/routers/`
5. Update main.py to include new router

## Security Considerations

- All sensitive routes require Firebase token authentication
- Admin routes require admin role verification
- User approval system prevents unauthorized access
- Activity logging provides audit trail
- CORS configured for frontend integration

## API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Testing

```bash
# Run tests (when implemented)
pytest

# Run with coverage
pytest --cov=app
```

## Deployment

1. **Environment Variables**: Set production environment variables
2. **Database**: Use production PostgreSQL instance
3. **Firebase**: Configure production Firebase project
4. **CORS**: Update CORS settings for production domains
5. **Security**: Implement proper security headers and HTTPS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License. 