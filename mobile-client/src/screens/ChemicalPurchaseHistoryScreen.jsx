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
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { 
  fetchChemical,
  fetchChemicalPurchaseHistory,
  fetchChemicalPurchaseTransactions
} from '../services/api';

const ChemicalPurchaseHistoryScreen = ({ route, navigation }) => {
  const { chemicalId } = route.params;
  const { userInfo } = useAuth();
  const [chemical, setChemical] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState(null);
  const [purchaseTransactions, setPurchaseTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    supplier: '',
    status: '',
    amountMin: '',
    amountMax: ''
  });

  useEffect(() => {
    loadChemicalData();
  }, [chemicalId]);

  const loadChemicalData = async () => {
    try {
      setLoading(true);
      const [chemicalData, historyData, transactionsData] = await Promise.all([
        fetchChemical(chemicalId).catch(err => {
          console.error('Error fetching chemical:', err);
          return null;
        }),
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
      
      setChemical(chemicalData);
      setPurchaseHistory(historyData);
      setPurchaseTransactions(transactionsData);
      setError('');
    } catch (err) {
      console.error('Error loading chemical data:', err);
      setError(err.message || 'Failed to load chemical data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChemicalData();
    setRefreshing(false);
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    switch (filters.dateRange) {
      case '1month':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case '3months':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case '6months':
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case '1year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case '2years':
        return new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      default:
        return null;
    }
  };

  const getFilteredTransactions = () => {
    let filtered = purchaseTransactions;

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const cutoffDate = getDateRangeFilter();
      filtered = filtered.filter(transaction => 
        new Date(transaction.created_at) >= cutoffDate
      );
    }

    // Filter by supplier
    if (filters.supplier) {
      filtered = filtered.filter(transaction =>
        transaction.supplier && 
        transaction.supplier.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(transaction => transaction.status === filters.status);
    }

    // Filter by amount range
    if (filters.amountMin) {
      filtered = filtered.filter(transaction => transaction.amount >= parseFloat(filters.amountMin));
    }
    if (filters.amountMax) {
      filtered = filtered.filter(transaction => transaction.amount <= parseFloat(filters.amountMax));
    }

    return filtered;
  };

  const getSupplierAnalytics = () => {
    const filteredTransactions = getFilteredTransactions();
    const supplierMap = {};

    filteredTransactions.forEach(transaction => {
      const supplier = transaction.supplier || 'Unknown Supplier';
      if (!supplierMap[supplier]) {
        supplierMap[supplier] = {
          name: supplier,
          totalQuantity: 0,
          totalAmount: 0,
          transactionCount: 0
        };
      }
      supplierMap[supplier].totalQuantity += transaction.quantity;
      supplierMap[supplier].totalAmount += transaction.amount;
      supplierMap[supplier].transactionCount += 1;
    });

    return Object.values(supplierMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);
  };

  const getFilteredSummary = () => {
    const filteredTransactions = getFilteredTransactions();
    const totalQuantity = filteredTransactions.reduce((sum, t) => sum + t.quantity, 0);
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageUnitPrice = totalQuantity > 0 ? totalAmount / totalQuantity : 0;

    return {
      totalTransactions: filteredTransactions.length,
      totalQuantity,
      totalAmount,
      averageUnitPrice
    };
  };

  const clearFilters = () => {
    setFilters({
      dateRange: 'all',
      supplier: '',
      status: '',
      amountMin: '',
      amountMax: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const renderSummaryCards = () => {
    const summary = getFilteredSummary();
    
    return (
      <View style={styles.summaryCards}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="cube-outline" size={24} color="white" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Total Purchased</Text>
            <Text style={styles.summaryValue}>
              {summary.totalQuantity.toFixed(2)} {chemical?.unit || 'units'}
            </Text>
            <Text style={styles.summaryLabel}>
              {summary.totalTransactions} transactions
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="cash-outline" size={24} color="white" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Total Spent</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.totalAmount)}
            </Text>
            <Text style={styles.summaryLabel}>
              Avg: {formatCurrency(summary.averageUnitPrice)}/{chemical?.unit || 'unit'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="business-outline" size={24} color="white" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Top Suppliers</Text>
            <Text style={styles.summaryValue}>
              {getSupplierAnalytics().length}
            </Text>
            <Text style={styles.summaryLabel}>
              {getSupplierAnalytics().length > 0 ? getSupplierAnalytics()[0].name : 'None'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filterSection}>
      <View style={styles.filterHeader}>
        <Text style={styles.filterTitle}>Filters</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
        >
          <Ionicons name="filter" size={16} color={showFilters ? "white" : "#007AFF"} />
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
            {showFilters ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filters.dateRange}
                onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
                style={styles.picker}
              >
                <Picker.Item label="All Time" value="all" />
                <Picker.Item label="Last 1 Month" value="1month" />
                <Picker.Item label="Last 3 Months" value="3months" />
                <Picker.Item label="Last 6 Months" value="6months" />
                <Picker.Item label="Last 1 Year" value="1year" />
                <Picker.Item label="Last 2 Years" value="2years" />
              </Picker>
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Supplier</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Search by supplier..."
              value={filters.supplier}
              onChangeText={(text) => setFilters(prev => ({ ...prev, supplier: text }))}
            />
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
              </Picker>
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Amount Range</Text>
            <View style={styles.rangeInputs}>
              <TextInput
                style={styles.rangeInput}
                placeholder="Min ₹"
                value={filters.amountMin}
                onChangeText={(text) => setFilters(prev => ({ ...prev, amountMin: text }))}
                keyboardType="numeric"
              />
              <Text style={styles.rangeSeparator}>-</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="Max ₹"
                value={filters.amountMax}
                onChangeText={(text) => setFilters(prev => ({ ...prev, amountMax: text }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity onPress={clearFilters} style={styles.clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderSupplierAnalytics = () => {
    const suppliers = getSupplierAnalytics();
    
    return (
      <View style={styles.analyticsSection}>
        <Text style={styles.sectionTitle}>Top 5 Suppliers</Text>
        <FlatList
          data={suppliers}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.supplierCard}>
              <View style={styles.supplierRank}>
                <Text style={styles.supplierRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.supplierInfo}>
                <Text style={styles.supplierName}>{item.name}</Text>
                <View style={styles.supplierStats}>
                  <View style={styles.supplierStat}>
                    <Text style={styles.statLabel}>Total Spent:</Text>
                    <Text style={styles.statValue}>{formatCurrency(item.totalAmount)}</Text>
                  </View>
                  <View style={styles.supplierStat}>
                    <Text style={styles.statLabel}>Quantity:</Text>
                    <Text style={styles.statValue}>{item.totalQuantity.toFixed(2)} {chemical?.unit || 'units'}</Text>
                  </View>
                  <View style={styles.supplierStat}>
                    <Text style={styles.statLabel}>Transactions:</Text>
                    <Text style={styles.statValue}>{item.transactionCount}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const renderTransactionItem = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.transactionDetails}>
        <View style={styles.transactionRow}>
          <Text style={styles.transactionLabel}>Supplier:</Text>
          <Text style={styles.transactionValue}>{item.supplier || 'Not specified'}</Text>
        </View>
        
        <View style={styles.transactionRow}>
          <Text style={styles.transactionLabel}>Quantity:</Text>
          <Text style={styles.transactionValue}>{item.quantity} {item.unit}</Text>
        </View>
        
        <View style={styles.transactionRow}>
          <Text style={styles.transactionLabel}>Unit Price:</Text>
          <Text style={styles.transactionValue}>
            {formatCurrency(item.amount / item.quantity)}/{item.unit}
          </Text>
        </View>
        
        <View style={styles.transactionRow}>
          <Text style={styles.transactionLabel}>Total Amount:</Text>
          <Text style={[styles.transactionValue, styles.transactionAmount]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
        
        {item.notes && (
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Notes:</Text>
            <Text style={styles.transactionValue}>{item.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading purchase history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadChemicalData} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredTransactions = getFilteredTransactions();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Purchase History: {chemical?.name || 'Unknown Chemical'}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderSummaryCards()}
        {renderFilters()}
        {renderSupplierAnalytics()}
        
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>
            Purchase Transactions ({filteredTransactions.length})
          </Text>
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderTransactionItem}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  content: {
    flex: 1,
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
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCards: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryIcon: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginRight: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  filterSection: {
    padding: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  filterToggleActive: {
    backgroundColor: '#007AFF',
  },
  filterToggleText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  filterToggleTextActive: {
    color: 'white',
  },
  filterPanel: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  picker: {
    height: 50,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  rangeSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#6c757d',
  },
  clearFilters: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  analyticsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  supplierCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  supplierRank: {
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierRankText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  supplierStats: {
    gap: 4,
  },
  supplierStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  statValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  transactionsSection: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
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
});

export default ChemicalPurchaseHistoryScreen; 