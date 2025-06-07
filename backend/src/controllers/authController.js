// backend/src/controllers/authController.js
const AuthService = require('../services/authService');
const User = require('../models/User');
const config = require('../../config/config');

// Benutzer Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Benutzername und Passwort sind erforderlich' 
      });
    }
    
    // Benutzer validieren
    const result = await AuthService.login(username, password);
    
    // Handle email verification requirement
    if (!result.success && result.requiresVerification) {
      return res.status(403).json({
        message: result.message,
        requiresVerification: true,
        email: result.email,
        emailVerificationEnabled: config.isFeatureEnabled('EMAIL_VERIFICATION')
      });
    }
    
    if (!result.success) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }
    
    res.status(200).json({
      access_token: result.token,
      user: result.user,
      message: 'Login erfolgreich'
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Serverfehler', 
      error: config.isFeatureEnabled('DEBUG_MODE') ? error.message : 'Internal server error'
    });
  }
};

// Benutzer Registrierung
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Benutzername, E-Mail und Passwort sind erforderlich' 
      });
    }

    // Validierung
    if (username.length < 3) {
      return res.status(400).json({ 
        message: 'Benutzername muss mindestens 3 Zeichen lang sein' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Passwort muss mindestens 6 Zeichen lang sein' 
      });
    }

    // E-Mail Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Ungültige E-Mail-Adresse' 
      });
    }
    
    // Registrierung durchführen
    const result = await AuthService.register(username, email, password);

    // Erfolgreiche Registrierung
    const responseData = {
      message: result.message,
      user: result.user,
      emailVerificationEnabled: config.isFeatureEnabled('EMAIL_VERIFICATION')
    };

    // Token nur hinzufügen wenn Benutzer bereits verifiziert ist
    if (result.token) {
      responseData.access_token = result.token;
    }

    // Zusätzliche Info wenn E-Mail Verification erforderlich ist
    if (result.requiresVerification) {
      responseData.requiresVerification = true;
      responseData.nextStep = 'Bitte prüfe deine E-Mails und bestätige deine E-Mail-Adresse';
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Spezifische Fehler behandeln
    if (error.message === 'Email bereits registriert') {
      return res.status(409).json({ message: error.message });
    }
    if (error.message === 'Benutzername bereits vergeben') {
      return res.status(409).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Serverfehler bei der Registrierung', 
      error: config.isFeatureEnabled('DEBUG_MODE') ? error.message : 'Internal server error'
    });
  }
};

// E-Mail Verifizierung
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        message: 'Verifizierungstoken ist erforderlich' 
      });
    }

    // Feature Check
    if (!config.isFeatureEnabled('EMAIL_VERIFICATION')) {
      return res.status(400).json({ 
        message: 'E-Mail-Verifizierung ist deaktiviert' 
      });
    }

    const result = await AuthService.verifyEmail(token);

    res.status(200).json({
      message: result.message,
      user: result.user,
      access_token: result.token
    });
  } catch (error) {
    console.error('❌ Email verification error:', error);
    
    if (error.message === 'Ungültiger Verifizierungstoken') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Verifizierungstoken ist abgelaufen') {
      return res.status(400).json({ 
        message: error.message,
        canResend: true
      });
    }
    
    res.status(500).json({ 
      message: 'Serverfehler bei der E-Mail-Verifizierung', 
      error: config.isFeatureEnabled('DEBUG_MODE') ? error.message : 'Internal server error'
    });
  }
};

// E-Mail Verifizierung erneut senden
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'E-Mail-Adresse ist erforderlich' 
      });
    }

    // Feature Check
    if (!config.isFeatureEnabled('EMAIL_VERIFICATION')) {
      return res.status(400).json({ 
        message: 'E-Mail-Verifizierung ist deaktiviert' 
      });
    }

    const result = await AuthService.resendVerificationEmail(email);

    res.status(200).json({
      message: result.message
    });
  } catch (error) {
    console.error('❌ Resend verification email error:', error);
    
    if (error.message === 'Benutzer nicht gefunden') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'E-Mail ist bereits bestätigt') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Serverfehler beim Senden der E-Mail', 
      error: config.isFeatureEnabled('DEBUG_MODE') ? error.message : 'Internal server error'
    });
  }
};

