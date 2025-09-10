import { API_BASE } from '../config';

async function authHeaders() {
  const token = localStorage.getItem('firebaseToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// CHEMICAL PRODUCTS
export async function fetchChemicalProducts() {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/chemical-products/`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching chemical products:', error);
    throw error;
  }
}

export async function createChemicalProduct(data) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/chemical-products/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating chemical product:', error);
    throw error;
  }
}

export async function updateChemicalProduct(id, data) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/chemical-products/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating chemical product:', error);
    throw error;
  }
}

export async function deleteChemicalProduct(id) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/chemical-products/${id}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting chemical product:', error);
    throw error;
  }
}

// FORMULATIONS (product-specific)
export async function fetchFormulationsByProduct(productId) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/formulations/product/${productId}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching formulations by product:', error);
    throw error;
  }
}

export async function createFormulation(data) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/formulations/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating formulation:', error);
    throw error;
  }
}

export async function updateFormulation(id, data) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/formulations/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating formulation:', error);
    throw error;
  }
}

export async function deleteFormulation(id) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/formulations/${id}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting formulation:', error);
    throw error;
  }
}

// PRODUCT ASSIGNMENTS
export async function fetchAssignments() {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/assignments/all`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
}

export async function createAssignment(data) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/assignments/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
}

export async function fetchPendingExtensionRequests() {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/assignments/extension-requests/pending`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching pending extension requests:', error);
    throw error;
  }
}

export async function approveExtension(requestId, data) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/assignments/extension-requests/${requestId}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error approving extension:', error);
    throw error;
  }
}

export async function rejectExtension(requestId, data) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/assignments/extension-requests/${requestId}/reject`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error rejecting extension:', error);
    throw error;
  }
}

// USERS (for assignment dropdowns)
export async function fetchUsers() {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/users/`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

// EXCEL UPLOAD
export async function uploadExcelFile(file, type) {
  try {
    const token = localStorage.getItem('firebaseToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch(`${API_BASE}/upload/excel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading Excel file:', error);
    throw error;
  }
}

// TEAM ASSIGNMENT LOGIC
export async function getTeamAssignmentLogic() {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/assignments/team-logic`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching team assignment logic:', error);
    throw error;
  }
}

