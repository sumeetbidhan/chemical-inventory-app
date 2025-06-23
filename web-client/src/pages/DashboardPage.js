import React, { useEffect, useState } from 'react';
import styles from './DashboardPage.module.scss';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

const DashboardPage = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [pending, setPending] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [chemicals, setChemicals] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;
      setFetching(true);
      try {
        const res = await fetch(`${API_BASE}/user/me`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('firebase_token')}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to fetch user info');
        setUserInfo(data);
        setPending(!data.is_approved);
      } catch (err) {
        setUserInfo(null);
        setPending(true);
      } finally {
        setFetching(false);
      }
    };
    fetchUserInfo();
  }, [user]);

  useEffect(() => {
    fetch('http://localhost:8000/chemicals')
      .then(res => res.json())
      .then(data => setChemicals(data));
  }, []);

  if (loading || fetching) return <div className={styles.dashboardContainer}>Loading...</div>;
  if (!user) return null;
  if (pending) {
    return (
      <div className={styles.dashboardContainer}>
        <h2>Approval Pending</h2>
        <p>Your account is pending admin approval. Please wait for approval before accessing the dashboard.</p>
        <button onClick={logout} className={styles.logoutBtn}>Logout</button>
      </div>
    );
  }

  // Role-based dashboard content
  const renderDashboardContent = () => {
    if (!userInfo) return null;
    const { role } = userInfo;
    return (
      <>
        <div className={styles.chemicalInventoryBox}>
          <h3>Chemical Inventory Dashboard</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>CAS Number</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(chemicals) ? chemicals : []).map(chem => (
                <tr key={chem.id}>
                  <td>{chem.name}</td>
                  <td>{chem.cas_number}</td>
                  <td>{chem.quantity}</td>
                  <td>{chem.unit}</td>
                  <td>{chem.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {role === 'admin' && (
          <div className={styles.adminBox}>
            <h3>Admin Management</h3>
            <button onClick={() => navigate('/admin')} className={styles.adminBtn}>Go to Admin Dashboard</button>
            <ul>
              <li>Approve or reject new users</li>
              <li>Manage user roles</li>
              <li>View system activity logs</li>
              <li>Invite new users</li>
            </ul>
          </div>
        )}
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
        <h2>Welcome, {userInfo?.email}</h2>
        <button onClick={logout} className={styles.logoutBtn}>Logout</button>
      </div>
      <div className={styles.userInfo}>
        <div><strong>UID:</strong> {userInfo?.uid}</div>
        <div><strong>Email:</strong> {userInfo?.email}</div>
        <div><strong>Role:</strong> {userInfo?.role}</div>
        <div><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</div>
      </div>
      {renderDashboardContent()}
    </div>
  );
};

export default DashboardPage; 