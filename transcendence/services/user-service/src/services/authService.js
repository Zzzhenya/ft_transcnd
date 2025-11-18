const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

class AuthService {
  static async register(username, email, password, displayName = null) {
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
        password: hashedPassword,
        display_name: displayName || username
      });
      
      if (!newUser)
        throw new Error('User create failed');

      // ========== NEU: Default Avatar kopieren ==========
      try {
        const defaultAvatarPath = '/app/avatars/default.jpg';
        const userAvatarPath = `/app/avatars/${newUser.id}.jpg`;
        const avatarUrl = `/avatars/${newUser.id}.jpg`;

        // Prüfe ob default.jpg existiert
        await fs.access(defaultAvatarPath);
        
        // Kopiere default.jpg zu {userId}.jpg
        await fs.copyFile(defaultAvatarPath, userAvatarPath);
        logger.info(`✅ Avatar copied: ${userAvatarPath}`);

        // Update user in DB mit avatar_url
        const updateResponse = await fetch('http://database-service:3006/internal/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'Users',
            id: newUser.id,
            column: 'avatar',  // Oder 'avatar' - prüfe dein Schema!
            value: avatarUrl
          })
        });

        if (updateResponse.ok) {
          logger.info(`✅ Avatar URL updated for user ${newUser.id}`);
          newUser.avatar_url = avatarUrl; // Update auch im Objekt
        } else {
          logger.warn(`⚠️ Failed to update avatar URL for user ${newUser.id}`);
        }

      } catch (avatarError) {
        logger.error('⚠️ Error setting up avatar:', avatarError);
        // Avatar-Fehler ist nicht kritisch - User wurde trotzdem erstellt
      }
      // ========== ENDE NEU ==========

      // Generate JWT
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username, isGuest: false },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          display_name: newUser.display_name,
          avatar_url: newUser.avatar_url || null  // NEU: Avatar-URL zurückgeben
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
      console.log("username: ", usernameOrEmail, " password: ", password)
      let user = await User.findByUsername(usernameOrEmail);
      console.log("user: ", user)
      if (!user) {
        user = await User.findByEmail(usernameOrEmail);
        console.log("user: ", user)
      }

      if (!user) {
        throw new Error('Invalid credentials');
      }

      console.log(user)
      if (!user.password_hash){
        throw new Error('Password is required');

      }


      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);  // ← password_hash!
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username, isGuest: false },
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

  /* Direct db access limitation - temp

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
  }*/
}

module.exports = AuthService;