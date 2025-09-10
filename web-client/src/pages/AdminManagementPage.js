import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AdminManagementPage.module.scss';

const API_BASE = 'http://localhost:8000';

const AdminManagementPage = () => {
  const { user, loading, userInfo } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState(null);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeUserTab, setActiveUserTab] = useState('All Users');

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState({ user: null, newRole: '' });

  // Role mapping for backend
  const roleMapping = {
    'ADMIN': 1,
    'LAB': 2,
    'PRODUCT': 3,
    'ACCOUNTS': 4,
    'ALL_USERS': 5
  };

  const reverseRoleMapping = {
    1: 'ADMIN',
    2: 'LAB',
    3: 'PRODUCT',
    4: 'ACCOUNTS',
    5: 'ALL_USERS'
  };

  // Helper function to get role name from role ID
  const getRoleName = (roleId) => {
    return reverseRoleMapping[roleId] || 'Unknown';
  };

  // Helper function to get role ID from role name
  const getRoleId = (roleName) => {
    return roleMapping[roleName] || 5; // Default to ALL_USERS
  };

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
        
        console.log('User data from /user/me:', data);
        
        // Check if user has admin role (role_id === 1)
        if (data.role_id === 1) {
          setRole('ADMIN');
          setUnauthorized(false);
        } else {
          setRole(data.role_id);
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
    if (!user || role !== 'ADMIN') return;
    fetchUsers();
    fetchOnlineUsers();
    fetchPendingUsers();
    // eslint-disable-next-line
  }, [user, role]);

  // Auto-refresh online users every 30 seconds
  useEffect(() => {
    if (!user || role !== 'ADMIN') return;
    
    const interval = setInterval(() => {
      fetchOnlineUsers();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [user, role]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, { headers: { ...getAuthHeaders() } });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      console.log('All users data:', data);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchOnlineUsers = async () => {
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/online-users?minutes_threshold=5`, { 
        headers: { ...getAuthHeaders() } 
      });
      if (!res.ok) throw new Error('Failed to fetch online users');
      const data = await res.json();
      setOnlineUsers(data);
    } catch (err) {
      setOnlineError(err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/pending-users`, { 
        headers: { ...getAuthHeaders() } 
      });
      if (!res.ok) throw new Error('Failed to fetch pending users');
      const data = await res.json();
      setPendingUsers(data);
    } catch (err) {
      setPendingError(err.message);
    } finally {
      setPendingLoading(false);
    }
  };

  // Modal functions
  const showConfirmModalAction = (action, user, message, role = null) => {
    setModalAction(action);
    setModalMessage(message);
    setSelectedUser(user);
    setShowConfirmModal(true);
  };

  const hideModals = () => {
    setShowConfirmModal(false);
    setShowRoleChangeModal(false);
    setSelectedUser(null);
    setRoleChangeData({ user: null, newRole: '' });
  };

  const handleModalAction = async () => {
    if (!selectedUser) return;

    try {
      let res;
      let successMessage = '';

      switch (modalAction) {
        case 'delete':
          res = await fetch(`${API_BASE}/admin/user/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
      });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Failed to delete user');
          }
          successMessage = `User ${selectedUser.first_name} ${selectedUser.last_name} has been deleted successfully!`;
          break;

        case 'approve':
          res = await fetch(`${API_BASE}/admin/approve/${selectedUser.id}`, {
            method: 'POST',
            headers: { ...getAuthHeaders() }
          });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Failed to approve user');
          }
          successMessage = `User ${selectedUser.first_name} ${selectedUser.last_name} has been approved successfully!`;
          break;

        default:
          throw new Error('Invalid action');
      }

      if (res.ok) {
      // Refresh data
      fetchUsers();
      fetchPendingUsers();

        // Show success message
        alert(successMessage);
      hideModals();
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert(`Action failed: ${error.message}`);
    }
  };

  const handleApprove = (user) => {
    showConfirmModalAction(
      'approve',
      user,
      `Are you sure you want to approve ${user.first_name} ${user.last_name || ''}? This will give them access to the system and they will be able to login immediately.`
    );
  };

  const handleDelete = (user) => {
    showConfirmModalAction(
      'delete',
      user,
      `Are you sure you want to delete ${user.first_name} ${user.last_name || ''}? This action will permanently remove the user from the system and cannot be undone. All associated data will be lost.`
    );
  };

  const handleRoleChange = async (user, newRole) => {
    // Show confirmation modal instead of immediately changing role
    setRoleChangeData({ user, newRole });
    setShowRoleChangeModal(true);
  };

  const confirmRoleChange = async () => {
    const { user, newRole } = roleChangeData;
    try {
      const roleId = getRoleId(newRole);
      const res = await fetch(`${API_BASE}/admin/user/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ 
          role_id: roleId,
          is_approved: true // Automatically approve when role is changed
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to update user role');
      }
      
      // Update local state
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === user.id ? { ...u, role_id: roleId, is_approved: true } : u
      ));
      
      // Also update pending users if this user was pending
      setPendingUsers(prevPending => prevPending.filter(u => u.id !== user.id));
      
      alert(`User ${user.first_name} role updated to ${newRole} and approved successfully!`);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert(`Failed to update user role: ${error.message}`);
    } finally {
      setShowRoleChangeModal(false);
      setRoleChangeData({ user: null, newRole: '' });
    }
  };

  // Filter users for different tabs
  const approvedUsers = users.filter(user => user.is_approved);
  const labStaffUsers = users.filter(user => 
    user.role_id === 2 && user.is_approved
  );
  const productTeamUsers = users.filter(user => 
    user.role_id === 3 && user.is_approved
  );
  const accountTeamUsers = users.filter(user => 
    user.role_id === 4 && user.is_approved
  );

  // Helper function to check if user is online (active in last 5 minutes)
  const isUserOnline = (user) => {
    if (!user.last_seen) return false;
    
    try {
      const lastSeen = new Date(user.last_seen);
      const now = new Date();
      const diffInMinutes = (now - lastSeen) / (1000 * 60);
      return diffInMinutes <= 5;
    } catch (error) {
      console.error('Error parsing last_seen date:', error);
      return false;
    }
  };

  // Helper function to get online status display
  const getOnlineStatus = (user) => {
    if (isUserOnline(user)) {
      return <span className={styles.onlineStatus}>🟢 Online</span>;
    }
    return <span className={styles.offlineStatus}>⚫ Offline</span>;
  };

  // Debug logging
  console.log('AdminManagementPage Debug:', {
    user,
    role,
    roleLoading,
    unauthorized,
    userInfo
  });

  if (loading || roleLoading) {
    return <div className={styles.adminPageContainer}>Loading...</div>;
  }
  if (unauthorized) {
    return (
      <div className={styles.adminPageContainer}>
        <h2>Unauthorized</h2>
        <p>You do not have permission to access this page.</p>
        <p>Debug info: role={role}, user={user?.email}</p>
      </div>
    );
  }

  return (
    <div className={styles.adminPageContainer}>
      <h2>Admin Management</h2>
      
      {/* User Management Section */}
      <div className={styles.userManagementContainer}>
        <h3>User Management</h3>
        <p>Manage all users in the system, approve new registrations, and assign roles.</p>
        
        {/* User Management Navigation Tabs */}
        <div className={styles.userManagementTabs}>
          {['All Users', 'Lab Staff', 'Product Team', 'Account Team', 'Pending', 'Live Users'].map(tab => (
          <button
            key={tab}
              className={activeUserTab === tab ? styles.activeUserTab : styles.userTab}
              onClick={() => setActiveUserTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

        <div className={styles.userManagementContent}>
          {/* All Users Tab */}
          {activeUserTab === 'All Users' && (
          <div>
              <h4>All Approved Users ({approvedUsers.length} total)</h4>
            <button 
              onClick={() => {
                fetchUsers();
                fetchOnlineUsers();
              }} 
              className={styles.refreshBtn}
              disabled={loadingUsers}
            >
              {loadingUsers ? 'Refreshing...' : 'Refresh'}
            </button>
              
            {loadingUsers && <div>Loading users...</div>}
            {error && <div className={styles.errorMsg}>{error}</div>}
              
              {!loadingUsers && !error && approvedUsers.length > 0 && (
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                      <th>Role</th>
                    <th>Email</th>
                      <th>Online Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedUsers.map(user => (
                    <tr key={user.id}>
                      <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                      <td data-label="Role">
                        <select
                            value={getRoleName(user.role_id || user.role)}
                          onChange={e => handleRoleChange(user, e.target.value)}
                            className={styles.roleSelect}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="LAB">Lab Staff</option>
                            <option value="PRODUCT">Product</option>
                            <option value="ACCOUNTS">Account</option>
                            <option value="ALL_USERS">All Users (Limited)</option>
                        </select>
                      </td>
                        <td data-label="Email">{user.email}</td>
                        <td data-label="Online Status">{getOnlineStatus(user)}</td>
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
              
              {!loadingUsers && !error && approvedUsers.length === 0 && (
                <div className={styles.emptyState}>
                  <h4>No Approved Users Found</h4>
                  <p>There are no approved users in the system yet.</p>
                </div>
              )}
          </div>
        )}

          {/* Lab Staff Tab */}
          {activeUserTab === 'Lab Staff' && (
          <div>
              <h4>Lab Staff Users ({labStaffUsers.length} total)</h4>
              <button 
                onClick={() => {
                  fetchUsers();
                  fetchOnlineUsers();
                }} 
                className={styles.refreshBtn}
                disabled={loadingUsers}
              >
                {loadingUsers ? 'Refreshing...' : 'Refresh'}
              </button>
              
              {loadingUsers && <div>Loading users...</div>}
            {error && <div className={styles.errorMsg}>{error}</div>}
              
              {!loadingUsers && !error && labStaffUsers.length > 0 && (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                      <th>Role</th>
                        <th>Email</th>
                      <th>Online Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labStaffUsers.map(user => (
                        <tr key={user.id}>
                          <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                        <td data-label="Role">
                          <select
                            value={getRoleName(user.role_id || user.role)}
                            onChange={e => handleRoleChange(user, e.target.value)}
                            className={styles.roleSelect}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="LAB">Lab Staff</option>
                            <option value="PRODUCT">Product</option>
                            <option value="ACCOUNTS">Account</option>
                            <option value="ALL_USERS">All Users (Limited)</option>
                          </select>
                        </td>
                          <td data-label="Email">{user.email}</td>
                        <td data-label="Online Status">{getOnlineStatus(user)}</td>
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
              
              {!loadingUsers && !error && labStaffUsers.length === 0 && (
                <div className={styles.emptyState}>
                  <h4>No Lab Staff Users Found</h4>
                  <p>There are no lab staff users in the system yet.</p>
                </div>
            )}
          </div>
        )}

          {/* Product Team Tab */}
          {activeUserTab === 'Product Team' && (
          <div>
              <h4>Product Team Users ({productTeamUsers.length} total)</h4>
              <button 
                onClick={() => {
                  fetchUsers();
                  fetchOnlineUsers();
                }} 
                className={styles.refreshBtn}
                disabled={loadingUsers}
              >
                {loadingUsers ? 'Refreshing...' : 'Refresh'}
              </button>
              
              {loadingUsers && <div>Loading users...</div>}
            {error && <div className={styles.errorMsg}>{error}</div>}
              
              {!loadingUsers && !error && productTeamUsers.length > 0 && (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                      <th>Role</th>
                        <th>Email</th>
                      <th>Online Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productTeamUsers.map(user => (
                        <tr key={user.id}>
                          <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                        <td data-label="Role">
                          <select
                            value={getRoleName(user.role_id || user.role)}
                            onChange={e => handleRoleChange(user, e.target.value)}
                            className={styles.roleSelect}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="LAB">Lab Staff</option>
                            <option value="PRODUCT">Product</option>
                            <option value="ACCOUNTS">Account</option>
                            <option value="ALL_USERS">All Users (Limited)</option>
                          </select>
                        </td>
                          <td data-label="Email">{user.email}</td>
                        <td data-label="Online Status">{getOnlineStatus(user)}</td>
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
              
              {!loadingUsers && !error && productTeamUsers.length === 0 && (
                <div className={styles.emptyState}>
                  <h4>No Product Team Users Found</h4>
                  <p>There are no product team users in the system yet.</p>
                </div>
            )}
          </div>
        )}

          {/* Account Team Tab */}
          {activeUserTab === 'Account Team' && (
          <div>
              <h4>Account Team Users ({accountTeamUsers.length} total)</h4>
              <button 
                onClick={() => {
                  fetchUsers();
                  fetchOnlineUsers();
                }} 
                className={styles.refreshBtn}
                disabled={loadingUsers}
              >
                {loadingUsers ? 'Refreshing...' : 'Refresh'}
              </button>
              
              {loadingUsers && <div>Loading users...</div>}
            {error && <div className={styles.errorMsg}>{error}</div>}
              
              {!loadingUsers && !error && accountTeamUsers.length > 0 && (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                      <th>Role</th>
                        <th>Email</th>
                      <th>Online Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountTeamUsers.map(user => (
                        <tr key={user.id}>
                          <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                        <td data-label="Role">
                          <select
                            value={getRoleName(user.role_id || user.role)}
                            onChange={e => handleRoleChange(user, e.target.value)}
                            className={styles.roleSelect}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="LAB">Lab Staff</option>
                            <option value="PRODUCT">Product</option>
                            <option value="ACCOUNTS">Account</option>
                            <option value="ALL_USERS">All Users (Limited)</option>
                          </select>
                        </td>
                          <td data-label="Email">{user.email}</td>
                        <td data-label="Online Status">{getOnlineStatus(user)}</td>
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
              
              {!loadingUsers && !error && accountTeamUsers.length === 0 && (
                <div className={styles.emptyState}>
                  <h4>No Account Team Users Found</h4>
                  <p>There are no account team users in the system yet.</p>
                </div>
            )}
          </div>
        )}

          {/* Pending Tab */}
          {activeUserTab === 'Pending' && (
          <div>
              <h4>Pending Approvals ({pendingUsers.length} total)</h4>
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
                        <th>Name</th>
                        <th>Email</th>
                          <th>Requested Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map(user => (
                        <tr key={user.id}>
                          <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                          <td data-label="Email">{user.email}</td>
                            <td data-label="Requested Role">
                            <select
                                value={getRoleName(user.role_id || user.role)}
                              onChange={e => handleRoleChange(user, e.target.value)}
                                className={styles.roleSelect}
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="LAB">Lab Staff</option>
                                <option value="PRODUCT">Product</option>
                                <option value="ACCOUNTS">Account</option>
                                <option value="ALL_USERS">All Users (Limited)</option>
                            </select>
                          </td>
                          <td data-label="Actions">
                            <button onClick={() => handleApprove(user)} className={styles.actionBtn}>
                              Approve
                            </button>
                            <button onClick={() => handleDelete(user)} className={styles.actionBtnDanger}>
                                Delete
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

          {/* Live Users Tab */}
          {activeUserTab === 'Live Users' && (
          <div>
              <h4>Live Users ({onlineUsers.length} total)</h4>
            <p>Users currently online (active in the last 5 minutes).</p>
            <button 
              onClick={fetchOnlineUsers} 
              className={styles.refreshBtn}
              disabled={onlineLoading}
            >
              {onlineLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            {onlineLoading && <div>Loading online users...</div>}
            {onlineError && <div className={styles.errorMsg}>{onlineError}</div>}
            {!onlineLoading && !onlineError && (
              <>
                {onlineUsers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h4>No Online Users</h4>
                    <p>No users are currently online.</p>
                  </div>
                ) : (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                          <th>Role</th>
                        <th>Email</th>
                          <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onlineUsers.map(user => (
                        <tr key={user.id}>
                          <td data-label="Name">{user.first_name} {user.last_name || ''}</td>
                            <td data-label="Role">
                              <select
                                value={getRoleName(user.role_id || user.role)}
                                onChange={e => handleRoleChange(user, e.target.value)}
                                className={styles.roleSelect}
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="LAB">Lab Staff</option>
                                <option value="PRODUCT">Product</option>
                                <option value="ACCOUNTS">Account</option>
                                <option value="ALL_USERS">All Users (Limited)</option>
                              </select>
                            </td>
                          <td data-label="Email">{user.email}</td>
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
              </>
            )}
          </div>
            )}
          </div>
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
              <button onClick={handleModalAction} className={styles.modalBtnConfirm}>
                {modalAction === 'delete' ? 'Delete User' : 
                 modalAction === 'approve' ? 'Approve User' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      {showRoleChangeModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Confirm Role Change</h3>
            <p>Are you sure you want to change {roleChangeData.user?.first_name} {roleChangeData.user?.last_name || ''}'s role to "{roleChangeData.newRole}"?</p>
            <p><strong>Note:</strong> This action will also automatically approve the user if they were pending.</p>
            <div className={styles.modalActions}>
              <button onClick={() => setShowRoleChangeModal(false)} className={styles.modalBtnCancel}>
                Cancel
              </button>
              <button onClick={confirmRoleChange} className={styles.modalBtnConfirmAction}>
                Confirm Role Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {/* This state variable was removed */}
      {/* {showSuccessModal && (
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
      )} */}

      {/* App Info Modal */}
      {/* This state variable was removed */}
      {/* {showAppInfoModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Chemical Inventory Management System</h3>
            <div className={styles.appInfoContent}>
              <p><strong>Overview:</strong> A comprehensive chemical inventory management system designed for laboratories, research facilities, and chemical manufacturing companies.</p>
              
              <h4>Key Features:</h4>
              <ul>
                <li><strong>Chemical Inventory:</strong> Track chemical products, formulations, and safety data sheets</li>
                <li><strong>Stock Management:</strong> Monitor stock levels, manage purchases, and track inventory movements</li>
                <li><strong>User Management:</strong> Role-based access control with admin, lab staff, product team, and account team roles</li>
                <li><strong>Safety Compliance:</strong> Manage safety data sheets, hazard classifications, and regulatory compliance</li>
                <li><strong>Purchase Management:</strong> Track chemical purchases, suppliers, and costs</li>
                <li><strong>Activity Logging:</strong> Comprehensive audit trail of all system activities</li>
                <li><strong>Notifications:</strong> Alert system for low stock, expired chemicals, and safety violations</li>
              </ul>
              
              <h4>User Roles:</h4>
              <ul>
                <li><strong>Admin:</strong> Full system access, user management, and system configuration</li>
                <li><strong>Lab Staff:</strong> Chemical inventory management and safety data access</li>
                <li><strong>Product Team:</strong> Product information management and reporting</li>
                <li><strong>Account Team:</strong> Financial transactions and purchase order management</li>
                <li><strong>Basic Users:</strong> Read-only access to inventory and basic reports</li>
              </ul>
              
              <p><strong>Technology Stack:</strong> React frontend, FastAPI backend, PostgreSQL database, Firebase authentication</p>
            </div>
            <div className={styles.modalActions}>
              <button onClick={hideModals} className={styles.modalBtnConfirm}>
                Got it!
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default AdminManagementPage;
