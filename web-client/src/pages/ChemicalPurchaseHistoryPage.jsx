import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchChemical } from '../api/chemicals';
import { fetchChemicalPurchaseHistory, fetchChemicalPurchaseTransactions } from '../api/accountTransactions';
import { BarChart3, Calendar, DollarSign, Package, TrendingUp, Filter, X } from 'lucide-react';
import styles from './ChemicalPurchaseHistoryPage.module.scss';

export default function ChemicalPurchaseHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userInfo } = useAuth();
  const [chemical, setChemical] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState(null);
  const [purchaseTransactions, setPurchaseTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all', // 'all', '1month', '3months', '6months', '1year', '2years'
    supplier: '',
    status: '',
    amountMin: '',
    amountMax: ''
  });

  useEffect(() => {
    loadChemicalData();
  }, [id]);

  const loadChemicalData = async () => {
    try {
      setLoading(true);
      const [chemicalData, historyData, transactionsData] = await Promise.all([
        fetchChemical(id),
        fetchChemicalPurchaseHistory(id),
        fetchChemicalPurchaseTransactions(id)
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

    // Convert to array and sort by total amount
    return Object.values(supplierMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5); // Top 5 suppliers
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

  if (loading) {
    return <div className={styles.loading}>Loading purchase history...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!chemical) {
    return <div className={styles.error}>Chemical not found</div>;
  }

  const filteredTransactions = getFilteredTransactions();
  const supplierAnalytics = getSupplierAnalytics();
  const filteredSummary = getFilteredSummary();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/account')} className={styles.backBtn}>
          ← Back to Account Dashboard
        </button>
        <h1>Purchase History: {chemical.name}</h1>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <Package size={24} />
          </div>
          <div className={styles.summaryContent}>
            <h3>Total Purchased</h3>
            <div className={styles.summaryValue}>
              {filteredSummary.totalQuantity.toFixed(2)} {chemical.unit}
            </div>
            <div className={styles.summaryLabel}>
              {filteredSummary.totalTransactions} transactions
            </div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.summaryContent}>
            <h3>Total Spent</h3>
            <div className={styles.summaryValue}>
              {formatCurrency(filteredSummary.totalAmount)}
            </div>
            <div className={styles.summaryLabel}>
              Avg: {formatCurrency(filteredSummary.averageUnitPrice)}/{chemical.unit}
            </div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <BarChart3 size={24} />
          </div>
          <div className={styles.summaryContent}>
            <h3>Top Suppliers</h3>
            <div className={styles.summaryValue}>
              {supplierAnalytics.length}
            </div>
            <div className={styles.summaryLabel}>
              {supplierAnalytics.length > 0 ? supplierAnalytics[0].name : 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterSection}>
        <div className={styles.filterHeader}>
          <h3>Filters</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
          >
            <Filter size={16} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className={styles.filterPanel}>
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}>
                <label>Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className={styles.selectInput}
                >
                  <option value="all">All Time</option>
                  <option value="1month">Last 1 Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last 1 Year</option>
                  <option value="2years">Last 2 Years</option>
                </select>
              </div>

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
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Amount Range</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={filters.amountMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    className={styles.rangeInput}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={filters.amountMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    className={styles.rangeInput}
                  />
                </div>
              </div>
            </div>

            <div className={styles.filterActions}>
              <button onClick={clearFilters} className={styles.clearFilters}>
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Suppliers Analytics */}
      <div className={styles.analyticsSection}>
        <h3>Top 5 Suppliers</h3>
        <div className={styles.supplierCards}>
          {supplierAnalytics.map((supplier, index) => (
            <div key={supplier.name} className={styles.supplierCard}>
              <div className={styles.supplierRank}>#{index + 1}</div>
              <div className={styles.supplierInfo}>
                <h4>{supplier.name}</h4>
                <div className={styles.supplierStats}>
                  <div className={styles.supplierStat}>
                    <span className={styles.statLabel}>Total Spent:</span>
                    <span className={styles.statValue}>{formatCurrency(supplier.totalAmount)}</span>
                  </div>
                  <div className={styles.supplierStat}>
                    <span className={styles.statLabel}>Quantity:</span>
                    <span className={styles.statValue}>{supplier.totalQuantity.toFixed(2)} {chemical.unit}</span>
                  </div>
                  <div className={styles.supplierStat}>
                    <span className={styles.statLabel}>Transactions:</span>
                    <span className={styles.statValue}>{supplier.transactionCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Transactions Table */}
      <div className={styles.transactionsSection}>
        <h3>Purchase Transactions ({filteredTransactions.length})</h3>
        <div className={styles.transactionsTable}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(transaction => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
                  <td>{transaction.supplier || 'Not specified'}</td>
                  <td>{transaction.quantity} {transaction.unit}</td>
                  <td>{formatCurrency(transaction.amount / transaction.quantity)}/{transaction.unit}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                  <td>
                    <span 
                      className={styles.statusBadge}
                      style={{ 
                        backgroundColor: 
                          transaction.status === 'completed' ? '#28a745' :
                          transaction.status === 'pending' ? '#ffc107' :
                          transaction.status === 'cancelled' ? '#dc3545' : '#6c757d'
                      }}
                    >
                      {transaction.status}
                    </span>
                  </td>
                  <td>{transaction.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 