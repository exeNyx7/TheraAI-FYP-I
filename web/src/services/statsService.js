/**
 * Stats Service
 * API calls for user statistics, achievements, and activity feed.
 * Uses the shared apiClient (axios instance with auth interceptors).
 */

import apiClient from '../apiClient';

/**
 * Get user statistics
 * @returns {Promise} User stats including streak, points, level, etc.
 */
export const getUserStats = async () => {
  try {
    const response = await apiClient.get('/users/me/stats');
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
    const response = await apiClient.get('/users/me/achievements');
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
    const response = await apiClient.get('/users/me/activity', { params: { limit } });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch activity feed:', error);
    throw error;
  }
};

/**
 * Get weekly mood summary (7-day trend + AI insight)
 * @returns {Promise}
 */
export const getWeeklySummary = async () => {
  try {
    const response = await apiClient.get('/users/me/weekly-summary');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch weekly summary:', error);
    throw error;
  }
};

export default {
  getUserStats,
  getUserAchievements,
  getActivityFeed,
  getWeeklySummary,
};
