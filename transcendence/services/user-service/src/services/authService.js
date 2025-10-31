const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

class AuthService {
  static async register(username, email, password) {
    try {
      // Check if user already exists
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        throw new Error('Email already registered');
      }

      const existingUsername = await User.findByUsername(username);

      logger.info(existingUsername);

      if (existingUsername) {
        throw new Error('Username already taken');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await User.create({
        username,
        email,
        password_hash: hashedPassword  // ← password_hash!
      });

      // Generate JWT
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          display_name: newUser.display_name || newUser.username
        },
        token
      };
    } catch (error) {
      console.error('Error in register:', error);
      throw error;
    }
  }

  static async login(usernameOrEmail, password) {
    try {
      // Find user by username or email
      let user = await User.findByUsername(usernameOrEmail);
      if (!user) {
        user = await User.findByEmail(usernameOrEmail);
      }

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);  // ← password_hash!
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          display_name: user.display_name || user.username
        },
        token
      };
    } catch (error) {
      console.error('Error in login:', error);
      throw error;
    }
  }

  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email
      };
    } catch (error) {
      console.error('Error in verifyToken:', error);
      throw error;
    }
  }

  static async updatePassword(userId, oldPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check old password
      const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);  // ← password_hash!
      if (!isValidPassword) {
        throw new Error('Old password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await User.update(userId, { password_hash: hashedPassword });  // ← password_hash!

      return { message: 'Password successfully changed' };
    } catch (error) {
      console.error('Error in updatePassword:', error);
      throw error;
    }
  }
}

module.exports = AuthService;