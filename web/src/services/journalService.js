/**
 * Journal Service - API communication for journal and mood tracking
 * Handles CRUD operations for journal entries and mood statistics
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token';

/**
 * Get authentication headers with JWT token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error('Not authenticated');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

/**
 * Create a new journal entry with AI analysis
 * @param {Object} journalData - Journal entry data
 * @param {string} journalData.content - Journal text content (10-5000 chars)
 * @param {string} journalData.mood - Selected mood (happy, sad, anxious, etc.)
 * @param {string} [journalData.title] - Optional title
 * @returns {Promise<Object>} Created journal entry with AI analysis
 */
export const createJournal = async (journalData) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/journals/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(journalData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create journal entry');
    }

    const data = await response.json();
    // Map _id to id for frontend compatibility
    return {
      ...data,
      id: data._id || data.id
    };
  } catch (error) {
    console.error('Create journal error:', error);
    throw error;
  }
};

/**
 * Get all journal entries for the current user
 * @param {number} skip - Number of entries to skip (pagination)
 * @param {number} limit - Maximum number of entries to return (max 100)
 * @returns {Promise<Array>} List of journal entries
 */
export const getJournals = async (skip = 0, limit = 50) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/journals/?skip=${skip}&limit=${limit}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch journal entries');
    }

    const data = await response.json();
    // Map _id to id for frontend compatibility
    return data.map(entry => ({
      ...entry,
      id: entry._id || entry.id
    }));
  } catch (error) {
    console.error('Get journals error:', error);
    throw error;
  }
};

/**
 * Get a single journal entry by ID
 * @param {string} id - Journal entry ID
 * @returns {Promise<Object>} Journal entry with AI analysis
 */
export const getJournalById = async (id) => {
  // Validate ID
  if (!id || id === 'undefined' || id === 'null') {
    throw new Error('Invalid journal entry ID format');
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/journals/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch journal entry');
    }

    const data = await response.json();
    // Map _id to id for frontend compatibility
    return {
      ...data,
      id: data._id || data.id
    };
  } catch (error) {
    console.error('Get journal by ID error:', error);
    throw error;
  }
};

/**
 * Update an existing journal entry
 * @param {string} id - Journal entry ID
 * @param {Object} updateData - Fields to update
 * @param {string} [updateData.content] - Updated content (triggers re-analysis)
 * @param {string} [updateData.mood] - Updated mood
 * @param {string} [updateData.title] - Updated title
 * @returns {Promise<Object>} Updated journal entry with fresh AI analysis
 */
export const updateJournal = async (id, updateData) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/journals/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update journal entry');
    }

    return await response.json();
  } catch (error) {
    console.error('Update journal error:', error);
    throw error;
  }
};

/**
 * Delete a journal entry permanently
 * @param {string} id - Journal entry ID
 * @returns {Promise<void>}
 */
export const deleteJournal = async (id) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/journals/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Try to parse error response, but handle cases where there's no body
      let errorMessage = 'Failed to delete journal entry';
      try {
        const error = await response.json();
        errorMessage = error.detail || errorMessage;
      } catch (e) {
        // No JSON body in error response
      }
      throw new Error(errorMessage);
    }

    // 204 No Content - success (no body to parse)
    return;
  } catch (error) {
    console.error('Delete journal error:', error);
    throw error;
  }
};

/**
 * Get mood and sentiment statistics for the current user
 * @returns {Promise<Object>} Statistics including mood counts, sentiment distribution, trends
 */
export const getMoodStatistics = async () => {
  try {
    const response = await fetch(`${API_URL}/api/v1/journals/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch mood statistics');
    }

    return await response.json();
  } catch (error) {
    console.error('Get mood statistics error:', error);
    throw error;
  }
};

export default {
  createJournal,
  getJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
  getMoodStatistics,
};
