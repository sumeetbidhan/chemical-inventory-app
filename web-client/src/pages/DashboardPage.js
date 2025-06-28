import React, { useEffect, useState } from 'react';
import styles from './DashboardPage.module.scss';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, AlertTriangle, Hand, FlaskConical, Users, DollarSign, Shield } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const DashboardPage = () => {
  const { user, loading, userInfo, backendAvailable } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (userInfo) {
      setPending(!userInfo.is_approved);
      setFetching(false);
    } else if (!loading && user) {
      // If we have a user but no userInfo, they might be pending
      setPending(true);
      setFetching(false);
    }
  }, [userInfo, loading, user]);

  if (loading || fetching) return <div className={styles.dashboardContainer}>Loading...</div>;
  if (!user) return null;
  
  // Show pending approval message first (before backend connection warning)
  if (pending) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <h2>Account Pending Approval</h2>
        </div>
        <div style={{ 
          background: 'var(--warning-color)', 
          color: 'white', 
          padding: '32px', 
          borderRadius: '12px',
          textAlign: 'center',
          opacity: 0.9,
          marginBottom: '24px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <Clock size={48} color="white" />
          </div>
          <h3 style={{ fontSize: '24px', margin: '0 0 16px 0' }}>
            Welcome, {userInfo?.first_name || user.email}!
          </h3>
          <p style={{ fontSize: '18px', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            Your account is pending admin approval. You will be able to access the chemical inventory system once an administrator approves your account.
          </p>
          <p style={{ fontSize: '14px', margin: 0, opacity: 0.8, lineHeight: '1.4' }}>
            Please contact your system administrator or wait for approval notification.
          </p>
        </div>
        
        <div style={{ 
          background: 'var(--card-bg)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '24px',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--primary-text)' }}>What happens next?</h4>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: 0, 
            textAlign: 'left',
            display: 'inline-block'
          }}>
            <li style={{ margin: '8px 0', padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="var(--success-color)" />
              Admin reviews your registration
            </li>
            <li style={{ margin: '8px 0', padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="var(--success-color)" />
              Account gets approved with appropriate role
            </li>
            <li style={{ margin: '8px 0', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="var(--success-color)" />
              You receive access to the chemical inventory system
            </li>
          </ul>
        </div>
      </div>
    );
  }
  
  // Show backend connection warning if backend is not available (only for approved users)
  if (!backendAvailable) {
    return (
      <div className={styles.dashboardContainer}>
        <div style={{ 
          background: 'var(--warning-color)', 
          border: '1px solid var(--warning-color)', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '24px',
          color: 'white',
          opacity: 0.9
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={20} color="white" />
            <strong>Backend Connection Warning:</strong>
          </div>
          The backend server appears to be offline. 
          Some features may not work properly. Please ensure the backend server is running.
        </div>
        
        <div className={styles.dashboardHeader}>
          <h2>Welcome, {userInfo?.first_name || user.email}</h2>
        </div>
        <div className={styles.userInfo}>
          <div>
            <strong>Email Address</strong>
            <span>{user.email}</span>
          </div>
          <div>
            <strong>Email Verified</strong>
            <span>{user.emailVerified ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <strong>Backend Status</strong>
            <span style={{ color: 'var(--error-color)' }}>Offline</span>
          </div>
        </div>
        
        <div className={styles.quickAccessBox}>
          <button className={styles.bigButton} onClick={() => navigate('/chemicals')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <FlaskConical size={24} />
              Chemical Inventory
            </span>
          </button>
        </div>
        
        <div className={styles.permissionsBox}>
          <h4>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} />
              Limited Mode
            </span>
          </h4>
          <ul>
            <li><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory (if cached)</span></li>
            <li><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Basic navigation</span></li>
          </ul>
        </div>
      </div>
    );
  }

  // Role-based dashboard content
  const renderDashboardContent = () => {
    if (!userInfo) return null;
    const { role } = userInfo;
    return (
      <>
        <div className={styles.quickAccessBox}>
          <button className={styles.bigButton} onClick={() => navigate('/chemicals')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <FlaskConical size={24} />
              Chemical Inventory
            </span>
          </button>
          {role === 'admin' && (
            <button className={styles.bigButton} onClick={() => navigate('/admin')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <Users size={24} />
                Admin Management
              </span>
            </button>
          )}
          {role === 'account' && (
            <button className={styles.bigButton} onClick={() => navigate('/account')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <DollarSign size={24} />
                Account Team
              </span>
            </button>
          )}
        </div>
        <div className={styles.permissionsBox}>
          <h4>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} />
              Your Permissions
            </span>
          </h4>
          <ul>
            {role === 'admin' && [
              <li key="manage_users"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage users</span></li>,
              <li key="manage_invitations"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage invitations</span></li>,
              <li key="view_logs"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View logs</span></li>,
              <li key="approve_users"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Approve users</span></li>,
              <li key="delete_users"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Delete users</span></li>,
              <li key="modify_users"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Modify users</span></li>,
            ]}
            {role === 'lab_staff' && [
              <li key="view_inventory"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory</span></li>,
              <li key="add_chemicals"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Add chemicals</span></li>,
              <li key="update_chemicals"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Update chemicals</span></li>,
              <li key="view_reports"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View reports</span></li>,
              <li key="manage_safety_data"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage safety data</span></li>,
            ]}
            {role === 'product' && [
              <li key="view_inventory"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory</span></li>,
              <li key="view_reports"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View reports</span></li>,
              <li key="export_data"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Export data</span></li>,
              <li key="manage_product_info"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage product info</span></li>,
            ]}
            {role === 'account' && [
              <li key="view_inventory"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory</span></li>,
              <li key="view_reports"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View reports</span></li>,
              <li key="manage_accounts"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage accounts</span></li>,
              <li key="view_financial_data"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View financial data</span></li>,
            ]}
            {role === 'all_users' && [
              <li key="view_inventory"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory (read-only)</span></li>,
              <li key="view_reports"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View basic reports</span></li>,
              <li key="limited_access"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Limited system access</span></li>,
            ]}
          </ul>
        </div>
      </>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <Hand size={28} color="var(--accent-color)" />
            Welcome, {userInfo?.first_name || user.email}
          </span>
        </h2>
      </div>
      <div className={styles.userInfo}>
        <div>
          <strong>Name</strong>
          <span>{userInfo?.first_name} {userInfo?.last_name || ''}</span>
        </div>
        <div>
          <strong>Email Address</strong>
          <span>{userInfo?.email || user.email}</span>
        </div>
        <div>
          <strong>Phone Number</strong>
          <span>{userInfo?.phone || 'Not provided'}</span>
        </div>
        <div>
          <strong>User Role</strong>
          <span>{(userInfo?.role || 'Basic User').replace('_', ' ').toUpperCase()}</span>
        </div>
        <div>
          <strong>Email Verified</strong>
          <span>{user.emailVerified ? 'Yes' : 'No'}</span>
        </div>
        <div>
          <strong>Backend Status</strong>
          <span style={{ color: 'var(--success-color)' }}>Online</span>
        </div>
        <div>
          <strong>Account Status</strong>
          <span style={{ color: 'var(--success-color)' }}>Active</span>
        </div>
      </div>
      
      {renderDashboardContent()}
    </div>
  );
};

export default DashboardPage; 