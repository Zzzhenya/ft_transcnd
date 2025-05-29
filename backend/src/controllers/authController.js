// src/controllers/authController.js
const AuthService = require('../services/authService');

// Benutzer Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!username || !password) {
      return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich' });
    }
    
    // WICHTIG: AuthService.login verwendet email, nicht username!
    // Entweder AuthService anpassen oder hier email verwenden
    const result = await AuthService.login(username, password); // Annahme: username=email
    
    res.status(200).json({
      access_token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login Error:', error);
    if (error.message === 'Ungültige Anmeldedaten') {
      return res.status(401).json({ message: error.message });
    }
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
    
    // AuthService.register verwenden
    const result = await AuthService.register(username, email, password);

    res.status(201).json({
      message: 'Benutzer erfolgreich registriert',
      access_token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Register Error:', error);
    if (error.message.includes('bereits')) {
      return res.status(409).json({ message: error.message });
    }
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