import React, { useEffect, useState } from 'react';
import styles from './DashboardPage.module.scss';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
    }
  }, [userInfo]);

  if (loading || fetching) return <div className={styles.dashboardContainer}>Loading...</div>;
  if (!user) return null;
  
  // Show backend connection warning if backend is not available
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
          <strong>⚠️ Backend Connection Warning:</strong> The backend server appears to be offline. 
          Some features may not work properly. Please ensure the backend server is running.
        </div>
        
        <div className={styles.dashboardHeader}>
          <h2>Welcome, {user.email}</h2>
        </div>
        <div className={styles.userInfo}>
          <div>
            <strong>User ID</strong>
            <span>{user.uid}</span>
          </div>
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
            Go to Chemical Inventory
          </button>
        </div>
        
        <div className={styles.permissionsBox}>
          <h4>Limited Mode</h4>
          <ul>
            <li>View inventory (if cached)</li>
            <li>Basic navigation</li>
          </ul>
        </div>
      </div>
    );
  }
  
  if (pending) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <h2>Approval Pending</h2>
        </div>
        <div style={{ 
          background: 'var(--warning-color)', 
          color: 'white', 
          padding: '24px', 
          borderRadius: '12px',
          textAlign: 'center',
          opacity: 0.9
        }}>
          <p style={{ fontSize: '18px', margin: '0 0 16px 0' }}>
            Your account is pending admin approval. Please wait for approval before accessing the dashboard.
          </p>
          <p style={{ fontSize: '14px', margin: 0, opacity: 0.8 }}>
            You will be notified once your account has been approved.
          </p>
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
            Chemical Inventory
          </button>
          {role === 'admin' && (
            <button className={styles.bigButton} onClick={() => navigate('/admin')}>
              Admin Management
            </button>
          )}
          {role === 'account' && (
            <button className={styles.bigButton} onClick={() => navigate('/account')}>
              Account Team
            </button>
          )}
        </div>
        <div className={styles.permissionsBox}>
          <h4>Your Permissions</h4>
          <ul>
            {role === 'admin' && [
              <li key="manage_users">Manage users</li>,
              <li key="manage_invitations">Manage invitations</li>,
              <li key="view_logs">View logs</li>,
              <li key="approve_users">Approve users</li>,
              <li key="delete_users">Delete users</li>,
              <li key="modify_users">Modify users</li>,
            ]}
            {role === 'lab_staff' && [
              <li key="view_inventory">View inventory</li>,
              <li key="add_chemicals">Add chemicals</li>,
              <li key="update_chemicals">Update chemicals</li>,
              <li key="view_reports">View reports</li>,
              <li key="manage_safety_data">Manage safety data</li>,
            ]}
            {role === 'product' && [
              <li key="view_inventory">View inventory</li>,
              <li key="view_reports">View reports</li>,
              <li key="export_data">Export data</li>,
              <li key="manage_product_info">Manage product info</li>,
            ]}
            {role === 'account' && [
              <li key="view_inventory">View inventory</li>,
              <li key="view_reports">View reports</li>,
              <li key="manage_accounts">Manage accounts</li>,
              <li key="view_financial_data">View financial data</li>,
            ]}
            {role === 'all_users' && [
              <li key="view_inventory">View inventory</li>,
              <li key="view_reports">View reports</li>,
            ]}
          </ul>
        </div>
      </>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h2>Welcome, {userInfo?.email || user.email}</h2>
      </div>
      <div className={styles.userInfo}>
        <div>
          <strong>User ID</strong>
          <span>{userInfo?.uid || user.uid}</span>
        </div>
        <div>
          <strong>Email Address</strong>
          <span>{userInfo?.email || user.email}</span>
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