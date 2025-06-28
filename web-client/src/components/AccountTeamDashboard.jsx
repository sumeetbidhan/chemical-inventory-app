import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart3, DollarSign, ClipboardList, Plus } from 'lucide-react';
import {
  fetchAccountSummary,
  fetchTransactions,
  fetchPurchaseOrders,
  fetchRecentTransactions,
  fetchPendingPurchases,
  createTransaction,
  createPurchaseOrder
} from '../api/accountTransactions';
import { fetchChemicals } from '../api/chemicals';
import { sendNotification } from '../api/notifications';
import styles from './AccountTeamDashboard.module.scss';

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
        fetchAccountSummary(),
        fetchTransactions(),
        fetchPurchaseOrders(),
        fetchRecentTransactions(),
        fetchPendingPurchases(),
        fetchChemicals()
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
      
      // Send notification about the transaction
      await sendNotification({
        type: 'purchase_transaction',
        severity: 'info',
        message: `New transaction created: ${transactionData.quantity} ${transactionData.unit} of chemical purchased for $${transactionData.amount}`,
        chemical_id: transactionData.chemical_id,
        recipients: ['admin', 'product']
      });
      
      await loadDashboardData();
      setShowTransactionForm(false);
      setError('');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'ordered': return '#17a2b8';
      case 'delivered': return '#28a745';
      case 'cancelled': return '#dc3545';
      case 'draft': return '#6c757d';
      case 'submitted': return '#fd7e14';
      case 'approved': return '#20c997';
      default: return '#6c757d';
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
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
            Total Spent: {summary ? formatCurrency(summary.total_purchases) : '$0'}
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

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewSection}>
            <div className={styles.recentTransactions}>
              <h3>Recent Transactions</h3>
              <div className={styles.transactionsList}>
                {recentTransactions.map(transaction => (
                  <div key={transaction.id} className={styles.transactionItem}>
                    <div className={styles.transactionInfo}>
                      <div className={styles.transactionType}>
                        {transaction.transaction_type.toUpperCase()}
                      </div>
                      <div className={styles.transactionAmount}>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                    </div>
                    <div className={styles.transactionDetails}>
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
              <h3>All Transactions ({transactions.length})</h3>
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
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>{transaction.transaction_type}</td>
                      <td>
                        {chemicals.find(c => c.id === transaction.chemical_id)?.name || 'Unknown'}
                      </td>
                      <td>{transaction.quantity} {transaction.unit}</td>
                      <td>{formatCurrency(transaction.amount, transaction.currency)}</td>
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
              <h3>Purchase Orders ({purchaseOrders.length})</h3>
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
              {purchaseOrders.map(order => (
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
                      <p><strong>Total Amount:</strong> {formatCurrency(order.total_amount, order.currency)}</p>
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
                          <span>{formatCurrency(item.total_price, order.currency)}</span>
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
                    <p><strong>Amount:</strong> {formatCurrency(transaction.amount, transaction.currency)}</p>
                    <p><strong>Supplier:</strong> {transaction.supplier || 'Not specified'}</p>
                  </div>
                  <div className={styles.pendingActions}>
                    <button className={styles.approveBtn}>Approve</button>
                    <button className={styles.rejectBtn}>Reject</button>
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
function TransactionForm({ chemicals, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    chemical_id: '',
    transaction_type: 'purchase',
    quantity: 0,
    unit: '',
    amount: 0,
    currency: 'USD',
    supplier: '',
    status: 'pending',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
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
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Chemical</label>
            <select name="chemical_id" value={formData.chemical_id} onChange={handleChange} required>
              <option value="">Select Chemical</option>
              {chemicals.map(chemical => (
                <option key={chemical.id} value={chemical.id}>
                  {chemical.name}
                </option>
              ))}
            </select>
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
            <button type="submit" className={styles.submitBtn}>
              Create Transaction
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
    currency: 'USD',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Please add at least one item to the purchase order');
      return;
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

          <div className={styles.itemsSection}>
            <h4>Items</h4>
            {formData.items.map((item, index) => (
              <div key={index} className={styles.itemRow}>
                <span>{chemicals.find(c => c.id === item.chemical_id)?.name}</span>
                <span>{item.quantity} {item.unit}</span>
                <span>${item.unit_price}/unit</span>
                <span>${item.total_price}</span>
                <button type="button" onClick={() => removeItem(index)} className={styles.removeBtn}>
                  Remove
                </button>
              </div>
            ))}

            <div className={styles.addItemSection}>
              <h5>Add Item</h5>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Chemical</label>
                  <select name="chemical_id" value={currentItem.chemical_id} onChange={handleItemChange}>
                    <option value="">Select Chemical</option>
                    {chemicals.map(chemical => (
                      <option key={chemical.id} value={chemical.id}>
                        {chemical.name}
                      </option>
                    ))}
                  </select>
                </div>
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
              </div>
              <div className={styles.formRow}>
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
              </div>
              <button type="button" onClick={addItem} className={styles.addItemBtn}>
                Add Item
              </button>
            </div>
          </div>

          <div className={styles.totalSection}>
            <h4>Total Amount: ${formData.total_amount.toFixed(2)}</h4>
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