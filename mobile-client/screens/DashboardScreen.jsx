import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import GradientText from '../components/GradientText';

const API_BASE = 'http://192.168.1.10:8000';

const DashboardScreen = ({ navigation }) => {
  const { user, userInfo, loading, backendAvailable, logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [fetching, setFetching] = useState(true);

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

  if (loading || fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f8cff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) return null;

  // Show pending approval message
  if (pending) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Account Pending Approval</Text>
        </View>
        
        <View style={styles.pendingCard}>
          <View style={styles.pendingIcon}>
            <Ionicons name="time-outline" size={48} color="#fff" />
          </View>
          <Text style={styles.pendingTitle}>
            Welcome, {userInfo?.first_name || user.email}!
          </Text>
          <Text style={styles.pendingMessage}>
            Your account is pending admin approval. You will be able to access the chemical inventory system once an administrator approves your account.
          </Text>
          <Text style={styles.pendingSubtext}>
            Please contact your system administrator or wait for approval notification.
          </Text>
        </View>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <View style={styles.stepList}>
            <View style={styles.stepItem}>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.stepText}>Admin reviews your registration</Text>
            </View>
            <View style={styles.stepItem}>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.stepText}>Account gets approved with appropriate role</Text>
            </View>
            <View style={styles.stepItem}>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.stepText}>You receive access to the chemical inventory system</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Show backend connection warning if backend is not available
  if (!backendAvailable) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={styles.warningTitle}>Backend Connection Warning</Text>
          </View>
          <Text style={styles.warningMessage}>
            The backend server appears to be offline. Some features may not work properly. Please ensure the backend server is running.
          </Text>
        </View>
        
        <View style={styles.header}>
          <Text style={styles.title}>Welcome, {userInfo?.first_name || user.email}</Text>
        </View>
        
        <View style={styles.userInfoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Verified</Text>
            <Text style={styles.infoValue}>{user.emailVerified ? 'Yes' : 'No'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Backend Status</Text>
            <Text style={[styles.infoValue, { color: '#dc3545' }]}>Offline</Text>
          </View>
        </View>
        
        <View style={styles.quickAccessCard}>
          <TouchableOpacity 
            style={styles.quickAccessButton}
            onPress={() => navigation.navigate('Chemicals')}
          >
            <MaterialIcons name="flask" size={24} color="#fff" />
            <Text style={styles.quickAccessText}>Chemical Inventory</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.permissionsCard}>
          <View style={styles.permissionsHeader}>
            <Ionicons name="shield-checkmark" size={18} color="#6c757d" />
            <Text style={styles.permissionsTitle}>Limited Mode</Text>
          </View>
          <View style={styles.permissionList}>
            <View style={styles.permissionItem}>
              <Ionicons name="checkmark-circle" size={16} color="#28a745" />
              <Text style={styles.permissionText}>View inventory (if cached)</Text>
            </View>
            <View style={styles.permissionItem}>
              <Ionicons name="checkmark-circle" size={16} color="#28a745" />
              <Text style={styles.permissionText}>Basic navigation</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Role-based dashboard content
  const renderDashboardContent = () => {
    if (!userInfo) return null;
    const { role } = userInfo;
    
    return (
      <>
        <View style={styles.quickAccessCard}>
          <TouchableOpacity 
            style={styles.quickAccessButton}
            onPress={() => navigation.navigate('Chemicals')}
          >
            <MaterialIcons name="flask" size={24} color="#fff" />
            <Text style={styles.quickAccessText}>Chemical Inventory</Text>
          </TouchableOpacity>
          
          {role === 'admin' && (
            <TouchableOpacity 
              style={[styles.quickAccessButton, styles.adminButton]}
              onPress={() => navigation.navigate('Admin')}
            >
              <Ionicons name="people" size={24} color="#fff" />
              <Text style={styles.quickAccessText}>Admin Management</Text>
            </TouchableOpacity>
          )}
          
          {role === 'account' && (
            <TouchableOpacity 
              style={[styles.quickAccessButton, styles.accountButton]}
              onPress={() => navigation.navigate('Account')}
            >
              <FontAwesome5 name="dollar-sign" size={24} color="#fff" />
              <Text style={styles.quickAccessText}>Account Team</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.permissionsCard}>
          <View style={styles.permissionsHeader}>
            <Ionicons name="shield-checkmark" size={18} color="#6c757d" />
            <Text style={styles.permissionsTitle}>Your Permissions</Text>
          </View>
          <View style={styles.permissionList}>
            {role === 'admin' && [
              <View key="manage_users" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Manage users</Text>
              </View>,
              <View key="manage_invitations" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Manage invitations</Text>
              </View>,
              <View key="view_logs" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View logs</Text>
              </View>,
              <View key="approve_users" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Approve users</Text>
              </View>,
              <View key="delete_users" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Delete users</Text>
              </View>,
              <View key="modify_users" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Modify users</Text>
              </View>,
            ]}
            {role === 'lab_staff' && [
              <View key="view_inventory" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View inventory</Text>
              </View>,
              <View key="add_chemicals" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Add chemicals</Text>
              </View>,
              <View key="update_chemicals" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Update chemicals</Text>
              </View>,
              <View key="view_reports" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View reports</Text>
              </View>,
              <View key="manage_safety_data" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Manage safety data</Text>
              </View>,
            ]}
            {role === 'product' && [
              <View key="view_inventory" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View inventory</Text>
              </View>,
              <View key="view_reports" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View reports</Text>
              </View>,
              <View key="export_data" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Export data</Text>
              </View>,
              <View key="manage_product_info" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Manage product info</Text>
              </View>,
            ]}
            {role === 'account' && [
              <View key="view_inventory" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View inventory</Text>
              </View>,
              <View key="view_reports" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View reports</Text>
              </View>,
              <View key="manage_accounts" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Manage accounts</Text>
              </View>,
              <View key="view_financial_data" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View financial data</Text>
              </View>,
            ]}
            {role === 'all_users' && [
              <View key="view_inventory" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View inventory (read-only)</Text>
              </View>,
              <View key="view_reports" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>View basic reports</Text>
              </View>,
              <View key="limited_access" style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.permissionText}>Limited system access</Text>
              </View>,
            ]}
          </View>
        </View>
      </>
    );
  };

  return (
    <ScrollView style={styles.container}>
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
            <Text style={styles.title}>Welcome, {userInfo?.first_name || user.email}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.userInfoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{userInfo?.first_name} {userInfo?.last_name || ''}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email Address</Text>
          <Text style={styles.infoValue}>{userInfo?.email || user.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone Number</Text>
          <Text style={styles.infoValue}>{userInfo?.phone || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>User Role</Text>
          <Text style={styles.infoValue}>{(userInfo?.role || 'Basic User').replace('_', ' ').toUpperCase()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email Verified</Text>
          <Text style={styles.infoValue}>{user.emailVerified ? 'Yes' : 'No'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Backend Status</Text>
          <Text style={[styles.infoValue, { color: '#28a745' }]}>Online</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Status</Text>
          <Text style={[styles.infoValue, { color: '#28a745' }]}>Active</Text>
        </View>
      </View>
      
      {renderDashboardContent()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 8,
  },
  pendingCard: {
    backgroundColor: '#ffc107',
    margin: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  pendingIcon: {
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  pendingSubtext: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.8,
  },
  warningCard: {
    backgroundColor: '#ffc107',
    margin: 20,
    padding: 16,
    borderRadius: 8,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  warningMessage: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  userInfoCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#222',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  quickAccessCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickAccessButton: {
    backgroundColor: '#4f8cff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  adminButton: {
    backgroundColor: '#dc3545',
  },
  accountButton: {
    backgroundColor: '#28a745',
  },
  quickAccessText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionsCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 40,
  },
  permissionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  permissionList: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
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
});

export default DashboardScreen; 