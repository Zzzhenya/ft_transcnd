// services/authService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

class AuthService {
  static async register(username, email, password) {
    try {
      // Prüfe ob Benutzer bereits existiert
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        throw new Error('Email bereits registriert');
      }

      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        throw new Error('Benutzername bereits vergeben');
      }

      // Passwort hashen
      const hashedPassword = await bcrypt.hash(password, 10);

      // Benutzer erstellen
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword
      });

      // JWT Token erstellen
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email
        },
        token
      };
    } catch (error) {
      console.error('Error in register:', error);
      throw error;
    }
  }

  // FEHLENDE FUNKTION HINZUGEFÜGT: validateUser
  static async validateUser(username, password) {
    try {
      console.log('validateUser called with:', { username, password: '***' });
      
      // Benutzer finden (erst nach username, dann email)
      let user = await User.findByUsername(username);
      
      // Falls nicht mit username gefunden, versuche email
      if (!user) {
        user = await User.findByEmail(username);
      }
      
      console.log('User found:', user ? user.username : 'null');
      
      if (!user) {
        return null; // User nicht gefunden
      }

      // Passwort prüfen
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        return null; // Falsches Passwort
      }

      return user; // Erfolgreiche Validierung
    } catch (error) {
      console.error('Error in validateUser:', error);
      return null;
    }
  }

  // FEHLENDE FUNKTION HINZUGEFÜGT: generateToken
  static generateToken(user) {
    return jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static async login(email, password) {
    try {
      // Benutzer finden
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Ungültige Anmeldedaten');
      }

      // Passwort prüfen
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Ungültige Anmeldedaten');
      }

      // JWT Token erstellen
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
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
        throw new Error('Benutzer nicht gefunden');
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
        throw new Error('Benutzer nicht gefunden');
      }

      // Altes Passwort prüfen
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Altes Passwort ist falsch');
      }

      // Neues Passwort hashen
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Passwort aktualisieren
      await User.update(userId, { password: hashedPassword });

      return { message: 'Passwort erfolgreich geändert' };
    } catch (error) {
      console.error('Error in updatePassword:', error);
      throw error;
    }
  }
}

module.exports = AuthService;