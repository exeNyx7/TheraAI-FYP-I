/**
 * Authentication Service
 * Handles all authentication-related API calls and token management.
 * Uses apiClient (axios) for all requests — never raw fetch.
 */

import apiClient from '../apiClient';

const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token';

class AuthService {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  getUserRole() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch {
      return null;
    }
  }

  hasRole(role) { return this.getUserRole() === role; }
  isAdmin() { return this.hasRole('admin'); }
  isPsychiatrist() { return this.hasRole('psychiatrist'); }
  isPatient() { return this.hasRole('patient'); }

  async signup(userData) {
    try {
      const { data } = await apiClient.post('/auth/signup', userData);
      if (data.access_token) this.setToken(data.access_token);
      return data;
    } catch (error) {
      const res = error.response;
      if (!res) throw error;
      if (res.status === 409) throw new Error('An account with this email already exists');
      if (res.status === 422) {
        const detail = res.data?.detail;
        if (Array.isArray(detail) && detail.length > 0) {
          throw new Error(detail[0].msg.replace('Value error, ', ''));
        }
        throw new Error('Please fill in all required fields correctly');
      }
      throw new Error(res.data?.detail || 'Registration failed');
    }
  }

  async login(email, password) {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      if (data.access_token) this.setToken(data.access_token);
      return data;
    } catch (error) {
      const res = error.response;
      if (!res) throw error;
      if (res.status === 401) throw new Error('Invalid email or password');
      if (res.status === 422) {
        const detail = res.data?.detail;
        if (Array.isArray(detail) && detail.length > 0) {
          throw new Error(detail[0].msg.replace('Value error, ', ''));
        }
        throw new Error('Please enter a valid email and password');
      }
      throw new Error(res.data?.detail || 'Login failed');
    }
  }

  async getCurrentUser() {
    const { data } = await apiClient.get('/auth/me');
    return data;
  }

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // best-effort
    } finally {
      this.removeToken();
    }
  }
}

const authService = new AuthService();
export default authService;
