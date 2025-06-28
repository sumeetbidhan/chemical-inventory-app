import React, { useState, useEffect } from 'react';
import styles from './AdminManagementPage.module.scss';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TABS = ['Users', 'Lab Staff', 'Product Team', 'Account Team', 'Pending', 'Logs'];

const API_BASE = 'http://localhost:8000';

const AdminManagementPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('Users');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalSuccessMessage, setModalSuccessMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');

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
        console.error('Error fetching user role:', err);
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
    if (activeTab === 'Lab Staff') fetchUsers();
    if (activeTab === 'Product Team') fetchUsers();
    if (activeTab === 'Account Team') fetchUsers();
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

  // Modal functions
  const showConfirmModalAction = (action, user, message, role = null) => {
    setModalAction(action);
    setModalMessage(message);
    setSelectedUser(user);
    setNewRole(role);
    setShowConfirmModal(true);
  };

  const hideModals = () => {
    setShowConfirmModal(false);
    setShowSuccessModal(false);
    setSelectedUser(null);
    setNewRole('');
  };

  const executeAction = async () => {
    if (!selectedUser) return;

    try {
      let res;
      let successMessage = '';

      switch (modalAction) {
        case 'approve':
          res = await fetch(`${API_BASE}/admin/approve/${selectedUser.id}`, {
        method: 'POST',
        headers: { ...getAuthHeaders() }
      });
          successMessage = `User ${selectedUser.first_name} ${selectedUser.last_name} has been approved successfully!`;
          break;

        case 'delete':
          res = await fetch(`${API_BASE}/admin/user/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
      });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Action failed');
          }
          const deleteResponse = await res.json();
          if (deleteResponse.firebase_deleted) {
            successMessage = `User ${selectedUser.first_name} ${selectedUser.last_name} has been deleted successfully from both database and Firebase!`;
          } else {
            successMessage = `User ${selectedUser.first_name} ${selectedUser.last_name} has been deleted from database, but Firebase deletion failed. Please check Firebase console.`;
          }
          break;

        case 'roleChange':
          res = await fetch(`${API_BASE}/admin/user/${selectedUser.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ role: newRole })
          });
          successMessage = `User ${selectedUser.first_name} ${selectedUser.last_name}'s role has been changed to ${newRole.replace('_', ' ').toUpperCase()} successfully!`;
          break;

        default:
          throw new Error('Unknown action');
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Action failed');
      }

      // Refresh data
      fetchUsers();
      fetchPendingUsers();

      // Show success modal
      setModalSuccessMessage(successMessage);
      setShowSuccessModal(true);
      hideModals();

    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleApprove = (user) => {
    showConfirmModalAction(
      'approve',
      user,
      `Are you sure you want to approve ${user.first_name} ${user.last_name || ''}? This will give them access to the system.`
    );
  };

  const handleDelete = (user) => {
    showConfirmModalAction(
      'delete',
      user,
      `Are you sure you want to delete ${user.first_name} ${user.last_name || ''}? This action cannot be undone.`
    );
  };

  const handleRoleChange = (user, newRole) => {
    showConfirmModalAction(
      'roleChange',
      user,
      `Are you sure you want to change ${user.first_name} ${user.last_name || ''}'s role to ${newRole.replace('_', ' ').toUpperCase()}?`,
      newRole
    );
  };

  // Filter users for different tabs
  const approvedUsers = users.filter(user => user.is_approved);
  const labStaffUsers = users.filter(user => user.role === 'lab_staff' && user.is_approved);
  const productTeamUsers = users.filter(user => user.role === 'product' && user.is_approved);
  const accountTeamUsers = users.filter(user => user.role === 'account' && user.is_approved);

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
            <h3>Approved Users ({approvedUsers.length} users)</h3>
            <p>Manage approved users with full system access.</p>
            {loadingUsers && <div>Loading users...</div>}
            {error && <div className={styles.errorMsg}>{error}</div>}
            {!loadingUsers && !error && (
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedUsers.map(user => (
                    <tr key={user.id}>
                      <td data-label="ID">{user.id}</td>
                      <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                      <td data-label="Email">{user.email}</td>
                      <td data-label="Phone">{user.phone || 'Not provided'}</td>
                      <td data-label="Role">
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user, e.target.value)}
                        >
                          <option value="admin">Admin</option>
                          <option value="lab_staff">Lab Staff</option>
                          <option value="product">Product</option>
                          <option value="account">Account</option>
                          <option value="all_users">All Users (Limited)</option>
                        </select>
                      </td>
                      <td data-label="Status">{user.is_approved ? 'Approved' : 'Pending'}</td>
                      <td data-label="Actions">
                        <button onClick={() => handleDelete(user)} className={styles.actionBtnDanger}>
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
        {activeTab === 'Lab Staff' && (
          <div>
            <h3>Lab Staff ({labStaffUsers.length} members)</h3>
            <p>Manage lab staff members who can add and modify chemical inventory data.</p>
            {loadingUsers && <div>Loading lab staff...</div>}
            {error && <div className={styles.errorMsg}>{error}</div>}
            {!loadingUsers && !error && (
              <>
                {labStaffUsers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h4>No Lab Staff Members</h4>
                    <p>No users with "Lab Staff" role found. Users can register directly and admins can approve them.</p>
                  </div>
                ) : (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labStaffUsers.map(user => (
                        <tr key={user.id}>
                          <td data-label="ID">{user.id}</td>
                          <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                          <td data-label="Email">{user.email}</td>
                          <td data-label="Phone">{user.phone || 'Not provided'}</td>
                          <td data-label="Status">{user.is_approved ? 'Approved' : 'Pending'}</td>
                          <td data-label="Actions">
                            <button onClick={() => handleDelete(user)} className={styles.actionBtnDanger}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
        {activeTab === 'Product Team' && (
          <div>
            <h3>Product Team ({productTeamUsers.length} members)</h3>
            <p>Manage product team members who can add and modify chemical inventory data.</p>
            {loadingUsers && <div>Loading product team...</div>}
            {error && <div className={styles.errorMsg}>{error}</div>}
            {!loadingUsers && !error && (
              <>
                {productTeamUsers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h4>No Product Team Members</h4>
                    <p>No users with "Product" role found. Users can register directly and admins can approve them.</p>
                  </div>
                ) : (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productTeamUsers.map(user => (
                        <tr key={user.id}>
                          <td data-label="ID">{user.id}</td>
                          <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                          <td data-label="Email">{user.email}</td>
                          <td data-label="Phone">{user.phone || 'Not provided'}</td>
                          <td data-label="Status">{user.is_approved ? 'Approved' : 'Pending'}</td>
                          <td data-label="Actions">
                            <button onClick={() => handleDelete(user)} className={styles.actionBtnDanger}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
        {activeTab === 'Account Team' && (
          <div>
            <h3>Account Team ({accountTeamUsers.length} members)</h3>
            <p>Manage account team members who handle financial transactions and purchase orders.</p>
            {loadingUsers && <div>Loading account team...</div>}
            {error && <div className={styles.errorMsg}>{error}</div>}
            {!loadingUsers && !error && (
              <>
                {accountTeamUsers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h4>No Account Team Members</h4>
                    <p>No users with "Account" role found. Users can register directly and admins can approve them.</p>
                  </div>
                ) : (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountTeamUsers.map(user => (
                        <tr key={user.id}>
                          <td data-label="ID">{user.id}</td>
                          <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                          <td data-label="Email">{user.email}</td>
                          <td data-label="Phone">{user.phone || 'Not provided'}</td>
                          <td data-label="Status">{user.is_approved ? 'Approved' : 'Pending'}</td>
                          <td data-label="Actions">
                            <button onClick={() => handleDelete(user)} className={styles.actionBtnDanger}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
        {activeTab === 'Pending' && (
          <div>
            <h3>Pending Approvals ({pendingUsers.length} users)</h3>
            <p>Users waiting for admin approval to access the system.</p>
            {pendingLoading && <div>Loading pending users...</div>}
            {pendingError && <div className={styles.errorMsg}>{pendingError}</div>}
            {!pendingLoading && !pendingError && (
              <>
                {pendingUsers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h4>No Pending Approvals</h4>
                    <p>All users have been approved or there are no new registrations.</p>
                  </div>
                ) : (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Current Role</th>
                        <th>Change Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map(user => (
                        <tr key={user.id}>
                          <td data-label="ID">{user.id}</td>
                          <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                          <td data-label="Email">{user.email}</td>
                          <td data-label="Phone">{user.phone || 'Not provided'}</td>
                          <td data-label="Current Role">{user.role.replace('_', ' ').toUpperCase()}</td>
                          <td data-label="Change Role">
                            <select
                              value={user.role}
                              onChange={e => handleRoleChange(user, e.target.value)}
                            >
                              <option value="admin">Admin</option>
                              <option value="lab_staff">Lab Staff</option>
                              <option value="product">Product</option>
                              <option value="account">Account</option>
                              <option value="all_users">All Users (Limited)</option>
                            </select>
                          </td>
                          <td data-label="Actions">
                            <button onClick={() => handleApprove(user)} className={styles.actionBtn}>
                              Approve
                            </button>
                            <button onClick={() => handleDelete(user)} className={styles.actionBtnDanger}>
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
        {activeTab === 'Logs' && (
          <div>
            <h3>Activity Logs ({logs.length} entries)</h3>
            <p>System activity and user actions log.</p>
            {logsLoading && <div>Loading logs...</div>}
            {logsError && <div className={styles.errorMsg}>{logsError}</div>}
            {!logsLoading && !logsError && (
              <>
                {logs.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h4>No Activity Logs</h4>
                    <p>No activity has been logged yet.</p>
                  </div>
                ) : (
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
                          <td data-label="ID">{log.id}</td>
                          <td data-label="User ID">{log.user_id}</td>
                          <td data-label="Action">{log.action}</td>
                          <td data-label="Description">{log.description}</td>
                          <td data-label="Timestamp">{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Confirm Action</h3>
            <p>{modalMessage}</p>
            <div className={styles.modalActions}>
              <button onClick={hideModals} className={styles.modalBtnCancel}>
                Cancel
              </button>
              <button onClick={executeAction} className={styles.modalBtnConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Success!</h3>
            <p>{modalSuccessMessage}</p>
            <div className={styles.modalActions}>
              <button onClick={hideModals} className={styles.modalBtnConfirm}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementPage;
