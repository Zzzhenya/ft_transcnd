// frontend/src/services/userService.js
import axiosInstance from '../utils/axiosConfig';

export const userService = {
  // Get user profile
  getProfile: async () => {
    try {
      const response = await axiosInstance.get('/api/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await axiosInstance.put('/api/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Upload user avatar
  uploadAvatar: async (formData) => {
    try {
      const response = await axiosInstance.post('/api/users/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  },

  // Get user statistics
  getUserStats: async () => {
    try {
      const response = await axiosInstance.get('/api/users/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  },

  // Get match history
  getMatchHistory: async (page = 1, limit = 10) => {
    try {
      const response = await axiosInstance.get(`/api/users/match-history?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching match history:', error);
      throw error;
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await axiosInstance.put('/api/users/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  // Delete user account
  deleteAccount: async (deleteData) => {
    try {
      const response = await axiosInstance.delete('/api/users/account', {
        data: deleteData
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },

  // Get user by ID (for admin purposes)
  getUserById: async (userId) => {
    try {
      const response = await axiosInstance.get(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  },

  // Search users
  searchUsers: async (searchTerm) => {
    try {
      const response = await axiosInstance.get(`/api/users/search?q=${encodeURIComponent(searchTerm)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
};