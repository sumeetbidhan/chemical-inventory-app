import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart3, DollarSign, ClipboardList, Plus, Search, Filter, X } from 'lucide-react';
import {
  fetchAccountSummary,
  fetchTransactions,
  fetchPurchaseOrders,
  fetchRecentTransactions,
  fetchPendingPurchases,
  createTransaction,
  createPurchaseOrder,
  approveTransaction,
  rejectTransaction
} from '../api/accountTransactions';
import { fetchChemicals, createChemical } from '../api/chemicals';
import { sendNotification } from '../api/notifications';
import styles from './AccountTeamDashboard.module.scss';

// Utility function for currency formatting
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export default function AccountTeamDashboard() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  
  const { user, userInfo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

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
      setError('');
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (transactionData) => {
    try {
      await createTransaction(transactionData);
      
      // Get chemical name for notification
      const chemical = chemicals.find(c => c.id === transactionData.chemical_id);
      const chemicalName = chemical ? chemical.name : 'Unknown Chemical';
      
      // Send notification about the transaction
      await sendNotification({
        type: 'purchase_transaction',
        severity: 'info',
        message: `New transaction created: ${transactionData.quantity} ${transactionData.unit} of ${chemicalName} purchased for ${formatCurrency(transactionData.amount, transactionData.currency || 'INR')}`,
        chemical_id: transactionData.chemical_id,
        recipients: ['admin', 'product']
      });
      
      await loadDashboardData();
      setTransactionSuccess(true);
      setError('');
      
      // Hide success message after 3 seconds
      setTimeout(() => setTransactionSuccess(false), 3000);
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError(err.message || 'Failed to create transaction');
    }
  };

  const handleCreatePurchaseOrder = async (purchaseOrderData) => {
    try {
      await createPurchaseOrder(purchaseOrderData);
      
      // Send notification about the purchase order
      await sendNotification({
        type: 'purchase_order',
        severity: 'info',
        message: `New purchase order created: ${purchaseOrderData.items.length} items for $${purchaseOrderData.total_amount}`,
        recipients: ['admin', 'product']
      });
      
      await loadDashboardData();
      setShowPurchaseOrderForm(false);
      setError('');
    } catch (err) {
      console.error('Error creating purchase order:', err);
      setError(err.message || 'Failed to create purchase order');
    }
  };

  const handleApproveTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to approve this transaction?')) {
      return;
    }
    
    try {
      await approveTransaction(transactionId);
      
      // Send notification about the approval
      await sendNotification({
        type: 'transaction_approved',
        severity: 'success',
        message: `Transaction ${transactionId} has been approved`,
        recipients: ['account']
      });
      
      await loadDashboardData();
      setError('');
    } catch (err) {
      console.error('Error approving transaction:', err);
      setError(err.message || 'Failed to approve transaction');
    }
  };

  const handleRejectTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to reject this transaction?')) {
      return;
    }
    
    try {
      await rejectTransaction(transactionId);
      
      // Send notification about the rejection
      await sendNotification({
        type: 'transaction_rejected',
        severity: 'warning',
        message: `Transaction ${transactionId} has been rejected`,
        recipients: ['account']
      });
      
      await loadDashboardData();
      setError('');
    } catch (err) {
      console.error('Error rejecting transaction:', err);
      setError(err.message || 'Failed to reject transaction');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      // Transaction statuses
      case 'pending': return '#ffc107';
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      
      // Purchase order statuses
      case 'draft': return '#6c757d';
      case 'submitted': return '#fd7e14';
      case 'approved': return '#20c997';
      case 'ordered': return '#17a2b8';
      case 'delivered': return '#28a745';
      
      default: return '#6c757d';
    }
  };

  // Filter transactions based on search term and filters
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Search by chemical name
    if (searchTerm.trim()) {
      filtered = filtered.filter(transaction => {
        const chemical = chemicals.find(c => c.id === transaction.chemical_id);
        return chemical && chemical.name.toLowerCase().includes(searchTerm.toLowerCase());
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

    // Search by order number or chemical names
    if (searchTerm.trim()) {
      filtered = filtered.filter(order => {
        // Search in order number
        if (order.order_number && order.order_number.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
        // Search in chemical names
        return order.items.some(item => {
          const chemical = chemicals.find(c => c.id === item.chemical_id);
          return chemical && chemical.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
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

    // Search by chemical name
    if (searchTerm.trim()) {
      filtered = filtered.filter(transaction => {
        const chemical = chemicals.find(c => c.id === transaction.chemical_id);
        return chemical && chemical.name.toLowerCase().includes(searchTerm.toLowerCase());
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

  if (loading) {
    return <div className={styles.loading}>Loading account dashboard...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Account Team Dashboard</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Role: {userInfo?.role || user?.role || 'account'} | 
            Total Spent: {summary ? formatCurrency(summary.total_purchases, 'INR') : '₹0'}
          </span>
          <button onClick={() => navigate('/dashboard')} className={styles.backBtn}>
            Back to Dashboard
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Summary Cards */}
      {summary && (
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <h3>Total Purchases</h3>
            <div className={styles.summaryValue}>{formatCurrency(summary.total_purchases)}</div>
            <div className={styles.summaryLabel}>All time</div>
          </div>
          <div className={styles.summaryCard}>
            <h3>This Month</h3>
            <div className={styles.summaryValue}>{formatCurrency(summary.total_spent_this_month)}</div>
            <div className={styles.summaryLabel}>Current month spending</div>
          </div>
          <div className={styles.summaryCard}>
            <h3>This Year</h3>
            <div className={styles.summaryValue}>{formatCurrency(summary.total_spent_this_year)}</div>
            <div className={styles.summaryLabel}>Current year spending</div>
          </div>
          <div className={styles.summaryCard}>
            <h3>Pending Orders</h3>
            <div className={styles.summaryValue}>{summary.pending_orders}</div>
            <div className={styles.summaryLabel}>Awaiting approval</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={activeTab === 'overview' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('overview')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={16} /> Overview
          </span>
        </button>
        <button
          className={activeTab === 'transactions' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('transactions')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={16} /> Transactions
          </span>
        </button>
        <button
          className={activeTab === 'purchase-orders' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('purchase-orders')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ClipboardList size={16} /> Purchase Orders
          </span>
        </button>
        <button
          className={activeTab === 'pending' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('pending')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            ⏳ Pending Items
          </span>
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className={styles.searchFilterSection}>
        <div className={styles.searchBar}>
          <div className={styles.searchInput}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder={activeTab === 'overview' ? "Search recent transactions by chemical name..." : 
                         activeTab === 'transactions' ? "Search transactions by chemical name..." : 
                         activeTab === 'purchase-orders' ? "Search orders by number or chemical name..." : 
                         "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchField}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={styles.clearSearch}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
          >
            <Filter size={16} />
            Filters
            {Object.values(filters).some(value => value !== '' && value !== false) && (
              <span className={styles.filterBadge}>•</span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className={styles.filterPanel}>
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}>
                <label>Amount Range</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    placeholder="Min $"
                    value={filters.amountMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    className={styles.rangeInput}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max $"
                    value={filters.amountMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    className={styles.rangeInput}
                  />
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label>Date Range</label>
                <div className={styles.dateInputs}>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className={styles.dateInput}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className={styles.dateInput}
                  />
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className={styles.selectInput}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="ordered">Ordered</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              {activeTab === 'transactions' && (
                <div className={styles.filterGroup}>
                  <label>Transaction Type</label>
                  <select
                    value={filters.transactionType}
                    onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value }))}
                    className={styles.selectInput}
                  >
                    <option value="">All Types</option>
                    <option value="purchase">Purchase</option>
                    <option value="sale">Sale</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
              )}

              <div className={styles.filterGroup}>
                <label>Supplier</label>
                <input
                  type="text"
                  placeholder="Search by supplier..."
                  value={filters.supplier}
                  onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
                  className={styles.textInput}
                />
              </div>
            </div>

            <div className={styles.filterActions}>
              <button
                onClick={() => setFilters({
                  amountMin: '',
                  amountMax: '',
                  dateFrom: '',
                  dateTo: '',
                  status: '',
                  transactionType: '',
                  supplier: ''
                })}
                className={styles.clearFilters}
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewSection}>
            <div className={styles.recentTransactions}>
              <h3>Recent Transactions ({getFilteredRecentTransactions().length} of {recentTransactions.length})</h3>
              <div className={styles.transactionsList}>
                {getFilteredRecentTransactions().map(transaction => (
                  <div key={transaction.id} className={styles.transactionItem}>
                    <div className={styles.transactionInfo}>
                      <div className={styles.transactionType}>
                        {transaction.transaction_type.toUpperCase()}
                      </div>
                      <div className={styles.transactionAmount}>
                        {formatCurrency(transaction.amount, transaction.currency || 'INR')}
                      </div>
                    </div>
                    <div className={styles.transactionDetails}>
                      <div className={styles.transactionChemical}>
                        {chemicals.find(c => c.id === transaction.chemical_id)?.name || 'Unknown Chemical'}
                      </div>
                      <div className={styles.transactionQuantity}>
                        {transaction.quantity} {transaction.unit}
                      </div>
                      <div className={styles.transactionDate}>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={styles.transactionStatus}>
                      <span 
                        className={styles.statusBadge}
                        style={{ backgroundColor: getStatusColor(transaction.status) }}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className={styles.transactionsSection}>
            <div className={styles.sectionHeader}>
              <h3>All Transactions ({getFilteredTransactions().length} of {transactions.length})</h3>
              <button 
                onClick={() => setShowTransactionForm(true)}
                className={styles.addBtn}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} /> Add Transaction
                </span>
              </button>
            </div>
            <div className={styles.transactionsTable}>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Chemical</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTransactions().map(transaction => (
                    <tr key={transaction.id}>
                      <td>{transaction.transaction_type}</td>
                      <td>
                        {chemicals.find(c => c.id === transaction.chemical_id)?.name || 'Unknown'}
                      </td>
                      <td>{transaction.quantity} {transaction.unit}</td>
                      <td>{formatCurrency(transaction.amount, transaction.currency || 'INR')}</td>
                      <td>{transaction.supplier || '-'}</td>
                      <td>
                        <span 
                          className={styles.statusBadge}
                          style={{ backgroundColor: getStatusColor(transaction.status) }}
                        >
                          {transaction.status}
                        </span>
                      </td>
                      <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => navigate(`/chemical-purchase-history/${transaction.chemical_id}`)}
                          style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'purchase-orders' && (
          <div className={styles.purchaseOrdersSection}>
            <div className={styles.sectionHeader}>
              <h3>Purchase Orders ({getFilteredPurchaseOrders().length} of {purchaseOrders.length})</h3>
              <button 
                onClick={() => setShowPurchaseOrderForm(true)}
                className={styles.addBtn}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  ➕ Create Purchase Order
                </span>
              </button>
            </div>
            <div className={styles.purchaseOrdersList}>
              {getFilteredPurchaseOrders().map(order => (
                <div key={order.id} className={styles.purchaseOrderCard}>
                  <div className={styles.orderHeader}>
                    <h4>{order.order_number}</h4>
                    <span 
                      className={styles.statusBadge}
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className={styles.orderDetails}>
                    <div className={styles.orderInfo}>
                      <p><strong>Supplier:</strong> {order.supplier}</p>
                      <p><strong>Total Amount:</strong> {formatCurrency(order.total_amount, order.currency || 'INR')}</p>
                      <p><strong>Items:</strong> {order.items.length}</p>
                      <p><strong>Created:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className={styles.orderItems}>
                      <h5>Items:</h5>
                      {order.items.map(item => (
                        <div key={item.id} className={styles.orderItem}>
                          <span>
                            {chemicals.find(c => c.id === item.chemical_id)?.name || 'Unknown'}
                          </span>
                          <span>{item.quantity} {item.unit}</span>
                          <span>{formatCurrency(item.unit_price, order.currency || 'INR')}/unit</span>
                          <span>{formatCurrency(item.total_price, order.currency || 'INR')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className={styles.pendingSection}>
            <h3>Pending Purchases ({pendingPurchases.length})</h3>
            <div className={styles.pendingList}>
              {pendingPurchases.map(transaction => (
                <div key={transaction.id} className={styles.pendingItem}>
                  <div className={styles.pendingInfo}>
                    <h4>
                      {chemicals.find(c => c.id === transaction.chemical_id)?.name || 'Unknown Chemical'}
                    </h4>
                    <p><strong>Quantity:</strong> {transaction.quantity} {transaction.unit}</p>
                    <p><strong>Amount:</strong> {formatCurrency(transaction.amount, transaction.currency || 'INR')}</p>
                    <p><strong>Supplier:</strong> {transaction.supplier || 'Not specified'}</p>
                  </div>
                  <div className={styles.pendingActions}>
                    {(userInfo?.role === 'admin' || user?.role === 'admin') && (
                      <>
                        <button className={styles.approveBtn} onClick={() => handleApproveTransaction(transaction.id)}>Approve</button>
                        <button className={styles.rejectBtn} onClick={() => handleRejectTransaction(transaction.id)}>Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          chemicals={chemicals}
          setChemicals={setChemicals}
          transactionSuccess={transactionSuccess}
          setTransactionSuccess={setTransactionSuccess}
          setShowTransactionForm={setShowTransactionForm}
          onSubmit={handleCreateTransaction}
          onCancel={() => setShowTransactionForm(false)}
        />
      )}

      {/* Purchase Order Form Modal */}
      {showPurchaseOrderForm && (
        <PurchaseOrderForm
          chemicals={chemicals}
          onSubmit={handleCreatePurchaseOrder}
          onCancel={() => setShowPurchaseOrderForm(false)}
        />
      )}
    </div>
  );
}

// Transaction Form Component
function TransactionForm({ chemicals, setChemicals, transactionSuccess, setTransactionSuccess, setShowTransactionForm, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    chemical_id: '',
    transaction_type: 'purchase',
    quantity: 0,
    unit: '',
    amount: 0,
    currency: 'INR',
    supplier: '',
    status: 'pending',
    notes: ''
  });

  const [chemicalSearch, setChemicalSearch] = useState('');
  const [showChemicalDropdown, setShowChemicalDropdown] = useState(false);
  const [filteredChemicals, setFilteredChemicals] = useState([]);
  const [isCreatingChemical, setIsCreatingChemical] = useState(false);

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

  const handleChemicalSelect = (chemical) => {
    setFormData(prev => ({
      ...prev,
      chemical_id: chemical.id
    }));
    setChemicalSearch(chemical.name);
    setShowChemicalDropdown(false);
  };

  const handleChemicalInputChange = async (e) => {
    const value = e.target.value;
    setChemicalSearch(value);
    
    // If user types something and it's not in the list, show option to create
    if (value.trim() && !chemicals.find(c => c.name.toLowerCase() === value.toLowerCase())) {
      setFilteredChemicals([]);
      setShowChemicalDropdown(true);
    }
  };

  const handleCreateNewChemical = async (chemicalName) => {
    if (!chemicalName.trim()) return;
    
    setIsCreatingChemical(true);
    try {
      // Add required fields with default values for the backend schema
      const chemicalData = {
        name: chemicalName.trim(),
        quantity: 0, // Default quantity
        unit: 'g'    // Default unit
      };
      
      const newChemical = await createChemical(chemicalData);
      
      // Update the chemicals list locally
      setChemicals(prevChemicals => [...prevChemicals, newChemical]);
      
      // Update the form data and search
      setFormData(prev => ({
        ...prev,
        chemical_id: newChemical.id
      }));
      setChemicalSearch(newChemical.name);
      setShowChemicalDropdown(false);
      
      console.log('Chemical created automatically:', newChemical.name);
    } catch (err) {
      alert('Failed to create chemical: ' + err.message);
    } finally {
      setIsCreatingChemical(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If user typed a chemical name but didn't select from dropdown, try to find or create it
    if (chemicalSearch && !formData.chemical_id) {
      const foundChemical = chemicals.find(c => 
        c.name.toLowerCase() === chemicalSearch.toLowerCase()
      );
      
      if (foundChemical) {
        formData.chemical_id = foundChemical.id;
      } else {
        // Auto-create the chemical
        await handleCreateNewChemical(chemicalSearch);
        if (!formData.chemical_id) {
          return; // Creation failed
        }
      }
    }
    
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>Add Transaction</h3>
        {transactionSuccess && (
          <div style={{
            background: '#d4edda',
            color: '#155724',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #c3e6cb'
          }}>
            ✅ Transaction created successfully! Form cleared for next transaction.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Chemical</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Type chemical name (existing or new)..."
                value={chemicalSearch}
                onChange={handleChemicalInputChange}
                onFocus={() => setShowChemicalDropdown(true)}
                onBlur={() => setTimeout(() => setShowChemicalDropdown(false), 200)}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              {showChemicalDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {filteredChemicals.length > 0 ? (
                    // Show existing chemicals
                    filteredChemicals.map(chemical => (
                      <div
                        key={chemical.id}
                        onClick={() => handleChemicalSelect(chemical)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                          ':hover': { backgroundColor: '#f5f5f5' }
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        {chemical.name}
                      </div>
                    ))
                  ) : chemicalSearch.trim() ? (
                    // Show option to create new chemical
                    <div
                      onClick={() => handleCreateNewChemical(chemicalSearch)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor: '#e8f5e8',
                        borderBottom: '1px solid #ddd',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>+</span>
                      <span>Create "{chemicalSearch}" as new chemical</span>
                      {isCreatingChemical && <span style={{ fontSize: '12px', color: '#666' }}>(Creating...)</span>}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <small style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
              Type to search existing chemicals or create a new one automatically
            </small>
          </div>

          <div className={styles.formGroup}>
            <label>Transaction Type</label>
            <select name="transaction_type" value={formData.transaction_type} onChange={handleChange}>
              <option value="purchase">Purchase</option>
              <option value="adjustment">Adjustment</option>
              <option value="usage">Usage</option>
            </select>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Unit</label>
              <select name="unit" value={formData.unit} onChange={handleChange} required>
                <option value="">Select Unit</option>
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="mg">Milligrams (mg)</option>
                <option value="L">Liters (L)</option>
                <option value="mL">Milliliters (mL)</option>
                <option value="mol">Moles (mol)</option>
                <option value="mmol">Millimoles (mmol)</option>
                <option value="pieces">Pieces</option>
                <option value="bottles">Bottles</option>
                <option value="vials">Vials</option>
              </select>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Supplier</label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              placeholder="Enter supplier name"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Additional notes..."
            />
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isCreatingChemical}>
              {isCreatingChemical ? 'Creating Chemical...' : 'Create Transaction'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setShowTransactionForm(false);
                setTransactionSuccess(false);
                setFormData({
                  chemical_id: '',
                  transaction_type: 'purchase',
                  quantity: 0,
                  unit: '',
                  amount: 0,
                  currency: 'INR',
                  supplier: '',
                  status: 'pending',
                  notes: ''
                });
                setChemicalSearch('');
              }} 
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Close Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Purchase Order Form Component
function PurchaseOrderForm({ chemicals, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
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

  const [chemicalSearch, setChemicalSearch] = useState('');
  const [showChemicalDropdown, setShowChemicalDropdown] = useState(false);
  const [filteredChemicals, setFilteredChemicals] = useState([]);

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

  const handleChemicalSelect = (chemical) => {
    setCurrentItem(prev => ({
      ...prev,
      chemical_id: chemical.id
    }));
    setChemicalSearch(chemical.name);
    setShowChemicalDropdown(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Please add at least one item to the purchase order');
      return;
    }
    
    // Validate that all items have valid chemical IDs
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.chemical_id) {
        alert(`Please select a valid chemical for item ${i + 1}`);
        return;
      }
    }
    
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addItem = () => {
    if (!currentItem.chemical_id || currentItem.quantity <= 0 || currentItem.unit_price <= 0) {
      alert('Please fill in all required fields for the item');
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
        alert('Please select a valid chemical from the dropdown or ensure the chemical name is correct.');
        return;
      }
    }

    const total_price = currentItem.quantity * currentItem.unit_price;
    const newItem = {
      ...currentItem,
      total_price
    };

    setFormData(prev => ({
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

  const removeItem = (index) => {
    const itemToRemove = formData.items[index];
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      total_amount: prev.total_amount - itemToRemove.total_price
    }));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>Create Purchase Order</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Supplier</label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                required
                placeholder="Enter supplier name"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className={styles.itemsSection}>
            <h4>Items</h4>
            {formData.items.map((item, index) => (
              <div key={index} className={styles.itemRow}>
                <span>{chemicals.find(c => c.id === item.chemical_id)?.name}</span>
                <span>{item.quantity} {item.unit}</span>
                <span>{formatCurrency(item.unit_price, formData.currency || 'INR')}/unit</span>
                <span>{formatCurrency(item.total_price, formData.currency || 'INR')}</span>
                <button type="button" onClick={() => removeItem(index)} className={styles.removeBtn}>
                  Remove
                </button>
              </div>
            ))}

            <div className={styles.addItemSection}>
              <h5>Add Item</h5>
              <div className={styles.formGroup}>
                <label>Chemical</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search for chemical..."
                    value={chemicalSearch}
                    onChange={(e) => setChemicalSearch(e.target.value)}
                    onFocus={() => setShowChemicalDropdown(true)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  {showChemicalDropdown && filteredChemicals.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {filteredChemicals.map(chemical => (
                        <div
                          key={chemical.id}
                          onClick={() => handleChemicalSelect(chemical)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee',
                            ':hover': { backgroundColor: '#f5f5f5' }
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          {chemical.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={currentItem.quantity}
                    onChange={handleItemChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Unit</label>
                  <select name="unit" value={currentItem.unit} onChange={handleItemChange}>
                    <option value="">Select Unit</option>
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="mg">Milligrams (mg)</option>
                    <option value="L">Liters (L)</option>
                    <option value="mL">Milliliters (mL)</option>
                    <option value="mol">Moles (mol)</option>
                    <option value="mmol">Millimoles (mmol)</option>
                    <option value="pieces">Pieces</option>
                    <option value="bottles">Bottles</option>
                    <option value="vials">Vials</option>
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Unit Price</label>
                <input
                  type="number"
                  name="unit_price"
                  value={currentItem.unit_price}
                  onChange={handleItemChange}
                  min="0"
                  step="0.01"
                />
              </div>
              <button type="button" onClick={addItem} className={styles.addItemBtn}>
                Add Item
              </button>
            </div>
          </div>

          <div className={styles.totalSection}>
            <h4>Total Amount: {formatCurrency(formData.total_amount, formData.currency || 'INR')}</h4>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              Create Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 