// src/services/authService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

class AuthService {
  // Benutzer validieren (für Login)
  static async validateUser(username, password) {
    const user = await User.findByUsername(username);
    
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }
    
    // Passwort aus der Rückgabe entfernen
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // JWT-Token erstellen
  static generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
  }

  // Benutzer registrieren
  static async registerUser(userData) {
    try {
      // Überprüfen, ob der Benutzer bereits existiert
      const existingUser = await User.findByUsername(userData.username);
      
      if (existingUser) {
        throw new Error('Benutzername wird bereits verwendet');
      }
      
      // Neuen Benutzer erstellen
      const newUser = await User.create(userData);
      
      // Passwort aus der Rückgabe entfernen
      const { password: _, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuthService;