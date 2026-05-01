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

// ─── Deliveries ────────────────────────────────────────────────────────────────
export const deliveriesAPI = {
  // Create a delivery request
  createRequest: (data: {
    document_name: string;
    sender: string;
    recipient: string;
    pickup_location: string;
    dropoff_location: string;
  }) =>
    apiCall('/deliveries/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get current user's delivery requests
  getMyRequests: () =>
    apiCall('/deliveries/my-requests'),

  // Get a delivery by ID
  getById: (id: number) =>
    apiCall(`/deliveries/${id}`),

  // Confirm delivery received
  confirmReceived: (deliveryId: number) =>
    apiCall(`/deliveries/${deliveryId}/received`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),

  // Admin: Get all deliveries
  getAllDeliveries: () =>
    apiCall('/deliveries/admin/all'),

  // Admin: Update delivery
  updateDelivery: (deliveryId: number, data: any) =>
    apiCall(`/deliveries/admin/${deliveryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Admin: Delete delivery
  deleteDelivery: (deliveryId: number) =>
    apiCall(`/deliveries/admin/${deliveryId}`, {
      method: 'DELETE',
    }),
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
