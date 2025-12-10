import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const moodService = {
  // Log a standalone mood entry (without journal)
  async logMood(moodData) {
    try {
      const response = await api.post('/api/v1/moods', {
        mood: moodData.mood,
        timestamp: moodData.timestamp || new Date().toISOString(),
        notes: moodData.notes || '',
      });
      return response.data;
    } catch (error) {
      console.error('Error logging mood:', error);
      throw error;
    }
  },

  // Get mood statistics
  async getMoodStats(period = '7d') {
    try {
      const response = await api.get(`/api/v1/moods/stats?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching mood stats:', error);
      throw error;
    }
  },

  // Get mood history
  async getMoodHistory(limit = 30) {
    try {
      const response = await api.get(`/api/v1/moods?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching mood history:', error);
      throw error;
    }
  },

  // Delete a mood entry
  async deleteMood(moodId) {
    try {
      const response = await api.delete(`/api/v1/moods/${moodId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting mood:', error);
      throw error;
    }
  },
};

export default moodService;
