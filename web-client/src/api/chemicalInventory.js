import { API_BASE } from '../config';

async function authHeaders() {
  const token = localStorage.getItem('firebase_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// CHEMICAL PRODUCTS
export async function fetchChemicalProducts() {
  const res = await fetch(`${API_BASE}/products/`, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch chemical products');
  }
  return res.json();
}

export async function createChemicalProduct(data) {
  const res = await fetch(`${API_BASE}/products/`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create chemical product');
  }
  return res.json();
}

export async function updateChemicalProduct(id, data) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to update chemical product');
  }
  return res.json();
}

export async function deleteChemicalProduct(id) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to delete chemical product');
  }
  return res.json();
}

// FORMULATIONS
export async function fetchFormulationsByProduct(productId) {
  const res = await fetch(`${API_BASE}/formulations/product/${productId}`, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch formulations');
  }
  return res.json();
}

export async function createFormulation(data) {
  const res = await fetch(`${API_BASE}/formulations/`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create formulation');
  }
  return res.json();
}

export async function updateFormulation(id, data) {
  const res = await fetch(`${API_BASE}/formulations/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to update formulation');
  }
  return res.json();
}

export async function deleteFormulation(id) {
  const res = await fetch(`${API_BASE}/formulations/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to delete formulation');
  }
  return res.json();
}

// PRODUCT ASSIGNMENTS
export async function fetchAssignments() {
  const res = await fetch(`${API_BASE}/assignments/all`, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch assignments');
  }
  return res.json();
}

export async function createAssignment(data) {
  const res = await fetch(`${API_BASE}/assignments/create`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create assignment');
  }
  return res.json();
}

export async function fetchPendingExtensionRequests() {
  const res = await fetch(`${API_BASE}/assignments/extension-requests/pending`, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch extension requests');
  }
  return res.json();
}

export async function approveExtension(requestId, data) {
  const res = await fetch(`${API_BASE}/assignments/extension-requests/${requestId}/approve`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to approve extension');
  }
  return res.json();
}

export async function rejectExtension(requestId, data) {
  const res = await fetch(`${API_BASE}/assignments/extension-requests/${requestId}/reject`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to reject extension');
  }
  return res.json();
}

// USERS (for assignment dropdowns)
export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/user/all`, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch users');
  }
  return res.json();
}

// EXCEL UPLOAD
export async function uploadExcelFile(file, type) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type); // 'chemicals', 'products', or 'formulations'

  const res = await fetch(`${API_BASE}/upload/excel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('firebase_token')}`,
    },
    body: formData,
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to upload Excel file');
  }
  return res.json();
}

// TEAM ASSIGNMENT LOGIC
export async function getTeamAssignmentLogic() {
  const res = await fetch(`${API_BASE}/assignments/team-assignment-logic`, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch team assignment logic');
  }
  return res.json();
}

