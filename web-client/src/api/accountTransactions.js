const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

// Helper to get auth header
const getAuthHeaders = () => {
  const token = localStorage.getItem('firebase_token');
  return token ? { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {};
};

// Account Transactions
export const createTransaction = async (transactionData) => {
  const response = await fetch(`${API_BASE}/account/transactions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(transactionData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create transaction');
  }

  return response.json();
};

export const fetchTransactions = async (skip = 0, limit = 100, chemicalId = null) => {
  let url = `${API_BASE}/account/transactions?skip=${skip}&limit=${limit}`;
  if (chemicalId) {
    url += `&chemical_id=${chemicalId}`;
  }

  const response = await fetch(url, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch transactions');
  }

  return response.json();
};

export const fetchTransaction = async (transactionId) => {
  const response = await fetch(`${API_BASE}/account/transactions/${transactionId}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch transaction');
  }

  return response.json();
};

export const updateTransaction = async (transactionId, updateData) => {
  const response = await fetch(`${API_BASE}/account/transactions/${transactionId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update transaction');
  }

  return response.json();
};

export const deleteTransaction = async (transactionId) => {
  const response = await fetch(`${API_BASE}/account/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete transaction');
  }

  return response.json();
};

// Purchase Orders
export const createPurchaseOrder = async (purchaseOrderData) => {
  const response = await fetch(`${API_BASE}/account/purchase-orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(purchaseOrderData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create purchase order');
  }

  return response.json();
};

export const fetchPurchaseOrders = async (skip = 0, limit = 100, status = null) => {
  let url = `${API_BASE}/account/purchase-orders?skip=${skip}&limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }

  const response = await fetch(url, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch purchase orders');
  }

  return response.json();
};

export const fetchPurchaseOrder = async (orderId) => {
  const response = await fetch(`${API_BASE}/account/purchase-orders/${orderId}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch purchase order');
  }

  return response.json();
};

export const updatePurchaseOrder = async (orderId, updateData) => {
  const response = await fetch(`${API_BASE}/account/purchase-orders/${orderId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update purchase order');
  }

  return response.json();
};

export const deletePurchaseOrder = async (orderId) => {
  const response = await fetch(`${API_BASE}/account/purchase-orders/${orderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete purchase order');
  }

  return response.json();
};

// Summary and Analytics
export const fetchAccountSummary = async () => {
  const response = await fetch(`${API_BASE}/account/summary`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch account summary');
  }

  return response.json();
};

export const fetchChemicalPurchaseHistory = async (chemicalId) => {
  const response = await fetch(`${API_BASE}/account/chemicals/${chemicalId}/purchase-history`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch purchase history');
  }

  return response.json();
};

export const fetchRecentTransactions = async (limit = 10) => {
  const response = await fetch(`${API_BASE}/account/recent-transactions?limit=${limit}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch recent transactions');
  }

  return response.json();
};

export const fetchPendingPurchases = async () => {
  const response = await fetch(`${API_BASE}/account/pending-purchases`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch pending purchases');
  }

  return response.json();
}; 