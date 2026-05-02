const API_BASE = 'http://localhost:3001/api';

export async function listDrivers() {
  const res = await fetch(`${API_BASE}/drivers`);
  return res.json();
}

export async function addDriver(point) {
  const res = await fetch(`${API_BASE}/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ point }),
  });
  return res.json();
}

export async function removeDriver(point) {
  const res = await fetch(`${API_BASE}/remove-driver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ point }),
  });
  return res.json();
}

export async function findNearest(point) {
  const res = await fetch(`${API_BASE}/find`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ point }),
  });
  return res.json();
}

export async function findKNearest(point, k) {
  const res = await fetch(`${API_BASE}/find-k`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ point, k }),
  });
  return res.json();
}

export async function findRange(point, radius) {
  const res = await fetch(`${API_BASE}/range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ point, radius }),
  });
  return res.json();
}


export async function clearAll() {
  const res = await fetch(`${API_BASE}/clear`, {
    method: 'POST',
  });
  return res.json();
}

export async function healthCheck() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    return data.cProcessReady;
  } catch {
    return false;
  }
}
