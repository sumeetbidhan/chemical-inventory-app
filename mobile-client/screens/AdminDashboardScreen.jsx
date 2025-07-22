import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, FlatList, Alert, Image } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import GradientText from '../components/GradientText';

const TABS = ['Users', 'Lab Staff', 'Product Team', 'Account Team', 'Pending', 'Online Users', 'Logs'];
const API_BASE = 'http://192.168.1.16:8000';

export default function AdminDashboardScreen() {
  const { user, userInfo, logout, firebaseToken } = useAuth();
  const [activeTab, setActiveTab] = useState('Users');
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to get auth headers
  const getAuthHeaders = () => {
    return firebaseToken ? { 'Authorization': `Bearer ${firebaseToken}` } : {};
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' }
      ]
    );
  };

  useEffect(() => {
    if (activeTab === 'Users' || activeTab === 'Lab Staff' || activeTab === 'Product Team' || activeTab === 'Account Team') fetchUsers();
    if (activeTab === 'Pending') fetchPendingUsers();
    if (activeTab === 'Online Users') fetchOnlineUsers();
    if (activeTab === 'Logs') fetchLogs();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, { 
        headers: { ...getAuthHeaders() } 
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/pending-users`, { 
        headers: { ...getAuthHeaders() } 
      });
      if (!res.ok) throw new Error('Failed to fetch pending users');
      const data = await res.json();
      setPendingUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/online-users?minutes_threshold=5`, { 
        headers: { ...getAuthHeaders() } 
      });
      if (!res.ok) throw new Error('Failed to fetch online users');
      const data = await res.json();
      setOnlineUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/logs`, { 
        headers: { ...getAuthHeaders() } 
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.first_name} ${user.last_name || ''}?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteUser(user) },
      ]
    );
  };

  const deleteUser = async (user) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/user/${user.id}`, { 
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (user, newRole) => {
    const roleNames = {
      'admin': 'Admin',
      'lab_staff': 'Lab Staff',
      'product': 'Product Team',
      'account': 'Account Team',
      'all_users': 'Basic User'
    };
    
    Alert.alert(
      'Change User Role',
      `Are you sure you want to change ${user.first_name} ${user.last_name || ''}'s role from ${roleNames[user.role] || user.role} to ${roleNames[newRole]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change Role', onPress: () => changeUserRole(user, newRole) },
      ]
    );
  };

  const changeUserRole = async (user, newRole) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/user/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to change role');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user) => {
    Alert.alert(
      'Approve User',
      `Are you sure you want to approve ${user.first_name} ${user.last_name || ''}?\n\nThis will give them access to the system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', style: 'default', onPress: () => approveUser(user) },
      ]
    );
  };

  const approveUser = async (user) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/approve/${user.id}`, { 
        method: 'POST',
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Failed to approve user');
      fetchPendingUsers();
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (user) => {
    Alert.alert(
      'Reject User',
      `Are you sure you want to reject ${user.first_name} ${user.last_name || ''}?\n\nThis will permanently delete their account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => rejectUser(user) },
      ]
    );
  };

  const rejectUser = async (user) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/user/${user.id}`, { 
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Failed to reject user');
      fetchPendingUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtering helpers
  const approvedUsers = users.filter(u => u.is_approved);
  const labStaffUsers = users.filter(u => u.role === 'lab_staff' && u.is_approved);
  const productTeamUsers = users.filter(u => u.role === 'product' && u.is_approved);
  const accountTeamUsers = users.filter(u => u.role === 'account' && u.is_approved);

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/company_icon.png')} 
            style={styles.companyLogo}
            resizeMode="contain"
          />
          <GradientText style={styles.companyName}>Blossoms Aroma</GradientText>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Ionicons name="shield-checkmark" size={28} color="#4f8cff" />
            <Text style={styles.title}>Admin Management</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Welcome, {userInfo?.first_name || user?.email}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              {tab === 'Users' && <Ionicons name="people-outline" size={16} color={activeTab === tab ? '#fff' : '#666'} />}
              {tab === 'Lab Staff' && <MaterialCommunityIcons name="flask-outline" size={16} color={activeTab === tab ? '#fff' : '#666'} />}
              {tab === 'Product Team' && <MaterialIcons name="inventory" size={16} color={activeTab === tab ? '#fff' : '#666'} />}
              {tab === 'Account Team' && <FontAwesome5 name="dollar-sign" size={16} color={activeTab === tab ? '#fff' : '#666'} />}
              {tab === 'Pending' && <Ionicons name="time-outline" size={16} color={activeTab === tab ? '#fff' : '#666'} />}
              {tab === 'Online Users' && <Ionicons name="wifi-outline" size={16} color={activeTab === tab ? '#fff' : '#666'} />}
              {tab === 'Logs' && <Ionicons name="document-text-outline" size={16} color={activeTab === tab ? '#fff' : '#666'} />}
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.tabContent}>
          {loading && <ActivityIndicator size="large" color="#4f8cff" />}
          {error && <Text style={styles.errorMsg}>{error}</Text>}
          {/* Users Tab */}
          {activeTab === 'Users' && (
            <FlatList
              data={approvedUsers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.first_name} {item.last_name || ''}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    <Text style={styles.userRole}>Role: {item.role}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={14} color="#fff" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                  <View style={styles.rolePicker}>
                    <Text style={styles.rolePickerTitle}>Change Role:</Text>
                    <View style={styles.roleOptions}>
                      <TouchableOpacity 
                        style={[styles.roleOption, item.role === 'admin' && styles.currentRole]} 
                        onPress={() => handleRoleChange(item, 'admin')}
                      >
                        <Ionicons name="shield-checkmark" size={16} color={item.role === 'admin' ? '#fff' : '#4f8cff'} />
                        <Text style={[styles.roleOptionText, item.role === 'admin' && styles.currentRoleText]}>Admin</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.roleOption, item.role === 'lab_staff' && styles.currentRole]} 
                        onPress={() => handleRoleChange(item, 'lab_staff')}
                      >
                        <MaterialCommunityIcons name="flask" size={16} color={item.role === 'lab_staff' ? '#fff' : '#4f8cff'} />
                        <Text style={[styles.roleOptionText, item.role === 'lab_staff' && styles.currentRoleText]}>Lab Staff</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.roleOption, item.role === 'product' && styles.currentRole]} 
                        onPress={() => handleRoleChange(item, 'product')}
                      >
                        <MaterialIcons name="inventory" size={16} color={item.role === 'product' ? '#fff' : '#4f8cff'} />
                        <Text style={[styles.roleOptionText, item.role === 'product' && styles.currentRoleText]}>Product</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.roleOption, item.role === 'account' && styles.currentRole]} 
                        onPress={() => handleRoleChange(item, 'account')}
                      >
                        <FontAwesome5 name="dollar-sign" size={16} color={item.role === 'account' ? '#fff' : '#4f8cff'} />
                        <Text style={[styles.roleOptionText, item.role === 'account' && styles.currentRoleText]}>Account</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.roleOption, item.role === 'all_users' && styles.currentRole]} 
                        onPress={() => handleRoleChange(item, 'all_users')}
                      >
                        <Ionicons name="people" size={16} color={item.role === 'all_users' ? '#fff' : '#4f8cff'} />
                        <Text style={[styles.roleOptionText, item.role === 'all_users' && styles.currentRoleText]}>Basic User</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888' }}>No approved users found.</Text>}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: 1 }}
              contentContainerStyle={styles.listContainer}
              style={styles.flatList}
            />
          )}
          {/* Lab Staff Tab */}
          {activeTab === 'Lab Staff' && (
            <FlatList
              data={labStaffUsers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.first_name} {item.last_name || ''}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="person-remove-outline" size={14} color="#fff" />
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888' }}>No Lab Staff members found.</Text>}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: 1 }}
              contentContainerStyle={styles.listContainer}
              style={styles.flatList}
            />
          )}
          {/* Product Team Tab */}
          {activeTab === 'Product Team' && (
            <FlatList
              data={productTeamUsers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.first_name} {item.last_name || ''}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="person-remove-outline" size={14} color="#fff" />
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888' }}>No Product Team members found.</Text>}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: 1 }}
              contentContainerStyle={styles.listContainer}
              style={styles.flatList}
            />
          )}
          {/* Account Team Tab */}
          {activeTab === 'Account Team' && (
            <FlatList
              data={accountTeamUsers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.first_name} {item.last_name || ''}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="person-remove-outline" size={14} color="#fff" />
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888' }}>No Account Team members found.</Text>}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: 1 }}
              contentContainerStyle={styles.listContainer}
              style={styles.flatList}
            />
          )}
          {/* Pending Tab */}
          {activeTab === 'Pending' && (
            <FlatList
              data={pendingUsers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.first_name} {item.last_name || ''}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    <Text style={styles.userRole}>Role: {item.role}</Text>
                  </View>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleReject(item)}>
                    <Ionicons name="close-circle-outline" size={14} color="#fff" />
                    <Text style={styles.deleteBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888' }}>No pending users found.</Text>}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: 1 }}
              contentContainerStyle={styles.listContainer}
              style={styles.flatList}
            />
          )}
          {/* Online Users Tab */}
          {activeTab === 'Online Users' && (
            <FlatList
              data={onlineUsers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.first_name} {item.last_name || ''}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    <Text style={styles.userRole}>Role: {item.role}</Text>
                    <Text style={{ color: '#27ae60', fontSize: 13 }}>Last Seen: {item.last_seen ? new Date(item.last_seen).toLocaleString() : 'Never'}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888' }}>No online users found.</Text>}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: 1 }}
              contentContainerStyle={styles.listContainer}
              style={styles.flatList}
            />
          )}
          {/* Logs Tab */}
          {activeTab === 'Logs' && (
            <FlatList
              data={logs}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>Action: {item.action}</Text>
                    <Text style={styles.userEmail}>User: {item.user_email || 'N/A'}</Text>
                    <Text style={styles.userRole}>Desc: {item.description}</Text>
                    <Text style={{ color: '#888', fontSize: 13 }}>Time: {new Date(item.timestamp).toLocaleString()}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888' }}>No logs found.</Text>}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: 1 }}
              contentContainerStyle={styles.listContainer}
              style={styles.flatList}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  companyLogo: {
    width: 35,
    height: 35,
    marginRight: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513', // Saddle Brown - more brown color
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 20,
    backgroundColor: '#f5f6fa',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tab: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    margin: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#4f8cff',
    borderColor: '#4f8cff',
  },
  tabText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  tabContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
    minHeight: 450, // Increased height to show more users
  },
  flatList: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  tabContentText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 12,
  },
  errorMsg: {
    color: '#fff',
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
    textAlign: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f8fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#222',
    marginBottom: 2,
  },
  userEmail: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  userRole: {
    color: '#4f8cff',
    fontSize: 12,
    marginTop: 0,
  },
  deleteBtn: {
    backgroundColor: '#e74c3c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  approveBtn: {
    backgroundColor: '#27ae60',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rolePicker: {
    marginLeft: 6,
    alignItems: 'flex-start',
    minWidth: 110,
  },
  rolePickerTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  roleOptions: {
    gap: 3,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#e0e8ff',
    shadowColor: '#4f8cff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  currentRole: {
    backgroundColor: '#4f8cff',
    borderColor: '#4f8cff',
    shadowColor: '#4f8cff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  roleOptionText: {
    color: '#4f8cff',
    fontSize: 11,
    fontWeight: '600',
  },
  currentRoleText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
}); 