// src/controllers/authController.js
const AuthService = require('../services/authService');
const User = require('../models/User');
const logger = require('../utils/logger');

// Benutzer Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    logger.info('authController.login called', { username });
    
    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!username || !password) {
      logger.warn('authController.login missing credentials', { username });
      return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich' });
    }
    
    // Benutzer validieren
    const user = await AuthService.validateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }
    
    // Token generieren
    const token = AuthService.generateToken(user);
    logger.info('authController.login successful', { userId: user.id });
    res.status(200).json({
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    logger.error('authController.login error', error);
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

// Benutzer Registrierung
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    logger.info('authController.register called', { username, email });
    
    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Benutzername, E-Mail und Passwort sind erforderlich' });
    }
    
    // FIXED: Verwende AuthService.register und speichere result
    const user = await AuthService.register(username, email, password);

    logger.info('authController.register successful', { userId: user.id });
    res.status(201).json({
      message: 'Benutzer erfolgreich registriert',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    logger.error('authController.register error', error);
    if (error.message && (
        error.message.includes('Username must be') ||
        error.message.includes('Username can only contain') ||
        error.message.includes('Invalid email format') ||
        error.message.includes('contains invalid characters')
    )) {
      return res.status(400).json({ message: error.message });
    }
    
    // Email/Username existiert schon → 409 Conflict
    if (error.message === 'Email already registered' || 
        error.message === 'Username already taken') {
      return res.status(409).json({ message: error.message });
    }
    
    // Alles andere → 500
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Benutzer Profil abrufen
const getProfile = async (req, res) => {
  try {
    const { password: _, ...userWithoutPassword } = req.userDetails;
  logger.info('authController.getProfile called', { userId: (req.user && req.user.userId) || null });
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    logger.error('authController.getProfile error', error);
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

module.exports = {
  login,
  register,
  getProfile
};