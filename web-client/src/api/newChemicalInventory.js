const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

async function authHeaders() {
  // First try to get token from localStorage
  let token = localStorage.getItem('firebase_token');
  
  // If no token in localStorage, try to get it from the current user
  if (!token) {
    // Try to get the current user from the auth context
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser && currentUser.uid) {
      // This is a fallback - ideally we should pass the user object
      console.warn('No token found, authentication may fail');
    }
  }
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// ===== CHEMICALS (Raw Chemicals & Stock Management) =====
export async function fetchChemicals(search = '', skip = 0, limit = 100) {
  try {
    const headers = await authHeaders();
    
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    
    if (search) {
      params.append('search', search);
    }
    
    console.log('Fetching chemicals from:', `${API_BASE}/chemicals/?${params}`);
    const response = await fetch(`${API_BASE}/chemicals/?${params}`, { headers });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Raw response data:', data);
    console.log('Data.chemicals:', data.chemicals);
    
    return data.chemicals || data; // Handle both new and old response formats
  } catch (error) {
    console.error('Error fetching chemicals:', error);
    throw error;
  }
}

export async function createChemical(chemicalData) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/chemicals/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chemicalData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating chemical:', error);
    throw error;
  }
}

export async function updateChemical(id, chemicalData) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/chemicals/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(chemicalData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating chemical:', error);
    throw error;
  }
}

export async function deleteChemical(id) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/chemicals/${id}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting chemical:', error);
    throw error;
  }
}

export async function getChemical(id) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/chemicals/${id}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching chemical:', error);
    throw error;
  }
}

// ===== CHEMICAL PRODUCTS =====
export async function fetchChemicalProducts(search = '', skip = 0, limit = 100) {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    
    if (search) {
      params.append('search', search);
    }
    
    const response = await fetch(`${API_BASE}/products/?${params}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.products || data; // Handle both new and old response formats
  } catch (error) {
    console.error('Error fetching chemical products:', error);
    throw error;
  }
}

export async function createChemicalProduct(productData) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/products/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(productData)
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

export async function updateChemicalProduct(id, productData) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(productData)
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
    const response = await fetch(`${API_BASE}/products/${id}`, {
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

export async function getChemicalProduct(id) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/products/${id}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching chemical product:', error);
    throw error;
  }
}

export async function getProductWithFormulations(id) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/products/${id}/with-formulations`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching product with formulations:', error);
    throw error;
  }
}

// ===== FORMULATIONS =====
export async function fetchFormulations(productId = null, skip = 0, limit = 100) {
  try {
    const headers = await authHeaders();
    let url = `${API_BASE}/formulations/`;
    
    if (productId) {
      url = `${API_BASE}/formulations/product/${productId}`;
    }
    
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    
    const response = await fetch(`${url}?${params}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.formulations || data; // Handle both new and old response formats
  } catch (error) {
    console.error('Error fetching formulations:', error);
    throw error;
  }
}

export async function createFormulation(formulationData) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/formulations/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(formulationData)
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

export async function updateFormulation(id, formulationData) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/formulations/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(formulationData)
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

// ===== STOCK MOVEMENTS =====
export async function fetchStockMovements(chemicalId = null, skip = 0, limit = 100) {
  try {
    const headers = await authHeaders();
    let url = `${API_BASE}/stock-movements/`;
    
    if (chemicalId) {
      url = `${API_BASE}/stock-movements/chemical/${chemicalId}`;
    }
    
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    
    const response = await fetch(`${url}?${params}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.movements || data; // Handle both new and old response formats
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    throw error;
  }
}

export async function createStockMovement(movementData) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/stock-movements/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(movementData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating stock movement:', error);
    throw error;
  }
}

// ===== MANUFACTURING =====
export async function manufactureProduct(manufacturingData) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/manufacturing/manufacture`, {
      method: 'POST',
      headers,
      body: JSON.stringify(manufacturingData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error manufacturing product:', error);
    throw error;
  }
}

export async function checkManufacturingFeasibility(productId, targetQuantity, targetUnit) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/manufacturing/feasibility`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        product_id: productId,
        target_quantity: targetQuantity,
        target_unit: targetUnit
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking manufacturing feasibility:', error);
    throw error;
  }
}

// ===== PRODUCT ASSIGNMENTS =====
export async function fetchAssignments(skip = 0, limit = 100) {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    
    const response = await fetch(`${API_BASE}/assignments/all?${params}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.assignments || data; // Handle both new and old response formats
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
}

export async function createAssignment(assignmentData) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/assignments/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(assignmentData)
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

// ===== USERS =====
export async function fetchUsers(skip = 0, limit = 100) {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    
    const response = await fetch(`${API_BASE}/admin/users?${params}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.users || data; // Handle both new and old response formats
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

// ===== EXCEL UPLOAD =====
export async function uploadExcelFile(file, type) {
  try {
    const token = localStorage.getItem('firebase_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    // Debug logs
    console.log('[ExcelUpload] Endpoint:', `${API_BASE}/excel/upload-formulation`);
    console.log('[ExcelUpload] File:', { name: file?.name, size: file?.size, type: file?.type });
    console.log('[ExcelUpload] Type param:', type);

    const response = await fetch(`${API_BASE}/excel/upload-formulation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    console.log('[ExcelUpload] Response status:', response.status, 'ok:', response.ok);
    let data;
    try {
      data = await response.json();
      console.log('[ExcelUpload] Response JSON:', data);
    } catch (jsonErr) {
      const text = await response.text();
      console.warn('[ExcelUpload] Failed to parse JSON. Raw text:', text);
      throw new Error(`Upload failed (non-JSON response). Status ${response.status}`);
    }
    
    if (!response.ok) {
      throw new Error(data?.detail || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error uploading Excel file:', error);
    throw error;
  }
}
