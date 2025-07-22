import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import GradientText from '../components/GradientText';
import { 
  fetchNotifications,
  sendNotification,
  updateNotification,
  deleteNotification,
  markNotificationRead,
  dismissNotification,
  fetchNotificationCategories,
  fetchNotificationPriorities,
  fetchNotificationStatuses
} from '../services/api';

const ROLE_TABS = [
  { key: 'all', label: 'All Notifications' },
  { key: 'admin', label: 'Admin' },
  { key: 'lab_staff', label: 'Lab Staff' },
  { key: 'product', label: 'Product Team' },
  { key: 'account', label: 'Account Team' },
  { key: 'all_users', label: 'All Users' },
];

// Radio Button Group Component
const RadioButtonGroup = ({ 
  label, 
  value, 
  options, 
  onSelect, 
  style = {}
}) => {
  return (
    <View style={[styles.radioGroupContainer, style]}>
      <Text style={styles.formLabel}>{label}:</Text>
      <View style={styles.radioOptions}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.radioOption}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
          >
            <View style={styles.radioButton}>
              {value === option.value && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
            <Text style={styles.radioLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const NotificationsScreen = () => {
  const { userInfo } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [notificationCounts, setNotificationCounts] = useState({});
  
  // Search and filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    creator: ''
  });
  
  // Date picker states
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [dateFromPicker, setDateFromPicker] = useState(new Date());
  const [dateToPicker, setDateToPicker] = useState(new Date());

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    severity: 'info',
    message: '',
    category: 'general',
    priority: 'mid',
    recipients: ['admin']
  });

  // Dropdown options
  const severityOptions = [
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'critical', label: 'Critical' }
  ];

  const recipientOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'lab_staff', label: 'Lab Staff' },
    { value: 'product', label: 'Product Team' },
    { value: 'account', label: 'Account Team' },
    { value: 'all_users', label: 'All Users' }
  ];

  useEffect(() => {
    loadNotifications();
    loadDropdownData();
  }, []);

  useEffect(() => {
    calculateNotificationCounts();
  }, [notifications, activeTab]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Don't show alert for network errors during development
      if (!error.message.includes('Network request failed')) {
        Alert.alert('Error', 'Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const [categoriesData, prioritiesData, statusesData] = await Promise.all([
        fetchNotificationCategories(),
        fetchNotificationPriorities(),
        fetchNotificationStatuses()
      ]);
      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setStatuses(statusesData);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      // Set default options if API fails
      setCategories([
        { value: 'general', label: 'General' },
        { value: 'alert', label: 'Alert' },
        { value: 'update', label: 'Update' },
        { value: 'maintenance', label: 'Maintenance' }
      ]);
      setPriorities([
        { value: 'low', label: 'Low' },
        { value: 'mid', label: 'Medium' },
        { value: 'high', label: 'High' }
      ]);
      setStatuses([
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const calculateNotificationCounts = () => {
    const counts = {};
    
    // Calculate counts for each tab
    ROLE_TABS.forEach(tab => {
      if (tab.key === 'all') {
        counts[tab.key] = notifications.length;
      } else {
        counts[tab.key] = notifications.filter(n => 
          n.recipients && n.recipients.includes(tab.key)
        ).length;
      }
    });
    
    setNotificationCounts(counts);
  };

  const handleCreateNotification = async () => {
    try {
      await sendNotification(formData);
      setFormData({
        type: '',
        severity: 'info',
        message: '',
        category: 'general',
        priority: 'mid',
        recipients: ['admin']
      });
      setShowCreateForm(false);
      await loadNotifications();
      Alert.alert('Success', 'Notification created successfully');
    } catch (error) {
      console.error('Error creating notification:', error);
      Alert.alert('Error', 'Failed to create notification');
    }
  };

  const handleUpdateNotification = async () => {
    if (!selectedNotification) return;
    
    try {
      await updateNotification(selectedNotification.id, formData);
      setShowEditForm(false);
      setSelectedNotification(null);
      setFormData({
        type: '',
        severity: 'info',
        message: '',
        category: 'general',
        priority: 'mid',
        recipients: ['admin']
      });
      await loadNotifications();
      Alert.alert('Success', 'Notification updated successfully');
    } catch (error) {
      console.error('Error updating notification:', error);
      Alert.alert('Error', 'Failed to update notification');
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const handleDismiss = async (notificationId) => {
    try {
      await dismissNotification(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error dismissing notification:', error);
      Alert.alert('Error', 'Failed to dismiss notification');
    }
  };

  const handleDelete = async (notificationId) => {
    setNotificationToDelete(notificationId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!notificationToDelete) return;
    try {
      await deleteNotification(notificationToDelete);
      setShowDeleteModal(false);
      setNotificationToDelete(null);
      await loadNotifications();
      Alert.alert('Success', 'Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
      setShowDeleteModal(false);
      setNotificationToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setNotificationToDelete(null);
  };

  const handleEdit = (notification) => {
    setSelectedNotification(notification);
    setFormData({
      type: notification.type || '',
      severity: notification.severity || 'info',
      message: notification.message || '',
      category: notification.category || 'general',
      priority: notification.priority || 'mid',
      recipients: notification.recipients || ['admin']
    });
    setShowEditForm(true);
  };

  // Helper: can the current user act on this notification?
  const canActOnNotification = (notification) => {
    if (!userInfo) return false;
    if (userInfo.role === 'admin') return true;
    return notification.recipients && notification.recipients.includes(userInfo.role);
  };

  // Filtering logic for notifications
  let visibleNotifications = notifications;
  if (userInfo && userInfo.role !== 'admin') {
    visibleNotifications = notifications.filter(n => n.recipients && n.recipients.includes(userInfo.role));
  }

  // Tab filtering logic (only for admin)
  const getTabFilteredNotifications = () => {
    if (!userInfo || userInfo.role !== 'admin') return visibleNotifications;
    if (activeTab === 'all') return visibleNotifications;
    return visibleNotifications.filter(n => n.recipients && n.recipients.includes(activeTab));
  };

  // Filter notifications based on search term and filters
  const getFilteredNotifications = () => {
    let filtered = getTabFilteredNotifications();

    // Search by message, type, or creator name
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(notification => {
        // Search in message
        if (notification.message && notification.message.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in type
        if (notification.type && notification.type.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in creator name
        if (notification.creator_name && notification.creator_name.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in category
        if (notification.category && notification.category.toLowerCase().includes(searchLower)) {
          return true;
        }
        return false;
      });
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(notification => notification.status === filters.status);
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(notification => {
        const notificationDate = new Date(notification.created_at || notification.timestamp || notification.date);
        return notificationDate >= fromDate;
      });
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(notification => {
        const notificationDate = new Date(notification.created_at || notification.timestamp || notification.date);
        return notificationDate <= toDate;
      });
    }

    // Filter by creator
    if (filters.creator.trim()) {
      filtered = filtered.filter(notification => 
        notification.creator_name && notification.creator_name.toLowerCase().includes(filters.creator.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();

  // Date picker handlers
  const handleDateFromChange = (event, selectedDate) => {
    setShowDateFromPicker(false);
    if (selectedDate) {
      setDateFromPicker(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFilters(prev => ({ 
        ...prev, 
        dateFrom: formattedDate
      }));
    }
  };

  const handleDateToChange = (event, selectedDate) => {
    setShowDateToPicker(false);
    if (selectedDate) {
      setDateToPicker(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFilters(prev => ({ 
        ...prev, 
        dateTo: formattedDate
      }));
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'mid': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#17a2b8';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <Ionicons name="warning" size={16} color="red" />;
      case 'warning': return <Ionicons name="warning" size={16} color="orange" />;
      case 'info': return <Ionicons name="information-circle" size={16} color="blue" />;
      default: return <Ionicons name="notifications" size={16} color="gray" />;
    }
  };

  const renderNotificationItem = ({ item }) => (
    <View style={[styles.notificationCard, !item.is_read && styles.unreadCard]}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationMeta}>
          {getSeverityIcon(item.severity)}
          <Text style={styles.notificationType}>{item.type}</Text>
          <View style={[styles.badge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.badgeText}>{item.priority.toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.notificationActions}>
          {canActOnNotification(item) && !item.is_read && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleMarkRead(item.id)}
            >
              <Ionicons name="eye" size={16} color="#28a745" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDismiss(item.id)}
          >
            <Ionicons name="close" size={16} color="#dc3545" />
          </TouchableOpacity>
          {canActOnNotification(item) && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create" size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
          {userInfo?.role === 'admin' && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash" size={16} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <View style={styles.notificationDetails}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.creator}>
            Created by: {item.creator_name || 'Unknown'}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp || item.created_at).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/company_icon.png')} 
            style={styles.companyLogo}
            resizeMode="contain"
          />
          <GradientText 
            colors={['#654321', '#8B7355', '#B8860B']} 
            style={styles.companyName}
          >
            Blossoms Aroma
          </GradientText>
        </View>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Manage and view notifications</Text>
        <View style={styles.notificationStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{notifications.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {notifications.filter(n => !n.is_read).length}
            </Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchFilterSection}>
        <View style={styles.searchBar}>
          <View style={styles.searchInput}>
            <Ionicons name="search" size={16} style={styles.searchIcon} />
            <TextInput
              style={styles.searchField}
              placeholder="Search by message, type, category, or creator..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm ? (
              <TouchableOpacity
                onPress={() => setSearchTerm('')}
                style={styles.clearSearch}
              >
                <Ionicons name="close" size={14} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          >
            <Ionicons name="filter" size={16} color={showFilters ? "white" : "#666"} />
            <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
              Filters
            </Text>
            {Object.values(filters).some(value => value !== '' && value !== false) && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterPanel}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  style={styles.picker}
                  itemStyle={{ height: 50, fontSize: 14 }}
                >
                  <Picker.Item label="All Statuses" value="" />
                  {statuses.map((status) => (
                    <Picker.Item key={status.value} label={status.label} value={status.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateInputs}>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDateFromPicker(true)}
                >
                  <Text style={filters.dateFrom ? styles.dateText : styles.datePlaceholder}>
                    {filters.dateFrom ? formatDateForDisplay(filters.dateFrom) : "From Date"}
                  </Text>
                  <Ionicons name="calendar" size={16} color="#666" />
                </TouchableOpacity>
                <Text style={styles.rangeSeparator}>-</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDateToPicker(true)}
                >
                  <Text style={filters.dateTo ? styles.dateText : styles.datePlaceholder}>
                    {filters.dateTo ? formatDateForDisplay(filters.dateTo) : "To Date"}
                  </Text>
                  <Ionicons name="calendar" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Creator</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Search by creator name..."
                value={filters.creator}
                onChangeText={(value) => setFilters(prev => ({ ...prev, creator: value }))}
              />
            </View>

            <TouchableOpacity
              onPress={() => setFilters({
                status: '',
                dateFrom: '',
                dateTo: '',
                creator: ''
              })}
              style={styles.clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Role Tabs (Admin Only) */}
      {userInfo && userInfo.role === 'admin' && (
        <View style={styles.tabBarContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}
          >
            {ROLE_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabBadge, activeTab === tab.key && styles.activeTabBadge]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.activeTabBadgeText]}>
                    {notificationCounts[tab.key] || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Create Button */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowCreateForm(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Notification</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderNotificationItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications" size={48} color="#6c757d" />
            <Text style={styles.emptyStateTitle}>No notifications found</Text>
            <Text style={styles.emptyStateText}>Create your first notification or adjust your filters</Text>
          </View>
        }
      />

      {/* Create Form Modal */}
      <Modal
        visible={showCreateForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Notification</Text>
            <TouchableOpacity onPress={() => setShowCreateForm(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Type:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Low Stock Alert"
                value={formData.type}
                onChangeText={(text) => setFormData({...formData, type: text})}
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Message:</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Enter notification message..."
                value={formData.message}
                onChangeText={(text) => setFormData({...formData, message: text})}
                multiline
                numberOfLines={3}
              />
            </View>

            <RadioButtonGroup
              label="Category"
              value={formData.category}
              options={categories}
              onSelect={(value) => setFormData({...formData, category: value})}
            />

            <RadioButtonGroup
              label="Priority"
              value={formData.priority}
              options={priorities}
              onSelect={(value) => setFormData({...formData, priority: value})}
            />

            <RadioButtonGroup
              label="Severity"
              value={formData.severity}
              options={severityOptions}
              onSelect={(value) => setFormData({...formData, severity: value})}
            />

            <RadioButtonGroup
              label="Recipients"
              value={formData.recipients[0]}
              options={recipientOptions}
              onSelect={(value) => setFormData({...formData, recipients: [value]})}
            />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowCreateForm(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleCreateNotification}
            >
              <Ionicons name="send" size={16} color="white" />
              <Text style={styles.saveButtonText}>Send Notification</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Form Modal */}
      <Modal
        visible={showEditForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Notification</Text>
            <TouchableOpacity onPress={() => setShowEditForm(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Type:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Low Stock Alert"
                value={formData.type}
                onChangeText={(text) => setFormData({...formData, type: text})}
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Message:</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Enter notification message..."
                value={formData.message}
                onChangeText={(text) => setFormData({...formData, message: text})}
                multiline
                numberOfLines={3}
              />
            </View>

            <RadioButtonGroup
              label="Category"
              value={formData.category}
              options={categories}
              onSelect={(value) => setFormData({...formData, category: value})}
            />

            <RadioButtonGroup
              label="Priority"
              value={formData.priority}
              options={priorities}
              onSelect={(value) => setFormData({...formData, priority: value})}
            />

            <RadioButtonGroup
              label="Severity"
              value={formData.severity}
              options={severityOptions}
              onSelect={(value) => setFormData({...formData, severity: value})}
            />

            <RadioButtonGroup
              label="Recipients"
              value={formData.recipients[0]}
              options={recipientOptions}
              onSelect={(value) => setFormData({...formData, recipients: [value]})}
            />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowEditForm(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleUpdateNotification}
            >
              <Text style={styles.saveButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Notification</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this notification? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: '#dc3545' }]}
                onPress={confirmDelete}
              >
                <Text style={styles.saveButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showDateFromPicker && (
        <DateTimePicker
          value={dateFromPicker}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateFromChange}
        />
      )}
      
      {showDateToPicker && (
        <DateTimePicker
          value={dateToPicker}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateToChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: 50, // Add extra padding to avoid status bar
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  notificationStats: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  tabBarContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabBar: {
    backgroundColor: 'white',
  },
  tabBarContent: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    minWidth: 120,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBadgeText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  activeTabBadgeText: {
    color: 'white',
  },
  actionButtons: {
    padding: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#e9ecef',
  },
  unreadCard: {
    borderLeftColor: '#007AFF',
    backgroundColor: '#f8f9ff',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  notificationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    marginBottom: 16,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#2c3e50',
    marginBottom: 12,
  },
  notificationDetails: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  category: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    color: '#007AFF',
  },
  creator: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 12,
    color: '#6c757d',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    zIndex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
    zIndex: 0,
  },
  formRow: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  // Radio Button styles
  radioGroupContainer: {
    marginBottom: 20,
  },
  radioOptions: {
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  // Search and Filter Styles
  searchFilterSection: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    position: 'relative',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    color: '#6c757d',
    zIndex: 1,
  },
  searchField: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    fontSize: 14,
    backgroundColor: 'white',
  },
  clearSearch: {
    position: 'absolute',
    right: 8,
    padding: 4,
    borderRadius: 4,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    position: 'relative',
  },
  filterToggleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterToggleText: {
    fontSize: 14,
    color: '#6c757d',
  },
  filterToggleTextActive: {
    color: 'white',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: '#dc3545',
    borderRadius: 4,
  },
  filterPanel: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: 'white',
    paddingVertical: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    ...Platform.select({
      ios: {
        paddingVertical: 8,
      },
      android: {
        paddingVertical: 6,
      },
    }),
  },
  dateInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  datePlaceholder: {
    fontSize: 14,
    color: '#666',
  },
  rangeSeparator: {
    marginHorizontal: 8,
    color: '#666',
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  clearFilters: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default NotificationsScreen; 