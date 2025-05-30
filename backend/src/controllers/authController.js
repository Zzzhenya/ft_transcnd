// src/controllers/authController.js
const AuthService = require('../services/authService');
const User = require('../models/User');

// Benutzer Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, password: '***' });
    
    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!username || !password) {
      return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich' });
    }
    
    // Benutzer validieren
    const user = await AuthService.validateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }
    
    // Token generieren
    const token = AuthService.generateToken(user);
    
    console.log('Login successful for user:', user.username);
    
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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

// Benutzer Registrierung
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Benutzername, E-Mail und Passwort sind erforderlich' });
    }
    
    const result = await AuthService.register(username, email, password);

    res.status(201).json({
      message: 'Benutzer erfolgreich registriert',
      access_token: result.token,
      user: result.user
    });
  } catch (error) {
    if (error.message === 'Benutzername bereits vergeben' || error.message === 'Email bereits registriert') {
      return res.status(409).json({ message: error.message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

// Benutzer Profil abrufen
const getProfile = async (req, res) => {
  try {
    const { password: _, ...userWithoutPassword } = req.userDetails;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

module.exports = {
  login,
  register,
  getProfile
};