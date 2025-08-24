// services/userService.js
import axios from '../utils/axiosConfig';

class UserService {
  // Get current user profile
  static async getProfile() {
    try {
      const response = await axiosInstance.get('/api/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Update user profile
  static async updateProfile(profileData) {
    try {
      const response = await axiosInstance.put('/api/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Upload avatar
  static async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await axios.post('/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  // Get user statistics
  static async getUserStats() {
    try {
      const response = await axios.get('/api/users/stats');
      return response.data;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  },

  // Get match history
  static async getMatchHistory(page = 1, limit = 10) {
    try {
      const response = await axios.get(`/api/users/match-history?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Upload avatar error:', error);
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
  static async deleteAccount(password) {
    try {
      const response = await axios.delete('/api/users/profile', {
        data: { password }
      });
      return response.data;
    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  }

  // Change password
  static async changePassword(currentPassword, newPassword) {
    try {
      const response = await axios.put('/api/users/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
}

export default UserService;