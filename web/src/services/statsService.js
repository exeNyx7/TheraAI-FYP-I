/**
 * Stats Service
 * API calls for user statistics, achievements, and activity feed
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('theraai_auth_token');
};

// Create axios instance with auth header
const createAuthConfig = () => {
  const token = getAuthToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Get user statistics
 * @returns {Promise} User stats including streak, points, level, etc.
 */
export const getUserStats = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/users/me/stats`,
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    throw error;
  }
};

/**
 * Get user achievements
 * @returns {Promise} List of achievements with unlock status
 */
export const getUserAchievements = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/users/me/achievements`,
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch achievements:', error);
    throw error;
  }
};

/**
 * Get activity feed
 * @param {number} limit - Number of activities to fetch (default: 10)
 * @returns {Promise} Recent user activities
 */
export const getActivityFeed = async (limit = 10) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/users/me/activity?limit=${limit}`,
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch activity feed:', error);
    throw error;
  }
};

export default {
  getUserStats,
  getUserAchievements,
  getActivityFeed,
};
