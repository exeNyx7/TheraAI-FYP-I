/**
 * Chat Service
 * API calls for AI wellness companion chat and conversation management.
 * Uses the shared apiClient (axios instance with auth interceptors).
 */

import apiClient from './apiClient';

/**
 * Send a message to the AI wellness companion
 * @param {string} message - User message
 * @returns {Promise} AI response
 */
export const sendChatMessage = async (message) => {
  try {
    const response = await apiClient.post('/chat/message', { message });
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
    const response = await apiClient.get('/chat/history', { params: { limit } });
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
    const response = await apiClient.delete('/chat/history');
    return response.data;
  } catch (error) {
    console.error('Failed to clear chat history:', error);
    throw error;
  }
};

// ── Conversation Management ───────────────────────────────────────────────────

export const getConversations = async () => {
  try {
    const response = await apiClient.get('/conversations');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    throw error;
  }
};

export const createConversation = async (title = 'New Conversation') => {
  try {
    const response = await apiClient.post('/conversations', { title });
    return response.data;
  } catch (error) {
    console.error('Failed to create conversation:', error);
    throw error;
  }
};

export const getConversationMessages = async (conversationId, limit = 100) => {
  try {
    const response = await apiClient.get(
      `/conversations/${conversationId}/messages`,
      { params: { limit } }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch conversation messages:', error);
    throw error;
  }
};

export const updateConversation = async (conversationId, title) => {
  try {
    const response = await apiClient.put(`/conversations/${conversationId}`, { title });
    return response.data;
  } catch (error) {
    console.error('Failed to update conversation:', error);
    throw error;
  }
};

export const deleteConversation = async (conversationId) => {
  try {
    const response = await apiClient.delete(`/conversations/${conversationId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    throw error;
  }
};

export default {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
  getConversations,
  createConversation,
  getConversationMessages,
  updateConversation,
  deleteConversation,
};
