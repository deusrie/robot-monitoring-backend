// API service for communicating with Flask backend
const API_BASE = 'http://localhost:5000/api';

// Get token from localStorage
const getAuthToken = () => localStorage.getItem('access_token');

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
};

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { username: string; email: string; full_name: string; password: string; role?: string; room?: string }) =>
    apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (username: string, password: string) =>
    apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getCurrentUser: () => apiCall('/auth/me'),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => apiCall('/users'),
  getById: (id: number) => apiCall(`/users/${id}`),
  search: (query: string) => apiCall(`/users/search?q=${encodeURIComponent(query)}`),
};

// ─── Robots ────────────────────────────────────────────────────────────────────
export const robotsAPI = {
  getAll: () => apiCall('/robots'),
  getById: (id: number) => apiCall(`/robots/${id}`),
  create: (data: any) => apiCall('/robots', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiCall(`/robots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── Deliveries (Mock) ────────────────────────────────────────────────
export const deliveriesAPI = {
  createRequest: async (data: any) =>
    Promise.resolve({ id: 1, ...data, status: "Pending" }),

  getMyRequests: async () =>
    Promise.resolve([
      { id: 1, document_name: "Contract.pdf", status: "Pending" },
      { id: 2, document_name: "Invoice.docx", status: "Received" },
    ]),

  getById: async (id: number) =>
    Promise.resolve({ id, document_name: "Contract.pdf", status: "Pending" }),

  confirmReceived: async (deliveryId: number) =>
    Promise.resolve({ id: deliveryId, status: "Received" }),
};


// ─── Telemetry ────────────────────────────────────────────────────────────────
export const telemetryAPI = {
  getAll: () => apiCall('/telemetry'),
  getByRobotId: (robotId: number) => apiCall(`/telemetry/robot/${robotId}`),
};

// ─── Alerts ────────────────────────────────────────────────────────────────────
export const alertsAPI = {
  getAll: () => apiCall('/alerts'),
  getActive: () => apiCall('/alerts/active'),
};
