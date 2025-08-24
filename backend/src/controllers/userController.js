// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;

class UserController {
  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Don't send password and sensitive data
      const userProfile = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        created_at: user.created_at,
        updated_at: user.updated_at,
        is_two_factor_auth_enabled: user.is_two_factor_auth_enabled
      };

      res.json(userProfile);
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const { username, email, bio } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!username || !email) {
        return res.status(400).json({ message: 'Username and email are required' });
      }

      // Check if username or email already exists (excluding current user)
      const existingUser = await User.findByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const existingEmail = await User.findByEmail(email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Update user
      const updatedUser = await User.update(userId, { 
        username, 
        email,
        bio: bio || null,
        updated_at: new Date()
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return updated profile without sensitive data
      const userProfile = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        is_two_factor_auth_enabled: updatedUser.is_two_factor_auth_enabled
      };

      res.json(userProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Upload avatar
  static async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.user.id;
      const avatarPath = `/uploads/avatars/${req.file.filename}`;

      // Get current user to check if they have an existing avatar
      const currentUser = await User.findById(userId);
      if (currentUser && currentUser.avatar) {
        // Delete old avatar file
        try {
          const oldAvatarPath = path.join(__dirname, '../../uploads/avatars/', path.basename(currentUser.avatar));
          await fs.unlink(oldAvatarPath);
        } catch (error) {
          console.log('Could not delete old avatar:', error.message);
        }
      }

      // Update user avatar in database
      const updatedUser = await User.update(userId, { avatar: avatarPath });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ 
        message: 'Avatar uploaded successfully',
        avatar: avatarPath 
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Get user stats (games, wins, losses, etc.)
  static async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      
      // TODO: Implement when game tables are created
      // For now, return mock data
      const stats = {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalScore: 0,
        averageScore: 0
      };

      res.json(stats);
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Get user match history
  static async getMatchHistory(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // TODO: Implement when game tables are created
      // For now, return empty array
      const matchHistory = {
        matches: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0
      };

      res.json(matchHistory);
    } catch (error) {
      console.error('Error getting match history:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Delete user account
  static async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: 'Password is required to delete account' });
      }

      // Get user with password for verification
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify password before deletion
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Invalid password' });
      }

      // Delete user avatar if exists
      if (user.avatar) {
        try {
          const avatarPath = path.join(__dirname, '../../uploads/avatars/', path.basename(user.avatar));
          await fs.unlink(avatarPath);
        } catch (error) {
          console.log('Could not delete avatar file:', error.message);
        }
      }

      // Delete user from database
      await User.delete(userId);

      console.log(`User account deleted: ${user.username} (ID: ${userId})`);
      
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      // Get user with current password
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await User.update(userId, { 
        password: hashedNewPassword,
        updated_at: new Date()
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = UserController;