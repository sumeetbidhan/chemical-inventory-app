import React, { useState, useEffect } from 'react';
import styles from './AdminManagementPage.module.scss';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TABS = ['Users', 'Invite', 'Pending', 'Logs'];

const API_BASE = 'http://localhost:8000';

const AdminManagementPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('Users');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('lab_staff');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Helper to get auth header
  const getAuthHeaders = () => {
    const token = localStorage.getItem('firebase_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch user role after login
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      setRoleLoading(true);
      setUnauthorized(false);
      try {
        const res = await fetch(`${API_BASE}/user/me`, { headers: { ...getAuthHeaders() } });
        if (!res.ok) throw new Error('Failed to fetch user info');
        const data = await res.json();
        setRole(data.role);
        if (data.role !== 'admin') {
          setUnauthorized(true);
        }
      } catch (err) {
        setUnauthorized(true);
      } finally {
        setRoleLoading(false);
      }
    };
    if (user) fetchRole();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    if (activeTab === 'Users') fetchUsers();
    if (activeTab === 'Pending') fetchPendingUsers();
    if (activeTab === 'Logs') fetchLogs();
    // eslint-disable-next-line
  }, [activeTab, user, role]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, { headers: { ...getAuthHeaders() } });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPendingUsers = async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/pending-users`, { headers: { ...getAuthHeaders() } });
      if (!res.ok) throw new Error('Failed to fetch pending users');
      const data = await res.json();
      setPendingUsers(data);
    } catch (err) {
      setPendingError(err.message);
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/logs`, { headers: { ...getAuthHeaders() } });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setLogsError(err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/approve/${userId}`, {
        method: 'POST',
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Failed to approve user');
      fetchUsers();
      fetchPendingUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      fetchUsers();
      fetchPendingUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update user role');
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (userId) => {
    // Optionally implement reject (delete user)
    await handleDelete(userId);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/admin/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to invite user');
      }
      setInviteSuccess('Invitation sent successfully!');
      setInviteEmail('');
      setInviteRole('lab_staff');
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading || roleLoading) {
    return <div className={styles.adminPageContainer}>Loading...</div>;
  }
  if (unauthorized) {
    return <div className={styles.adminPageContainer}><h2>Unauthorized</h2><p>You do not have permission to access this page.</p></div>;
  }

  return (
    <div className={styles.adminPageContainer}>
      <h2>Admin Management</h2>
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {activeTab === 'Users' && (
          <div>
            <h3>User List</h3>
            {loadingUsers && <div>Loading users...</div>}
            {error && <div className={styles.errorMsg}>{error}</div>}
            {!loadingUsers && !error && (
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user.id, e.target.value)}
                        >
                          <option value="admin">Admin</option>
                          <option value="lab_staff">Lab Staff</option>
                          <option value="product">Product</option>
                          <option value="account">Account</option>
                          <option value="all_users">All Users</option>
                        </select>
                      </td>
                      <td>{user.is_approved ? 'Approved' : 'Pending'}</td>
                      <td>
                        {!user.is_approved && (
                          <button onClick={() => handleApprove(user.id)} className={styles.actionBtn}>
                            Approve
                          </button>
                        )}
                        <button onClick={() => handleDelete(user.id)} className={styles.actionBtnDanger}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === 'Invite' && (
          <div>
            <h3>Invite User</h3>
            <form onSubmit={handleInvite} className={styles.inviteForm}>
              <label htmlFor="inviteEmail">Email</label>
              <input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className={styles.input}
                required
              />
              <label htmlFor="inviteRole">Role</label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className={styles.input}
              >
                <option value="admin">Admin</option>
                <option value="lab_staff">Lab Staff</option>
                <option value="product">Product</option>
                <option value="account">Account</option>
                <option value="all_users">All Users</option>
              </select>
              <button type="submit" className={styles.actionBtn} disabled={inviteLoading}>
                {inviteLoading ? 'Inviting...' : 'Invite'}
              </button>
            </form>
            {inviteError && <div className={styles.errorMsg}>{inviteError}</div>}
            {inviteSuccess && <div className={styles.successMsg}>{inviteSuccess}</div>}
          </div>
        )}
        {activeTab === 'Pending' && (
          <div>
            <h3>Pending Approvals</h3>
            {pendingLoading && <div>Loading pending users...</div>}
            {pendingError && <div className={styles.errorMsg}>{pendingError}</div>}
            {!pendingLoading && !pendingError && (
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <button onClick={() => handleApprove(user.id)} className={styles.actionBtn}>Approve</button>
                        <button onClick={() => handleReject(user.id)} className={styles.actionBtnDanger}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === 'Logs' && (
          <div>
            <h3>Activity Logs</h3>
            {logsLoading && <div>Loading logs...</div>}
            {logsError && <div className={styles.errorMsg}>{logsError}</div>}
            {!logsLoading && !logsError && (
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User ID</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.user_id}</td>
                      <td>{log.action}</td>
                      <td>{log.description}</td>
                      <td>{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminManagementPage;
