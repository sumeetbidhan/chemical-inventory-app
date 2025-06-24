# Chemical Inventory System Enhancements

## Overview
The chemical inventory system has been significantly enhanced with role-based views, alert systems, and notification capabilities. This document outlines the new features and how they work.

## New Features

### 1. Role-Based Views

#### Product Team View
- **Access**: Available to users with 'admin' or 'product' roles
- **Purpose**: Focused view for product team members to monitor stock levels
- **Features**:
  - Current stock quantities prominently displayed
  - Color-coded stock status (Out of Stock, Low Stock, In Stock)
  - Alert threshold information
  - Storage location and supplier details
  - Last updated timestamps

#### Full Inventory View
- **Access**: Available to all users
- **Purpose**: Complete chemical information for detailed management
- **Features**:
  - All chemical details including formulations
  - User who last updated the chemical
  - Complete chemical information

### 2. Alert System

#### Alert Types
1. **Low Stock Alerts** (Warning)
   - Triggered when quantity falls below custom threshold
   - Default threshold: 10 units
   - Customizable per chemical
   - Visual indicators: ⚠️ icon, yellow highlighting

2. **Out of Stock Alerts** (Critical)
   - Triggered when quantity reaches 0
   - Visual indicators: 🚨 icon, red highlighting
   - Immediate notification to admins and product team

#### Alert Features
- Real-time monitoring of chemical quantities
- Custom alert thresholds per chemical
- Visual indicators on chemical cards
- Dismissible alerts
- Alert history tracking

### 3. Notification System

#### Backend API
- **Endpoint**: `/notifications`
- **Features**:
  - Send notifications to specific user roles
  - Store notification history
  - Mark notifications as read/dismissed
  - Role-based notification filtering

#### Frontend Integration
- **Component**: `NotificationSystem`
- **Features**:
  - Real-time notification display
  - Notification management (dismiss, mark as read)
  - Role-based notification access
  - Notification history

### 4. Enhanced Chemical Form

#### New Fields
- **Alert Threshold**: Custom quantity for low stock alerts
- **Storage Location**: Where the chemical is stored
- **Supplier**: Chemical supplier information

#### Validation
- Enhanced form validation
- Alert threshold validation
- Required field validation

### 5. Role-Based Permissions

#### User Roles and Permissions
- **Admin**: Full access to all features
- **Product Team**: Can view product team view, manage alerts, send notifications
- **Lab Staff**: Can create/edit chemicals and formulations
- **Account**: Can view and edit chemicals
- **All Users**: Can view full inventory

#### Permission Matrix
| Feature | Admin | Product | Lab Staff | Account | All Users |
|---------|-------|---------|-----------|---------|-----------|
| View Full Inventory | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Product Team View | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Chemicals | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Chemicals | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Chemicals | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Alerts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Send Notifications | ✅ | ✅ | ❌ | ❌ | ❌ |

## Technical Implementation

### Backend Changes

#### New Models
1. **Notification Model** (`backend/app/models/notifications.py`)
   - Stores notification data
   - Links to chemicals and users
   - Supports role-based recipients

#### New API Endpoints
1. **Notification Routes** (`backend/app/routers/notifications.py`)
   - `POST /notifications/send` - Send notifications
   - `GET /notifications` - Get user's notifications
   - `POST /notifications/{id}/dismiss` - Dismiss notification
   - `POST /notifications/{id}/read` - Mark as read

#### Database Schema Updates
- New `notifications` table
- Enhanced `chemical_inventory` table with new fields

### Frontend Changes

#### New Components
1. **NotificationSystem** (`web-client/src/components/NotificationSystem.jsx`)
   - Manages notification display and interaction
   - Integrates with backend notification API

#### Enhanced Components
1. **ChemicalsDashboard** (`web-client/src/components/ChemicalsDashboard.jsx`)
   - Role-based view switching
   - Alert system integration
   - Enhanced product team view

2. **ChemicalForm** (`web-client/src/components/ChemicalForm.jsx`)
   - New fields for alert threshold, location, supplier
   - Enhanced validation

#### New API Module
- **Notifications API** (`web-client/src/api/notifications.js`)
  - Complete notification management functions
  - Error handling and authentication

## Usage Guide

### For Product Team Members
1. **Access Product Team View**:
   - Navigate to Chemicals Dashboard
   - Click "📊 Product Team View" tab
   - Monitor stock levels and alerts

2. **Manage Alerts**:
   - Click "⚠️ Alerts" button to view active alerts
   - Dismiss alerts when resolved
   - View notification history

3. **Set Alert Thresholds**:
   - Edit chemicals to set custom alert thresholds
   - Default threshold is 10 units

### For Administrators
1. **Monitor System**:
   - Access all views and features
   - Manage user permissions
   - View system-wide notifications

2. **Manage Notifications**:
   - Send system-wide notifications
   - Manage notification history
   - Configure alert settings

### For Lab Staff
1. **Chemical Management**:
   - Add new chemicals with complete information
   - Update quantities and details
   - Set appropriate alert thresholds

## Configuration

### Alert Thresholds
- Default threshold: 10 units
- Customizable per chemical
- Supports all unit types
- Real-time monitoring

### Notification Settings
- Role-based recipient targeting
- Severity levels (critical, warning, info)
- Automatic notification on alert triggers
- Manual notification sending

## Future Enhancements

### Planned Features
1. **Expiry Date Tracking**
   - Add expiry dates to chemicals
   - Expiry alerts and notifications
   - Automatic expiry warnings

2. **Advanced Analytics**
   - Usage patterns and trends
   - Predictive stock management
   - Cost analysis and reporting

3. **Mobile Support**
   - Mobile-responsive design
   - Push notifications
   - Offline capability

4. **Integration Features**
   - Email notifications
   - SMS alerts
   - Third-party system integration

## Troubleshooting

### Common Issues
1. **Alerts not showing**: Check user role permissions
2. **Notifications not sending**: Verify backend API connectivity
3. **View toggle not visible**: Ensure user has appropriate role

### Debug Information
- Console logs for alert generation
- API response logging
- User role verification logs

## Security Considerations

### Role-Based Access Control
- Strict permission enforcement
- API-level security checks
- Frontend role validation

### Data Protection
- Secure notification storage
- User data privacy
- Audit trail maintenance

## Performance Optimization

### Frontend
- Efficient alert checking
- Optimized notification rendering
- Minimal API calls

### Backend
- Database query optimization
- Notification batching
- Caching strategies 