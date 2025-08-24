// services/userService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add authorization token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class UserService {
  // Get user profile
  static async getProfile() {
    try {
      const response = await apiClient.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(profileData) {
    try {
      const response = await apiClient.put('/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Change password
  static async changePassword(passwordData) {
    try {
      const response = await apiClient.put('/users/password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Delete user account
  static async deleteAccount(password) {
    try {
      const response = await apiClient.delete('/users/profile', {
        data: { password }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  // Upload avatar
  static async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await apiClient.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // Longer timeout for file uploads
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }

  // Get user stats
  static async getUserStats() {
    try {
      const response = await apiClient.get('/users/stats');
      return response.data;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Get match history
  static async getMatchHistory(page = 1, limit = 10) {
    try {
      const response = await apiClient.get(`/users/match-history?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting match history:', error);
      throw error;
    }
  }

  // Validate file before upload
  static validateAvatarFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!file) {
      throw new Error('Keine Datei ausgewählt');
    }
    
    if (file.size > maxSize) {
      throw new Error('Datei zu groß. Maximale Größe: 5MB');
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Ungültiger Dateityp. Erlaubt: JPEG, PNG, GIF, WebP');
    }
    
    return true;
  }

  // Get avatar URL (handles relative paths)
  static getAvatarUrl(avatarPath) {
    if (!avatarPath) {
      return '/default-avatar.png';
    }
    
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    
    // Remove leading slash if present
    const cleanPath = avatarPath.startsWith('/') ? avatarPath.substring(1) : avatarPath;
    
    return `${API_URL.replace('/api', '')}/${cleanPath}`;
  }
}

export default UserService;