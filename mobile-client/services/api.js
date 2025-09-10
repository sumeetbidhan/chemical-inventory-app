import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';

// Use the same IP address that's working for the dashboard
const API_BASE = 'http://192.168.1.12:8000';

// Helper to get auth header
const getAuthHeaders = async () => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    return { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  return { 'Content-Type': 'application/json' };
};

// Notification API functions
export const sendNotification = async (notificationData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify(notificationData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send notification');
  }

  return response.json();
};

export const fetchNotifications = async (filters = {}) => {
  const headers = await getAuthHeaders();
  const queryParams = new URLSearchParams();
  
  // Add filter parameters
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null) {
      queryParams.append(key, filters[key]);
    }
  });
  
  const response = await fetch(`${API_BASE}/notifications?${queryParams.toString()}`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch notifications');
  }

  return response.json();
};

export const fetchUnreadNotifications = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/unread`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch unread notifications');
  }

  return response.json();
};

export const fetchActiveNotifications = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/active`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch active notifications');
  }

  return response.json();
};

export const dismissNotification = async (notificationId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/${notificationId}/dismiss`, {
    method: 'POST',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to dismiss notification');
  }

  return response.json();
};

export const markNotificationRead = async (notificationId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: 'POST',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to mark notification as read');
  }

  return response.json();
};

export const updateNotification = async (notificationId, updateData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update notification');
  }

  return response.json();
};

export const deleteNotification = async (notificationId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete notification');
  }

  return response.json();
};

export const fetchNotificationCategories = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/categories/list`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch notification categories');
  }

  return response.json();
};

export const fetchNotificationPriorities = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/priorities/list`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch notification priorities');
  }

  return response.json();
};

export const fetchNotificationStatuses = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/notifications/statuses/list`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch notification statuses');
  }

  return response.json();
};

// Account Transactions API functions
export const createTransaction = async (transactionData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/transactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(transactionData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create transaction');
  }

  return response.json();
};

export const fetchTransactions = async (skip = 0, limit = 100, chemicalId = null) => {
  const headers = await getAuthHeaders();
  let url = `${API_BASE}/account/transactions?skip=${skip}&limit=${limit}`;
  if (chemicalId) {
    url += `&chemical_id=${chemicalId}`;
  }

  const response = await fetch(url, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch transactions');
  }

  return response.json();
};

export const fetchTransaction = async (transactionId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/transactions/${transactionId}`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch transaction');
  }

  return response.json();
};

export const updateTransaction = async (transactionId, updateData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/transactions/${transactionId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update transaction');
  }

  return response.json();
};

export const deleteTransaction = async (transactionId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/transactions/${transactionId}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete transaction');
  }

  return response.json();
};

export const approveTransaction = async (transactionId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/transactions/${transactionId}/approve`, {
    method: 'PUT',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to approve transaction');
  }

  return response.json();
};

export const rejectTransaction = async (transactionId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/transactions/${transactionId}/reject`, {
    method: 'PUT',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to reject transaction');
  }

  return response.json();
};

// Purchase Orders API functions
export const createPurchaseOrder = async (purchaseOrderData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/purchase-orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(purchaseOrderData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create purchase order');
  }

  return response.json();
};

export const fetchPurchaseOrders = async (skip = 0, limit = 100, status = null) => {
  const headers = await getAuthHeaders();
  let url = `${API_BASE}/account/purchase-orders?skip=${skip}&limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }

  const response = await fetch(url, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch purchase orders');
  }

  return response.json();
};

export const fetchPurchaseOrder = async (orderId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/purchase-orders/${orderId}`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch purchase order');
  }

  return response.json();
};

export const updatePurchaseOrder = async (orderId, updateData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/purchase-orders/${orderId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update purchase order');
  }

  return response.json();
};

export const deletePurchaseOrder = async (orderId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/purchase-orders/${orderId}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete purchase order');
  }

  return response.json();
};

export const approvePurchaseOrder = async (orderId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/purchase-orders/${orderId}/approve`, {
    method: 'POST',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to approve purchase order');
  }

  return response.json();
};

export const rejectPurchaseOrder = async (orderId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/purchase-orders/${orderId}/reject`, {
    method: 'POST',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to reject purchase order');
  }

  return response.json();
};

// Summary and Analytics API functions
export const fetchAccountSummary = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/summary`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch account summary');
  }

  return response.json();
};

export const fetchChemicalPurchaseHistory = async (chemicalId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/chemicals/${chemicalId}/purchase-history`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch chemical purchase history');
  }

  return response.json();
};

export const fetchChemicalPurchaseTransactions = async (chemicalId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/chemicals/${chemicalId}/purchase-transactions`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch chemical purchase transactions');
  }

  return response.json();
};

export const fetchRecentTransactions = async (limit = 10) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/recent-transactions?limit=${limit}`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch recent transactions');
  }

  return response.json();
};

export const fetchPendingPurchases = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/account/pending-purchases`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch pending purchases');
  }

  return response.json();
};

// User management API functions
export const fetchUsers = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/users`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch users');
  }

  return response.json();
};

export const updateUserRole = async (userId, role) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/users/${userId}/role`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ role })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user role');
  }

  return response.json();
};

export const approveUser = async (userId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/users/${userId}/approve`, {
    method: 'PUT',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to approve user');
  }

  return response.json();
};

export const rejectUser = async (userId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/users/${userId}/reject`, {
    method: 'PUT',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to reject user');
  }

  return response.json();
};

export const deleteUser = async (userId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete user');
  }

  return response.json();
};

// Chemical inventory API functions
export const fetchChemicals = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/chemicals`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch chemicals');
  }

  return response.json();
};

export const fetchChemical = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/chemicals/${id}`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch chemical');
  }

  return response.json();
};

export const createChemical = async (chemicalData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/chemicals`, {
    method: 'POST',
    headers,
    body: JSON.stringify(chemicalData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create chemical');
  }

  return response.json();
};

export const updateChemical = async (id, chemicalData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/chemicals/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(chemicalData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update chemical');
  }

  return response.json();
};

export const addChemicalNote = async (id, note) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/chemicals/${id}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ note })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add chemical note');
  }

  return response.json();
};

export const deleteChemical = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/chemicals/${id}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete chemical');
  }

  return response.json();
};

// Formulation API functions
export const fetchFormulations = async (chemicalId = null) => {
  const headers = await getAuthHeaders();
  let url = `${API_BASE}/formulations`;
  if (chemicalId) {
    url += `?chemical_id=${chemicalId}`;
  }

  const response = await fetch(url, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch formulations');
  }

  return response.json();
};

export const createFormulation = async (formulationData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/formulations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(formulationData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create formulation');
  }

  return response.json();
};

export const updateFormulation = async (id, formulationData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/formulations/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(formulationData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update formulation');
  }

  return response.json();
};

export const addFormulationNote = async (id, note) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/formulations/${id}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ note })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add formulation note');
  }

  return response.json();
};

export const deleteFormulation = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/formulations/${id}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete formulation');
  }

  return response.json();
};

// User ping for online status
export const pingUser = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/user/ping`, {
    method: 'POST',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to ping user');
  }

  return response.json();
}; 