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
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { 
  fetchAccountSummary,
  fetchTransactions,
  fetchPurchaseOrders,
  fetchRecentTransactions,
  fetchPendingPurchases,
  createTransaction,
  createPurchaseOrder,
  approveTransaction,
  rejectTransaction,
  fetchChemicals,
  createChemical,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  fetchChemicalPurchaseHistory,
  fetchChemicalPurchaseTransactions
} from '../services/api';
import GradientText from '../components/GradientText';

const AccountScreen = () => {
  const { userInfo } = useAuth();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    amountMin: '',
    amountMax: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    transactionType: '',
    supplier: ''
  });
  
  // Date picker states
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [dateFromPicker, setDateFromPicker] = useState(new Date());
  const [dateToPicker, setDateToPicker] = useState(new Date());
  
  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    chemical_id: '',
    transaction_type: 'purchase',
    quantity: '',
    unit: '',
    amount: '',
    currency: 'INR',
    supplier: '',
    status: 'pending',
    notes: ''
  });
  
  // Chemical search state
  const [chemicalSearch, setChemicalSearch] = useState('');
  const [showChemicalDropdown, setShowChemicalDropdown] = useState(false);
  const [filteredChemicals, setFilteredChemicals] = useState([]);
  const [isCreatingChemical, setIsCreatingChemical] = useState(false);
  
  // Purchase order form state
  const [purchaseOrderForm, setPurchaseOrderForm] = useState({
    supplier: '',
    total_amount: 0,
    currency: 'INR',
    status: 'draft',
    notes: '',
    items: []
  });

  const [currentItem, setCurrentItem] = useState({
    chemical_id: '',
    quantity: 0,
    unit: '',
    unit_price: 0,
    total_price: 0,
    notes: ''
  });

  const [showPurchaseHistoryModal, setShowPurchaseHistoryModal] = useState(false);
  const [selectedChemicalForHistory, setSelectedChemicalForHistory] = useState(null);
  const [purchaseHistoryData, setPurchaseHistoryData] = useState(null);
  const [purchaseTransactions, setPurchaseTransactions] = useState([]);
  const [purchaseHistoryLoading, setPurchaseHistoryLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter chemicals based on search
  useEffect(() => {
    if (chemicalSearch.trim()) {
      const filtered = chemicals.filter(chemical =>
        chemical.name.toLowerCase().includes(chemicalSearch.toLowerCase())
      );
      setFilteredChemicals(filtered);
      setShowChemicalDropdown(true);
    } else {
      setFilteredChemicals([]);
      setShowChemicalDropdown(false);
    }
  }, [chemicalSearch, chemicals]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        summaryData,
        transactionsData,
        purchaseOrdersData,
        recentTransactionsData,
        pendingPurchasesData,
        chemicalsData
      ] = await Promise.all([
        fetchAccountSummary().catch(err => {
          console.error('Error fetching account summary:', err);
          return {
            total_purchases: 0,
            total_transactions: 0,
            pending_orders: 0,
            total_spent_this_month: 0,
            total_spent_this_year: 0,
            currency: "INR"
          };
        }),
        fetchTransactions().catch(err => {
          console.error('Error fetching transactions:', err);
          return [];
        }),
        fetchPurchaseOrders().catch(err => {
          console.error('Error fetching purchase orders:', err);
          return [];
        }),
        fetchRecentTransactions().catch(err => {
          console.error('Error fetching recent transactions:', err);
          return [];
        }),
        fetchPendingPurchases().catch(err => {
          console.error('Error fetching pending purchases:', err);
          return [];
        }),
        fetchChemicals().catch(err => {
          console.error('Error fetching chemicals:', err);
          return [];
        })
      ]);

      setSummary(summaryData);
      setTransactions(transactionsData);
      setPurchaseOrders(purchaseOrdersData);
      setRecentTransactions(recentTransactionsData);
      setPendingPurchases(pendingPurchasesData);
      setChemicals(chemicalsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleChemicalSelect = (chemical) => {
    setTransactionForm(prev => ({
      ...prev,
      chemical_id: chemical.id
    }));
    setChemicalSearch(chemical.name);
    setShowChemicalDropdown(false);
  };

  const handleCreateNewChemical = async (chemicalName) => {
    if (!chemicalName.trim()) return;
    
    setIsCreatingChemical(true);
    try {
      const chemicalData = {
        name: chemicalName.trim(),
        quantity: 0,
        unit: 'g'
      };
      
      const newChemical = await createChemical(chemicalData);
      
      // Update the chemicals list locally
      setChemicals(prevChemicals => [...prevChemicals, newChemical]);
      
      // Update the form data and search
      setTransactionForm(prev => ({
        ...prev,
        chemical_id: newChemical.id
      }));
      setChemicalSearch(newChemical.name);
      setShowChemicalDropdown(false);
      
      Alert.alert('Success', `Chemical "${newChemical.name}" created successfully`);
    } catch (err) {
      console.error('Error creating chemical:', err);
      Alert.alert('Error', 'Failed to create chemical: ' + err.message);
    } finally {
      setIsCreatingChemical(false);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      // If user typed a chemical name but didn't select from dropdown, try to find or create it
      if (chemicalSearch && !transactionForm.chemical_id) {
        const foundChemical = chemicals.find(c => 
          c.name.toLowerCase() === chemicalSearch.toLowerCase()
        );
        
        if (foundChemical) {
          transactionForm.chemical_id = foundChemical.id;
        } else {
          // Auto-create the chemical
          await handleCreateNewChemical(chemicalSearch);
          if (!transactionForm.chemical_id) {
            return; // Creation failed
          }
        }
      }
      
      await createTransaction(transactionForm);
      setShowTransactionForm(false);
      setTransactionSuccess(true);
      setTransactionForm({
        chemical_id: '',
        transaction_type: 'purchase',
        quantity: '',
        unit: '',
        amount: '',
        currency: 'INR',
        supplier: '',
        status: 'pending',
        notes: ''
      });
      setChemicalSearch('');
      await loadDashboardData();
      Alert.alert('Success', 'Transaction created successfully');
    } catch (err) {
      console.error('Error creating transaction:', err);
      Alert.alert('Error', 'Failed to create transaction: ' + err.message);
    }
  };

  const handleCreatePurchaseOrder = async () => {
    try {
      if (purchaseOrderForm.items.length === 0) {
        Alert.alert('Error', 'Please add at least one item to the purchase order');
        return;
      }
      
      // Validate that all items have valid chemical IDs
      for (let i = 0; i < purchaseOrderForm.items.length; i++) {
        const item = purchaseOrderForm.items[i];
        if (!item.chemical_id) {
          Alert.alert('Error', `Please select a valid chemical for item ${i + 1}`);
          return;
        }
      }

      await createPurchaseOrder(purchaseOrderForm);
      setShowPurchaseOrderForm(false);
      setPurchaseOrderForm({
        supplier: '',
        total_amount: 0,
        currency: 'INR',
        status: 'draft',
        notes: '',
        items: []
      });
      setCurrentItem({
        chemical_id: '',
        quantity: 0,
        unit: '',
        unit_price: 0,
        total_price: 0,
        notes: ''
      });
      setChemicalSearch('');
      await loadDashboardData();
      Alert.alert('Success', 'Purchase order created successfully');
    } catch (err) {
      console.error('Error creating purchase order:', err);
      Alert.alert('Error', 'Failed to create purchase order');
    }
  };

  const addItemToPurchaseOrder = () => {
    if (!currentItem.chemical_id || currentItem.quantity <= 0 || currentItem.unit_price <= 0) {
      Alert.alert('Error', 'Please fill in all required fields for the item');
      return;
    }

    // If user typed a chemical name but didn't select from dropdown, try to find it
    if (chemicalSearch && !currentItem.chemical_id) {
      const foundChemical = chemicals.find(c => 
        c.name.toLowerCase() === chemicalSearch.toLowerCase()
      );
      if (foundChemical) {
        currentItem.chemical_id = foundChemical.id;
      } else {
        Alert.alert('Error', 'Please select a valid chemical from the dropdown or ensure the chemical name is correct.');
        return;
      }
    }

    const total_price = currentItem.quantity * currentItem.unit_price;
    const newItem = {
      ...currentItem,
      total_price
    };

    setPurchaseOrderForm(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      total_amount: prev.total_amount + total_price
    }));

    setCurrentItem({
      chemical_id: '',
      quantity: 0,
      unit: '',
      unit_price: 0,
      total_price: 0,
      notes: ''
    });
    setChemicalSearch('');
  };

  const removeItemFromPurchaseOrder = (index) => {
    const itemToRemove = purchaseOrderForm.items[index];
    setPurchaseOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      total_amount: prev.total_amount - itemToRemove.total_price
    }));
  };

  const handleChemicalSelectForPurchaseOrder = (chemical) => {
    setCurrentItem(prev => ({
      ...prev,
      chemical_id: chemical.id
    }));
    setChemicalSearch(chemical.name);
    setShowChemicalDropdown(false);
  };

  const handleApproveTransaction = async (transactionId) => {
    Alert.alert(
      'Confirm Approval',
      'Are you sure you want to approve this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveTransaction(transactionId);
              await loadDashboardData();
              Alert.alert('Success', 'Transaction approved successfully');
            } catch (err) {
              console.error('Error approving transaction:', err);
              Alert.alert('Error', 'Failed to approve transaction');
            }
          }
        }
      ]
    );
  };

  const handleRejectTransaction = async (transactionId) => {
    Alert.alert(
      'Confirm Rejection',
      'Are you sure you want to reject this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectTransaction(transactionId);
              await loadDashboardData();
              Alert.alert('Success', 'Transaction rejected successfully');
            } catch (err) {
              console.error('Error rejecting transaction:', err);
              Alert.alert('Error', 'Failed to reject transaction');
            }
          }
        }
      ]
    );
  };

  const handleApprovePurchaseOrder = async (orderId) => {
    Alert.alert(
      'Confirm Approval',
      'Are you sure you want to approve this purchase order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approvePurchaseOrder(orderId);
              await loadDashboardData();
              Alert.alert('Success', 'Purchase order approved successfully');
            } catch (err) {
              console.error('Error approving purchase order:', err);
              Alert.alert('Error', 'Failed to approve purchase order');
            }
          }
        }
      ]
    );
  };

  const handleRejectPurchaseOrder = async (orderId) => {
    Alert.alert(
      'Confirm Rejection',
      'Are you sure you want to reject this purchase order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectPurchaseOrder(orderId);
              await loadDashboardData();
              Alert.alert('Success', 'Purchase order rejected successfully');
            } catch (err) {
              console.error('Error rejecting purchase order:', err);
              Alert.alert('Error', 'Failed to reject purchase order');
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Date picker handlers
  const handleDateFromChange = (event, selectedDate) => {
    setShowDateFromPicker(false);
    if (selectedDate) {
      setDateFromPicker(selectedDate);
      setFilters(prev => ({ 
        ...prev, 
        dateFrom: selectedDate.toISOString().split('T')[0] 
      }));
    }
  };

  const handleDateToChange = (event, selectedDate) => {
    setShowDateToPicker(false);
    if (selectedDate) {
      setDateToPicker(selectedDate);
      setFilters(prev => ({ 
        ...prev, 
        dateTo: selectedDate.toISOString().split('T')[0] 
      }));
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'cancelled':
      case 'rejected':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Filter transactions based on search term and filters
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Search by chemical name, supplier, or transaction type
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => {
        // Search in chemical name
        const chemicalName = transaction.chemical?.name || chemicals.find(c => c.id === transaction.chemical_id)?.name;
        if (chemicalName && chemicalName.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in supplier
        if (transaction.supplier && transaction.supplier.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in transaction type
        if (transaction.transaction_type && transaction.transaction_type.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in amount
        if (transaction.amount && transaction.amount.toString().includes(searchTerm)) {
          return true;
        }
        return false;
      });
    }

    // Filter by amount range
    if (filters.amountMin !== '') {
      filtered = filtered.filter(transaction => transaction.amount >= parseFloat(filters.amountMin));
    }
    if (filters.amountMax !== '') {
      filtered = filtered.filter(transaction => transaction.amount <= parseFloat(filters.amountMax));
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(transaction => new Date(transaction.created_at) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(transaction => new Date(transaction.created_at) <= toDate);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(transaction => transaction.status === filters.status);
    }

    // Filter by transaction type
    if (filters.transactionType) {
      filtered = filtered.filter(transaction => transaction.transaction_type === filters.transactionType);
    }

    // Filter by supplier
    if (filters.supplier.trim()) {
      filtered = filtered.filter(transaction => 
        transaction.supplier && transaction.supplier.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    return filtered;
  };

  // Filter purchase orders based on search term and filters
  const getFilteredPurchaseOrders = () => {
    let filtered = [...purchaseOrders];

    // Search by order number, supplier, or amount
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        // Search in order number
        if (order.order_number && order.order_number.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in supplier
        if (order.supplier && order.supplier.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in amount
        if (order.total_amount && order.total_amount.toString().includes(searchTerm)) {
          return true;
        }
        // Search in notes
        if (order.notes && order.notes.toLowerCase().includes(searchLower)) {
          return true;
        }
        return false;
      });
    }

    // Filter by amount range
    if (filters.amountMin !== '') {
      filtered = filtered.filter(order => order.total_amount >= parseFloat(filters.amountMin));
    }
    if (filters.amountMax !== '') {
      filtered = filtered.filter(order => order.total_amount <= parseFloat(filters.amountMax));
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(order => new Date(order.created_at) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.created_at) <= toDate);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Filter by supplier
    if (filters.supplier.trim()) {
      filtered = filtered.filter(order => 
        order.supplier && order.supplier.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    return filtered;
  };

  // Filter recent transactions for overview tab
  const getFilteredRecentTransactions = () => {
    let filtered = [...recentTransactions];

    // Search by chemical name, supplier, or transaction type
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => {
        // Search in chemical name
        const chemicalName = transaction.chemical?.name || chemicals.find(c => c.id === transaction.chemical_id)?.name;
        if (chemicalName && chemicalName.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in supplier
        if (transaction.supplier && transaction.supplier.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in transaction type
        if (transaction.transaction_type && transaction.transaction_type.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in amount
        if (transaction.amount && transaction.amount.toString().includes(searchTerm)) {
          return true;
        }
        return false;
      });
    }

    // Filter by amount range
    if (filters.amountMin !== '') {
      filtered = filtered.filter(transaction => transaction.amount >= parseFloat(filters.amountMin));
    }
    if (filters.amountMax !== '') {
      filtered = filtered.filter(transaction => transaction.amount <= parseFloat(filters.amountMax));
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(transaction => new Date(transaction.created_at) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(transaction => new Date(transaction.created_at) <= toDate);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(transaction => transaction.status === filters.status);
    }

    // Filter by transaction type
    if (filters.transactionType) {
      filtered = filtered.filter(transaction => transaction.transaction_type === filters.transactionType);
    }

    // Filter by supplier
    if (filters.supplier.trim()) {
      filtered = filtered.filter(transaction => 
        transaction.supplier && transaction.supplier.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    return filtered;
  };

  // Filter pending purchases
  const getFilteredPendingPurchases = () => {
    let filtered = [...pendingPurchases];

    // Search by chemical name, supplier, or amount
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => {
        // Search in chemical name
        const chemicalName = transaction.chemical?.name || chemicals.find(c => c.id === transaction.chemical_id)?.name;
        if (chemicalName && chemicalName.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in supplier
        if (transaction.supplier && transaction.supplier.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in amount
        if (transaction.amount && transaction.amount.toString().includes(searchTerm)) {
          return true;
        }
        // Search in notes
        if (transaction.notes && transaction.notes.toLowerCase().includes(searchLower)) {
          return true;
        }
        return false;
      });
    }

    // Filter by amount range
    if (filters.amountMin !== '') {
      filtered = filtered.filter(transaction => transaction.amount >= parseFloat(filters.amountMin));
    }
    if (filters.amountMax !== '') {
      filtered = filtered.filter(transaction => transaction.amount <= parseFloat(filters.amountMax));
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(transaction => new Date(transaction.created_at) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(transaction => new Date(transaction.created_at) <= toDate);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(transaction => transaction.status === filters.status);
    }

    // Filter by supplier
    if (filters.supplier.trim()) {
      filtered = filtered.filter(transaction => 
        transaction.supplier && transaction.supplier.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    return filtered;
  };

  const renderOverview = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Purchases</Text>
            <Text style={styles.summaryValue}>{summary.total_purchases}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Transactions</Text>
            <Text style={styles.summaryValue}>{summary.total_transactions}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending Orders</Text>
            <Text style={styles.summaryValue}>{summary.pending_orders}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.total_spent_this_month)}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => setActiveTab('transactions')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {getFilteredRecentTransactions().slice(0, 5).map((transaction, index) => (
          <View key={index} style={styles.transactionItem}>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionChemical}>
                {chemicals.find(c => c.id === transaction.chemical_id)?.name || 'Unknown Chemical'}
              </Text>
              <Text style={styles.transactionAmount}>{formatCurrency(transaction.amount)}</Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
              <Text style={styles.statusText}>{transaction.status}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Purchases</Text>
          <TouchableOpacity onPress={() => setActiveTab('pending-purchases')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {getFilteredPendingPurchases().slice(0, 5).map((purchase, index) => (
          <View key={index} style={styles.purchaseItem}>
            <View style={styles.purchaseInfo}>
              {purchase.chemical && (
                <Text style={styles.purchaseChemical}>Chemical: {purchase.chemical.name}</Text>
              )}
              <Text style={styles.purchaseAmount}>{formatCurrency(purchase.amount)}</Text>
              <Text style={styles.purchaseSupplier}>{purchase.supplier}</Text>
            </View>
            <View style={styles.purchaseItemRight}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(purchase.status) }]}>
              <Text style={styles.statusText}>{purchase.status}</Text>
              </View>
              
              {/* Action buttons for admin and account team members */}
              {(userInfo?.role === 'admin' || userInfo?.role === 'account') && purchase.status === 'pending' && (
                <View style={styles.purchaseItemActions}>
                  <TouchableOpacity 
                    style={styles.approvePurchaseButton}
                    onPress={() => handleApproveTransaction(purchase.id)}
                  >
                    <Ionicons name="checkmark" size={14} color="white" />
                    <Text style={styles.approvePurchaseButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.rejectPurchaseButton}
                    onPress={() => handleRejectTransaction(purchase.id)}
                  >
                    <Ionicons name="close" size={14} color="white" />
                    <Text style={styles.rejectPurchaseButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderTransactions = () => (
    <View style={styles.tabContent}>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowTransactionForm(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.createButtonText}>New Transaction</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getFilteredTransactions()}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionAmount}>{formatCurrency(item.amount)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.transactionChemical}>
              Chemical: {item.chemical?.name || chemicals.find(c => c.id === item.chemical_id)?.name || 'Unknown Chemical'}
            </Text>
            <Text style={styles.transactionType}>{item.transaction_type}</Text>
            <Text style={styles.transactionDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {item.supplier && (
              <Text style={styles.transactionSupplier}>Supplier: {item.supplier}</Text>
            )}
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => handleViewPurchaseHistory(item)}
            >
              <Text style={styles.viewDetailsButtonText}>View Details</Text>
            </TouchableOpacity>
            {item.status === 'pending' && (
              <View style={styles.transactionActions}>
                <TouchableOpacity 
                  style={styles.approveButton}
                  onPress={() => handleApproveTransaction(item.id)}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => handleRejectTransaction(item.id)}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );

  const renderPurchaseOrders = () => (
    <View style={styles.tabContent}>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowPurchaseOrderForm(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.createButtonText}>New Purchase Order</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getFilteredPurchaseOrders()}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.purchaseOrderCard}>
            <View style={styles.purchaseOrderHeader}>
              <Text style={styles.purchaseOrderAmount}>{formatCurrency(item.total_amount)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.purchaseOrderSupplier}>Supplier: {item.supplier}</Text>
            <Text style={styles.purchaseOrderDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {item.items && item.items.length > 0 && (
              <Text style={styles.purchaseOrderChemicals}>
                Chemicals: {item.items.map(item => item.chemical?.name || 'Unknown').join(', ')}
              </Text>
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );

  const renderPendingPurchases = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={getFilteredPendingPurchases()}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.purchaseOrderCard}>
            <View style={styles.purchaseOrderHeader}>
              <Text style={styles.purchaseOrderAmount}>{formatCurrency(item.amount)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.purchaseOrderSupplier}>Supplier: {item.supplier}</Text>
            <Text style={styles.purchaseOrderDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.purchaseOrderNumber}>
              Chemical: {item.chemical?.name || chemicals.find(c => c.id === item.chemical_id)?.name || 'Unknown Chemical'}
            </Text>
            {item.notes && (
              <Text style={styles.purchaseOrderNotes}>Notes: {item.notes}</Text>
            )}
            
            {/* Action buttons for admin and account team members */}
            {(userInfo?.role === 'admin' || userInfo?.role === 'account') && item.status === 'pending' && (
              <View style={styles.purchaseOrderActions}>
                <TouchableOpacity 
                  style={styles.approvePurchaseButton}
                  onPress={() => handleApproveTransaction(item.id)}
                >
                  <Ionicons name="checkmark" size={16} color="white" />
                  <Text style={styles.approvePurchaseButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.rejectPurchaseButton}
                  onPress={() => handleRejectTransaction(item.id)}
                >
                  <Ionicons name="close" size={16} color="white" />
                  <Text style={styles.rejectPurchaseButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'transactions':
        return renderTransactions();
      case 'purchase-orders':
        return renderPurchaseOrders();
      case 'pending-purchases':
        return renderPendingPurchases();
      default:
        return renderOverview();
    }
  };

  const loadPurchaseHistoryData = async (chemicalId) => {
    try {
      setPurchaseHistoryLoading(true);
      const [historyData, transactionsData] = await Promise.all([
        fetchChemicalPurchaseHistory(chemicalId).catch(err => {
          console.error('Error fetching purchase history:', err);
          return {
            chemical_id: chemicalId,
            total_purchased: 0,
            total_spent: 0,
            last_purchase_date: null,
            average_unit_price: 0,
            currency: "INR"
          };
        }),
        fetchChemicalPurchaseTransactions(chemicalId).catch(err => {
          console.error('Error fetching purchase transactions:', err);
          return [];
        })
      ]);
      
      setPurchaseHistoryData(historyData);
      setPurchaseTransactions(transactionsData);
    } catch (err) {
      console.error('Error loading purchase history data:', err);
      Alert.alert('Error', 'Failed to load purchase history data');
    } finally {
      setPurchaseHistoryLoading(false);
    }
  };

  const handleViewPurchaseHistory = async (transaction) => {
    const chemical = chemicals.find(c => c.id === transaction.chemical_id);
    setSelectedChemicalForHistory(chemical);
    setShowPurchaseHistoryModal(true);
    await loadPurchaseHistoryData(transaction.chemical_id);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading account data...</Text>
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
          <GradientText style={styles.companyName}>Blossoms Aroma</GradientText>
        </View>
        <Text style={styles.title}>Account Dashboard</Text>
        <Text style={styles.subtitle}>Manage transactions and purchase orders</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'purchase-orders' && styles.activeTab]}
          onPress={() => setActiveTab('purchase-orders')}
        >
          <Text style={[styles.tabText, activeTab === 'purchase-orders' && styles.activeTabText]}>
            Purchase Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending-purchases' && styles.activeTab]}
          onPress={() => setActiveTab('pending-purchases')}
        >
          <Text style={[styles.tabText, activeTab === 'pending-purchases' && styles.activeTabText]}>
            Pending Purchases
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchFilterSection}>
        <View style={styles.searchBar}>
          <View style={styles.searchInput}>
            <Ionicons name="search" size={16} style={styles.searchIcon} />
            <TextInput
              style={styles.searchField}
              placeholder={
                activeTab === 'overview' ? "Search by chemical, supplier, type, or amount..." : 
                activeTab === 'transactions' ? "Search by chemical, supplier, type, or amount..." : 
                activeTab === 'purchase-orders' ? "Search by order number, supplier, or amount..." : 
                "Search by chemical, supplier, or amount..."
              }
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
            <View style={styles.filterGrid}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Amount Range</Text>
                <View style={styles.rangeInputs}>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Min ₹"
                    value={filters.amountMin}
                    onChangeText={(value) => setFilters(prev => ({ ...prev, amountMin: value }))}
                    keyboardType="numeric"
                  />
                  <Text style={styles.rangeSeparator}>-</Text>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Max ₹"
                    value={filters.amountMax}
                    onChangeText={(value) => setFilters(prev => ({ ...prev, amountMax: value }))}
                    keyboardType="numeric"
                  />
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
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Statuses" value="" />
                    <Picker.Item label="Pending" value="pending" />
                    <Picker.Item label="Completed" value="completed" />
                    <Picker.Item label="Cancelled" value="cancelled" />
                    <Picker.Item label="Approved" value="approved" />
                    <Picker.Item label="Rejected" value="rejected" />
                  </Picker>
                </View>
              </View>

              {activeTab === 'transactions' && (
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>Transaction Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={filters.transactionType}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, transactionType: value }))}
                      style={styles.picker}
                    >
                      <Picker.Item label="All Types" value="" />
                      <Picker.Item label="Purchase" value="purchase" />
                      <Picker.Item label="Sale" value="sale" />
                      <Picker.Item label="Transfer" value="transfer" />
                      <Picker.Item label="Adjustment" value="adjustment" />
                    </Picker>
                  </View>
                </View>
              )}

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Supplier</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Search by supplier..."
                  value={filters.supplier}
                  onChangeText={(value) => setFilters(prev => ({ ...prev, supplier: value }))}
                />
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                onPress={() => setFilters({
                  amountMin: '',
                  amountMax: '',
                  dateFrom: '',
                  dateTo: '',
                  status: '',
                  transactionType: '',
                  supplier: ''
                })}
                style={styles.clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {renderTabContent()}

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

      {/* Transaction Form Modal */}
      <Modal
        visible={showTransactionForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Transaction</Text>
            <TouchableOpacity onPress={() => setShowTransactionForm(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {transactionSuccess && (
            <View style={styles.successMessage}>
              <Text style={styles.successText}>✅ Transaction created successfully! Form cleared for next transaction.</Text>
            </View>
          )}
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Chemical Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Chemical *</Text>
              <View style={styles.chemicalSearchContainer}>
            <TextInput
                  style={styles.chemicalSearchInput}
                  placeholder="Search for chemical or create new..."
                  value={chemicalSearch}
                  onChangeText={setChemicalSearch}
                  onFocus={() => setShowChemicalDropdown(true)}
                />
                {showChemicalDropdown && filteredChemicals.length > 0 && (
                  <View style={styles.chemicalDropdown}>
                    <FlatList
                      data={filteredChemicals}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item: chemical }) => (
                        <TouchableOpacity
                          style={styles.chemicalDropdownItem}
                          onPress={() => handleChemicalSelect(chemical)}
                        >
                          <Text style={styles.chemicalDropdownText}>{chemical.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
                {chemicalSearch && filteredChemicals.length === 0 && (
                  <TouchableOpacity
                    style={styles.createChemicalButton}
                    onPress={() => handleCreateNewChemical(chemicalSearch)}
                    disabled={isCreatingChemical}
                  >
                    <Text style={styles.createChemicalButtonText}>
                      {isCreatingChemical ? 'Creating...' : `Create "${chemicalSearch}"`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Transaction Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Transaction Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={transactionForm.transaction_type}
                  onValueChange={(value) => setTransactionForm({...transactionForm, transaction_type: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="Purchase" value="purchase" />
                  <Picker.Item label="Sale" value="sale" />
                  <Picker.Item label="Transfer" value="transfer" />
                  <Picker.Item label="Adjustment" value="adjustment" />
                </Picker>
              </View>
            </View>

            {/* Quantity and Unit */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.formLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
                  placeholder="0"
              value={transactionForm.quantity}
              onChangeText={(text) => setTransactionForm({...transactionForm, quantity: text})}
              keyboardType="numeric"
            />
              </View>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.formLabel}>Unit</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={transactionForm.unit}
                    onValueChange={(value) => setTransactionForm({...transactionForm, unit: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Unit" value="" />
                    <Picker.Item label="Grams (g)" value="g" />
                    <Picker.Item label="Kilograms (kg)" value="kg" />
                    <Picker.Item label="Milligrams (mg)" value="mg" />
                    <Picker.Item label="Liters (L)" value="L" />
                    <Picker.Item label="Milliliters (mL)" value="mL" />
                    <Picker.Item label="Moles (mol)" value="mol" />
                    <Picker.Item label="Millimoles (mmol)" value="mmol" />
                    <Picker.Item label="Pieces" value="pieces" />
                    <Picker.Item label="Bottles" value="bottles" />
                    <Picker.Item label="Vials" value="vials" />
                  </Picker>
                </View>
              </View>
            </View>

            {/* Amount and Currency */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.formLabel}>Amount</Text>
            <TextInput
              style={styles.input}
                  placeholder="0"
              value={transactionForm.amount}
              onChangeText={(text) => setTransactionForm({...transactionForm, amount: text})}
              keyboardType="numeric"
            />
              </View>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.formLabel}>Currency</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={transactionForm.currency}
                    onValueChange={(value) => setTransactionForm({...transactionForm, currency: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="INR" value="INR" />
                    <Picker.Item label="USD" value="USD" />
                    <Picker.Item label="EUR" value="EUR" />
                    <Picker.Item label="GBP" value="GBP" />
                  </Picker>
                </View>
              </View>
            </View>

            {/* Supplier */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Supplier</Text>
            <TextInput
              style={styles.input}
                placeholder="Enter supplier name"
              value={transactionForm.supplier}
              onChangeText={(text) => setTransactionForm({...transactionForm, supplier: text})}
            />
            </View>

            {/* Status */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={transactionForm.status}
                  onValueChange={(value) => setTransactionForm({...transactionForm, status: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="Pending" value="pending" />
                  <Picker.Item label="Approved" value="approved" />
                  <Picker.Item label="Rejected" value="rejected" />
                  <Picker.Item label="Completed" value="completed" />
                </Picker>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter any additional notes..."
              value={transactionForm.notes}
              onChangeText={(text) => setTransactionForm({...transactionForm, notes: text})}
              multiline
                numberOfLines={3}
                textAlignVertical="top"
            />
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowTransactionForm(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleCreateTransaction}
              disabled={isCreatingChemical}
            >
              <Text style={styles.saveButtonText}>
                {isCreatingChemical ? 'Creating Chemical...' : 'Create Transaction'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Purchase Order Form Modal */}
      <Modal
        visible={showPurchaseOrderForm}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Purchase Order</Text>
            <TouchableOpacity onPress={() => setShowPurchaseOrderForm(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalContent} 
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.modalContentContainer}
          >
            {/* Supplier and Currency */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.formLabel}>Supplier *</Text>
            <TextInput
              style={styles.input}
                  placeholder="Enter supplier name"
              value={purchaseOrderForm.supplier}
              onChangeText={(text) => setPurchaseOrderForm({...purchaseOrderForm, supplier: text})}
            />
              </View>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.formLabel}>Currency</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={purchaseOrderForm.currency}
                    onValueChange={(value) => setPurchaseOrderForm({...purchaseOrderForm, currency: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="INR" value="INR" />
                    <Picker.Item label="USD" value="USD" />
                    <Picker.Item label="EUR" value="EUR" />
                    <Picker.Item label="GBP" value="GBP" />
                  </Picker>
                </View>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes..."
                value={purchaseOrderForm.notes}
                onChangeText={(text) => setPurchaseOrderForm({...purchaseOrderForm, notes: text})}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Status */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={purchaseOrderForm.status}
                  onValueChange={(value) => setPurchaseOrderForm({...purchaseOrderForm, status: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="Draft" value="draft" />
                  <Picker.Item label="Submitted" value="submitted" />
                  <Picker.Item label="Approved" value="approved" />
                  <Picker.Item label="Ordered" value="ordered" />
                  <Picker.Item label="Delivered" value="delivered" />
                  <Picker.Item label="Cancelled" value="cancelled" />
                </Picker>
              </View>
            </View>

            {/* Items Section */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items</Text>
              {purchaseOrderForm.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                      {chemicals.find(c => c.id === item.chemical_id)?.name}
                    </Text>
                    <Text style={styles.itemDetails}>
                      {item.quantity} {item.unit} @ {formatCurrency(item.unit_price, purchaseOrderForm.currency)}/unit
                    </Text>
                    <Text style={styles.itemTotal}>
                      Total: {formatCurrency(item.total_price, purchaseOrderForm.currency)}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeItemFromPurchaseOrder(index)}
                    style={styles.removeItemButton}
                  >
                    <Ionicons name="trash" size={16} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add Item Section */}
              <View style={styles.addItemSection}>
                <Text style={styles.sectionTitle}>Add Item</Text>
                
                {/* Chemical Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Chemical</Text>
                  <View style={styles.chemicalSearchContainer}>
                    <TextInput
                      style={styles.chemicalSearchInput}
                      placeholder="Search for chemical..."
                      value={chemicalSearch}
                      onChangeText={setChemicalSearch}
                      onFocus={() => setShowChemicalDropdown(true)}
                    />
                    {showChemicalDropdown && filteredChemicals.length > 0 && (
                      <View style={styles.chemicalDropdown}>
                        <FlatList
                          data={filteredChemicals}
                          keyExtractor={(item) => item.id.toString()}
                          renderItem={({ item: chemical }) => (
                            <TouchableOpacity
                              style={styles.chemicalDropdownItem}
                              onPress={() => handleChemicalSelectForPurchaseOrder(chemical)}
                            >
                              <Text style={styles.chemicalDropdownText}>{chemical.name}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}
                  </View>
                </View>

                {/* Quantity and Unit */}
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.formLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
                      placeholder="0"
                      value={currentItem.quantity.toString()}
                      onChangeText={(text) => setCurrentItem({...currentItem, quantity: parseFloat(text) || 0})}
              keyboardType="numeric"
            />
                  </View>
                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.formLabel}>Unit</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={currentItem.unit}
                        onValueChange={(value) => setCurrentItem({...currentItem, unit: value})}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select Unit" value="" />
                        <Picker.Item label="Grams (g)" value="g" />
                        <Picker.Item label="Kilograms (kg)" value="kg" />
                        <Picker.Item label="Milligrams (mg)" value="mg" />
                        <Picker.Item label="Liters (L)" value="L" />
                        <Picker.Item label="Milliliters (mL)" value="mL" />
                        <Picker.Item label="Moles (mol)" value="mol" />
                        <Picker.Item label="Millimoles (mmol)" value="mmol" />
                        <Picker.Item label="Pieces" value="pieces" />
                        <Picker.Item label="Bottles" value="bottles" />
                        <Picker.Item label="Vials" value="vials" />
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* Unit Price */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Unit Price</Text>
            <TextInput
              style={styles.input}
                    placeholder="0"
                    value={currentItem.unit_price.toString()}
                    onChangeText={(text) => setCurrentItem({...currentItem, unit_price: parseFloat(text) || 0})}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity 
                  onPress={addItemToPurchaseOrder}
                  style={styles.addItemButton}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text style={styles.addItemButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Total Amount */}
            <View style={styles.totalSection}>
              <Text style={styles.totalAmount}>
                Total Amount: {formatCurrency(purchaseOrderForm.total_amount, purchaseOrderForm.currency)}
              </Text>
            </View>
            
            {/* Extra space at bottom to ensure total amount is visible */}
            <View style={{ height: 100 }} />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowPurchaseOrderForm(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleCreatePurchaseOrder}
            >
              <Text style={styles.saveButtonText}>Create Purchase Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Purchase History Modal */}
      <Modal
        visible={showPurchaseHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Purchase History: {selectedChemicalForHistory?.name || 'Unknown Chemical'}
            </Text>
            <TouchableOpacity onPress={() => setShowPurchaseHistoryModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {purchaseHistoryLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading purchase history...</Text>
              </View>
            ) : (
              <>
                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Purchased</Text>
                    <Text style={styles.summaryValue}>
                      {purchaseHistoryData?.total_purchased?.toFixed(2) || '0'} {selectedChemicalForHistory?.unit || 'units'}
                    </Text>
                    <Text style={styles.summarySubtext}>
                      {purchaseTransactions.length} transactions
                    </Text>
                  </View>
                  
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Spent</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(purchaseHistoryData?.total_spent || 0)}
                    </Text>
                    <Text style={styles.summarySubtext}>
                      Avg: {formatCurrency(purchaseHistoryData?.average_unit_price || 0)}/{selectedChemicalForHistory?.unit || 'unit'}
                    </Text>
                  </View>
                </View>

                {/* Purchase Transactions */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Purchase Transactions</Text>
                  {purchaseTransactions.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="document-outline" size={48} color="#ccc" />
                      <Text style={styles.emptyStateText}>No purchase transactions found</Text>
                    </View>
                  ) : (
                    purchaseTransactions.map((transaction, index) => (
                      <View key={index} style={styles.transactionCard}>
                        <View style={styles.transactionHeader}>
                          <Text style={styles.transactionDate}>
                            {formatDateForDisplay(transaction.created_at)}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
                            <Text style={styles.statusText}>{transaction.status}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.transactionDetails}>
                          <View style={styles.transactionRow}>
                            <Text style={styles.transactionLabel}>Supplier:</Text>
                            <Text style={styles.transactionValue}>{transaction.supplier || 'Not specified'}</Text>
                          </View>
                          
                          <View style={styles.transactionRow}>
                            <Text style={styles.transactionLabel}>Quantity:</Text>
                            <Text style={styles.transactionValue}>{transaction.quantity} {transaction.unit}</Text>
                          </View>
                          
                          <View style={styles.transactionRow}>
                            <Text style={styles.transactionLabel}>Unit Price:</Text>
                            <Text style={styles.transactionValue}>
                              {formatCurrency(transaction.amount / transaction.quantity)}/{transaction.unit}
                            </Text>
                          </View>
                          
                          <View style={styles.transactionRow}>
                            <Text style={styles.transactionLabel}>Total Amount:</Text>
                            <Text style={[styles.transactionValue, styles.transactionAmount]}>
                              {formatCurrency(transaction.amount)}
                            </Text>
                          </View>
                          
                          {transaction.notes && (
                            <View style={styles.transactionRow}>
                              <Text style={styles.transactionLabel}>Notes:</Text>
                              <Text style={styles.transactionValue}>{transaction.notes}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: 50, // Add extra padding to avoid status bar
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 8,
    marginVertical: 4,
  },
  activeTab: {
    backgroundColor: '#e3f2fd',
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 10,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    flex: 1,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  transactionChemical: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  transactionSupplier: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  purchaseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  purchaseSupplier: {
    fontSize: 14,
    color: '#6c757d',
  },
  purchaseItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  purchaseItemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  approvePurchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
  },
  approvePurchaseButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectPurchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
  },
  rejectPurchaseButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  transactionType: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  transactionSupplier: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 10,
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  approveButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  purchaseOrderCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  purchaseOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  purchaseOrderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  purchaseOrderSupplier: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  purchaseOrderDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  purchaseOrderNumber: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  purchaseOrderNotes: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  purchaseOrderActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  approvePurchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
  },
  approvePurchaseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectPurchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
  },
  rejectPurchaseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  successMessage: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    margin: 15,
  },
  successText: {
    color: '#155724',
    fontSize: 14,
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  modalContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 15,
  },
  halfWidth: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  chemicalSearchContainer: {
    position: 'relative',
  },
  chemicalSearchInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  chemicalDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  chemicalDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  chemicalDropdownText: {
    fontSize: 16,
    color: '#212529',
  },
  createChemicalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ced4da',
    marginTop: 8,
  },
  createChemicalButtonText: {
    fontSize: 16,
    color: '#155724',
    fontWeight: '500',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  itemsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  itemDetails: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginTop: 5,
  },
  addItemSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  addItemButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 5,
  },
  totalSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'right',
  },
  removeItemButton: {
    padding: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  // Search and Filter Styles
  searchFilterSection: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBar: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
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
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 16,
  },
  filterGrid: {
    marginBottom: 16,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: 'white',
  },
  rangeSeparator: {
    fontSize: 14,
    color: '#6c757d',
  },
  dateInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: '#212529',
  },
  datePlaceholder: {
    fontSize: 14,
    color: '#6c757d',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: 'white',
  },
  filterActions: {
    alignItems: 'center',
  },
  clearFilters: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  viewDetailsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  viewDetailsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Purchase History Modal Styles
  sectionContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 15,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  transactionDetails: {
    gap: 8,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  transactionValue: {
    fontSize: 14,
    color: '#212529',
    flex: 1,
    textAlign: 'right',
  },
  transactionAmount: {
    fontWeight: '600',
    color: '#28a745',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
    textAlign: 'center',
  },
  summarySubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  purchaseOrderChemicals: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  purchaseChemical: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
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

export default AccountScreen; 