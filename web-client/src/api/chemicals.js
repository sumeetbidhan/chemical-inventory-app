const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

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

// CHEMICALS
export async function fetchChemicals() {
  const res = await fetch(`${API_BASE}/chemicals/`, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch chemicals');
  }
  return res.json();
}

export async function fetchChemical(id) {
  const res = await fetch(`${API_BASE}/chemicals/${id}`, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch chemical');
  }
  return res.json();
}

export async function createChemical(data) {
  const res = await fetch(`${API_BASE}/chemicals/`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create chemical');
  }
  return res.json();
}

export async function updateChemical(id, data) {
  const res = await fetch(`${API_BASE}/chemicals/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to update chemical');
  }
  return res.json();
}

export async function addChemicalNote(id, note) {
  const res = await fetch(`${API_BASE}/chemicals/${id}/notes`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to add note');
  }
  return res.json();
}

export async function deleteChemical(id) {
  const res = await fetch(`${API_BASE}/chemicals/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to delete chemical');
  }
  return res.json();
}

// FORMULATIONS
export async function fetchFormulations(chemicalId = null) {
  const url = chemicalId 
    ? `${API_BASE}/formulations/chemical/${chemicalId}`
    : `${API_BASE}/formulations/`;
  const res = await fetch(url, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch formulations');
  }
  return res.json();
}

export async function fetchFormulation(id) {
  const res = await fetch(`${API_BASE}/formulations/${id}`, { 
    headers: await authHeaders() 
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch formulation');
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

export async function addFormulationNote(id, note) {
  const res = await fetch(`${API_BASE}/formulations/${id}/notes`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to add note');
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