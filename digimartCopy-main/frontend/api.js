// services/api.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Base URL for your backend API
const BASE_URL = 'http://192.168.43.219:5000/api';
 // Your current network IP

// Create axios instance with base configuration
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  // Register user
  register: async (userData) => {
    try {
      // For forms with files, use FormData
      if (userData.role === 'seller' || userData.role === 'investor') {
        const formData = new FormData();
        
        // Add all text fields
        Object.keys(userData).forEach(key => {
          if (key !== 'businessImage' && key !== 'idImage' && key !== 'bankProofImage' && userData[key] !== null) {
            formData.append(key, userData[key]);
          }
        });
        
        // Add image files if they exist
        if (userData.businessImage) {
          formData.append('businessImage', {
            uri: userData.businessImage,
            type: 'image/jpeg',
            name: 'business.jpg'
          });
        }
        if (userData.idImage) {
          formData.append('idImage', {
            uri: userData.idImage,
            type: 'image/jpeg',
            name: 'id.jpg'
          });
        }
        if (userData.bankProofImage) {
          formData.append('bankProofImage', {
            uri: userData.bankProofImage,
            type: 'image/jpeg',
            name: 'bankproof.jpg'
          });
        }
        
        const response = await api.post('/users/register', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } else {
        // For non-file registration (customer, affiliate)
        const response = await api.post('/users/register', userData);
        return response.data;
      }
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/users/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/users/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Reset password
  resetPassword: async (verificationCode, newPassword) => {
    try {
      const response = await api.post('/users/reset-password', { 
        verificationCode, 
        newPassword 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Update user profile
};

// Store token securely
export const storeToken = async (token) => {
  try {
    await SecureStore.setItemAsync('token', token);
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

// Remove token
export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync('token');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// Get token
export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync('token');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Investor API
export const investorAPI = {
  // Save investment preferences
  savePreferences: async (preferences) => {
    try {
      const response = await api.post('/investor-connections/preferences', preferences);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Get investment preferences
  getPreferences: async () => {
    try {
      const response = await api.get('/investor-connections/preferences');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Get all investors with preferences
  getAllInvestors: async () => {
    try {
      const response = await api.get('/investor-connections/all-with-preferences');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Send connection request
  sendConnectionRequest: async (investorId) => {
    try {
      const response = await api.post('/investor-connections/request', { investor_id: investorId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Get seller's connections
  getSellerConnections: async (status = 'all') => {
    try {
      const response = await api.get(`/investor-connections/seller/connections?status=${status}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Get investor's connection requests
  getInvestorRequests: async (status = 'all') => {
    try {
      const response = await api.get(`/investor-connections/investor/requests?status=${status}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Respond to connection request
  respondToRequest: async (connectionId, status) => {
    try {
      const response = await api.post('/investor-connections/respond', { 
        connection_id: connectionId,
        status 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // List funding requests (investor view)
  listRequests: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await api.get(`/investor/requests${queryParams ? `?${queryParams}` : ''}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Get single request details
  getRequest: async (requestId) => {
    try {
      const response = await api.get(`/investor/requests/${requestId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Update request status
  updateStatus: async (requestId, status) => {
    try {
      const response = await api.patch(`/investor/requests/${requestId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Upload payment slip/document
  uploadAgreement: async (requestId, fileUri, docType = 'payment_slip') => {
    try {
      const formData = new FormData();
      formData.append('document', {
        uri: fileUri,
        type: 'application/pdf',
        name: `${docType}_${Date.now()}.pdf`
      });
      formData.append('documentType', docType);

      const response = await api.post(`/investor/requests/${requestId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // List documents
  listDocuments: async (requestId) => {
    try {
      const response = await api.get(`/investor/requests/${requestId}/documents`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Delete document
  deleteDocument: async (requestId, documentId) => {
    try {
      const response = await api.delete(`/investor/requests/${requestId}/documents/${documentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Send message
  sendMessage: async (requestId, message) => {
    try {
      const response = await api.post(`/investor/requests/${requestId}/messages`, { message });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // List messages
  listMessages: async (requestId, options = {}) => {
    try {
      const queryParams = new URLSearchParams(options).toString();
      const response = await api.get(`/investor/requests/${requestId}/messages${queryParams ? `?${queryParams}` : ''}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
};

// Investment Requests API (funding requests)
export const investmentRequestsAPI = {
  // Get a single funding request
  getRequest: async (requestId) => {
    try {
      const response = await api.get(`/investment-requests/${requestId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Documents
  listDocuments: async (requestId) => {
    try {
      const response = await api.get(`/investment-requests/${requestId}/documents`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  uploadDocument: async (requestId, fileUri, mimeType = 'application/pdf', name = `document_${Date.now()}.pdf`, docType = 'slip') => {
    try {
      const formData = new FormData();
      formData.append('document', { uri: fileUri, type: mimeType, name });
      formData.append('request_id', String(requestId));
      formData.append('doc_type', docType);
      const response = await api.post(`/investment-requests/${requestId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Messages
  listMessages: async (requestId) => {
    try {
      const response = await api.get(`/investment-requests/${requestId}/messages`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  sendMessage: async (requestId, message) => {
    try {
      const response = await api.post(`/investment-requests/${requestId}/messages`, { message });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
};

// Export BASE_URL for use in other files
export { BASE_URL };

export default api;