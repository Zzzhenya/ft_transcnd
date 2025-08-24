// services/userService.js
import axiosInstance from '../utils/axiosConfig';

class UserService {
  // Get user profile
  async getProfile() {
    try {
      const response = await axiosInstance.get('/api/users/profile');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile (username, email, bio)
  async updateProfile(profileData) {
    try {
      const response = await axiosInstance.put('/api/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(passwordData) {
    try {
      const response = await axiosInstance.put('/api/users/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Delete account
  async deleteAccount(password) {
    try {
      const response = await axiosInstance.delete('/api/users/profile', {
        data: { password }
      });
      return response.data;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  }

  // Upload avatar
  async uploadAvatar(formData) {
    try {
      const response = await axiosInstance.post('/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  // Get user stats
  async getUserStats() {
    try {
      const response = await axiosInstance.get('/api/users/stats');
      return response.data;
    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  }

  // Get match history
  async getMatchHistory(page = 1, limit = 10) {
    try {
      const response = await axiosInstance.get('/api/users/match-history', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Get match history error:', error);
      throw error;
    }
  }
}

export default new UserService();