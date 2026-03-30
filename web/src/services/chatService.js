/**
 * Chat Service
 * API calls for AI wellness companion chat
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
 * Send a message to the AI wellness companion
 * @param {string} message - User message
 * @returns {Promise} AI response
 */
export const sendChatMessage = async (message) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/chat/message`,
      { message },
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to send chat message:', error);
    throw error;
  }
};

/**
 * Get chat history
 * @param {number} limit - Number of messages to fetch (default: 10)
 * @returns {Promise} Chat history
 */
export const getChatHistory = async (limit = 10) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/chat/history?limit=${limit}`,
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    throw error;
  }
};

/**
 * Clear all chat history
 * @returns {Promise} Deletion result
 */
export const clearChatHistory = async () => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/chat/history`,
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to clear chat history:', error);
    throw error;
  }
};

export default {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
};

// Conversation Management
export const getConversations = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/conversations`,
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    throw error;
  }
};

export const createConversation = async (title = 'New Conversation') => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/conversations`,
      { title },
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to create conversation:', error);
    throw error;
  }
};

export const getConversationMessages = async (conversationId, limit = 100) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/conversations/${conversationId}/messages?limit=${limit}`,
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch conversation messages:', error);
    throw error;
  }
};

export const updateConversation = async (conversationId, title) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/conversations/${conversationId}`,
      { title },
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to update conversation:', error);
    throw error;
  }
};

export const deleteConversation = async (conversationId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/conversations/${conversationId}`,
      createAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    throw error;
  }
};
