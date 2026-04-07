/**
 * Authentication Service
 * Handles all authentication-related API calls and token management
 */

let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
if (API_BASE_URL.endsWith('/api/v1')) {
  API_BASE_URL = API_BASE_URL.slice(0, -7);
}
const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token';

class AuthService {
  /**
   * Get the stored authentication token
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Store authentication token
   */
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Remove authentication token
   */
  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Check if token is expired (basic check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Make authenticated API request
   */
  async makeAuthenticatedRequest(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid, redirect to login
      this.removeToken();
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    return response;
  }

  /**
   * User registration
   */
  async signup(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          throw new Error(data.detail || 'Please check your information and try again');
        } else if (response.status === 409) {
          throw new Error('An account with this email already exists');
        } else if (response.status === 422) {
          if (Array.isArray(data.detail) && data.detail.length > 0) {
            const firstError = data.detail[0];
            const msg = firstError.msg.replace('Value error, ', '');
            throw new Error(msg);
          }
          throw new Error('Please fill in all required fields correctly');
        }
        throw new Error(data.detail || 'Registration failed');
      }

      // Backend signup only returns user data, no token
      // User will need to login separately
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * User login
   */
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Invalid email or password');
        } else if (response.status === 422) {
          if (Array.isArray(data.detail) && data.detail.length > 0) {
            const firstError = data.detail[0];
            const msg = firstError.msg.replace('Value error, ', '');
            throw new Error(msg);
          }
          throw new Error('Please enter a valid email and password');
        }
        throw new Error(data.detail || 'Login failed');
      }

      // Store token
      if (data.access_token) {
        this.setToken(data.access_token);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    try {
      const response = await this.makeAuthenticatedRequest('/api/v1/auth/me');

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * User logout
   */
  async logout() {
    try {
      // Call logout endpoint if it exists
      await this.makeAuthenticatedRequest('/api/v1/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always remove token locally
      this.removeToken();
    }
  }

  /**
   * Get user role from token
   */
  getUserRole() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch (error) {
      console.error('Error extracting user role:', error);
      return null;
    }
  }

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.hasRole('admin');
  }

  /**
   * Check if user is psychiatrist
   */
  isPsychiatrist() {
    return this.hasRole('psychiatrist');
  }

  /**
   * Check if user is patient
   */
  isPatient() {
    return this.hasRole('patient');
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;