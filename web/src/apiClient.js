import axios from 'axios';

// Get base URL from environment or fallback to proxy target
let baseURL = import.meta.env.VITE_API_URL || '/api/v1';

// Ensure /api/v1 is included in the URL
if (baseURL && baseURL.startsWith('http')) {
  // If it's an absolute URL, ensure /api/v1 is at the end
  if (!baseURL.includes('/api/v1')) {
    baseURL = baseURL.replace(/\/$/, '') + '/api/v1';
  }
}

// Create standardized axios instance
const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle common errors (like 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and handle logout flow if unauthorized
      localStorage.removeItem(import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token');
      // Dispatch an event that AuthContext can listen to for seamless logouts
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