// Benutzer Profil abrufen
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userDetails.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // Passwort und sensible Daten entfernen
    const { password, verification_token, ...userProfile } = user;
    
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ 
      message: 'Serverfehler', 
      error: config.isFeatureEnabled('DEBUG_MODE') ? error.message : 'Internal server error'
    });
  }
};

// Profil aktualisieren
const updateProfile = async (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    const userId = req.userDetails.id;
    
    const updateData = {};
    
    // Username Update
    if (username && username !== req.userDetails.username) {
      if (username.length < 3) {
        return res.status(400).json({ 
          message: 'Benutzername muss mindestens 3 Zeichen lang sein' 
        });
      }
      
      const isAvailable = await User.isUsernameAvailable(username, userId);
      if (!isAvailable) {
        return res.status(409).json({ 
          message: 'Benutzername bereits vergeben' 
        });
      }
      
      updateData.username = username;
    }
    
    // Email Update
    if (email && email !== req.userDetails.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'Ungültige E-Mail-Adresse' 
        });
      }
      
      const isAvailable = await User.isEmailAvailable(email, userId);
      if (!isAvailable) {
        return res.status(409).json({ 
          message: 'E-Mail bereits registriert' 
        });
      }
      
      updateData.email = email;
      
      // Wenn E-Mail geändert wird und Verification aktiv ist, wieder auf unverified setzen
      if (config.isFeatureEnabled('EMAIL_VERIFICATION')) {
        updateData.email_verified = false;
        // TODO: Neue Verifizierungs-E-Mail senden
      }
    }
    
    // Avatar Update
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        message: 'Keine Änderungen gefunden' 
      });
    }
    
    const updatedUser = await User.update(userId, updateData);
    const { password, verification_token, ...userProfile } = updatedUser;
    
    res.status(200).json({
      message: 'Profil erfolgreich aktualisiert',
      user: userProfile
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ 
      message: 'Serverfehler beim Aktualisieren des Profils', 
      error: config.isFeatureEnabled('DEBUG_MODE') ? error.message : 'Internal server error'
    });
  }
};

// Passwort ändern
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userDetails.id;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Altes und neues Passwort sind erforderlich' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Neues Passwort muss mindestens 6 Zeichen lang sein' 
      });
    }
    
    const result = await AuthService.updatePassword(userId, oldPassword, newPassword);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Change password error:', error);
    
    if (error.message === 'Altes Passwort ist falsch') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Serverfehler beim Ändern des Passworts', 
      error: config.isFeatureEnabled('DEBUG_MODE') ? error.message : 'Internal server error'
    });
  }
};

// Feature Status abrufen
const getFeatureStatus = async (req, res) => {
  try {
    const status = {
      emailVerification: AuthService.getEmailVerificationStatus(),
      features: {
        chat: config.isFeatureEnabled('CHAT_SYSTEM'),
        gameStats: config.isFeatureEnabled('GAME_STATISTICS'),
        avatars: config.isFeatureEnabled('USER_AVATARS'),
        oauth: config.isFeatureEnabled('OAUTH_LOGIN'),
        twoFactor: config.isFeatureEnabled('TWO_FACTOR_AUTH')
      },
      debugMode: config.isFeatureEnabled('DEBUG_MODE')
    };
    
    res.status(200).json(status);
  } catch (error) {
    console.error('❌ Get feature status error:', error);
    res.status(500).json({ 
      message: 'Serverfehler', 
      error: config.isFeatureEnabled('DEBUG_MODE') ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  login,
  register,
  verifyEmail,
  resendVerificationEmail,
  getProfile,
  updateProfile,
  changePassword,
  getFeatureStatus
};