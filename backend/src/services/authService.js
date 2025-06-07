// backend/src/services/authService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('./emailService');
const config = require('../../config/config');

class AuthService {
  static async register(username, email, password) {
    try {
      console.log(`🔐 Registration attempt for: ${username} (${email})`);
      
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

      // E-Mail Verification Setup
      let emailVerified = true; // Default: verified
      let verificationToken = null;
      let verificationExpires = null;

      if (config.isFeatureEnabled('EMAIL_VERIFICATION')) {
        console.log('📧 Email verification is ENABLED');
        emailVerified = false;
        verificationToken = emailService.generateVerificationToken();
        // Token expires in 24 hours
        verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else {
        console.log('📧 Email verification is DISABLED - auto-verifying user');
      }

      // Benutzer erstellen
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        email_verified: emailVerified,
        verification_token: verificationToken,
        verification_expires: verificationExpires
      });

      console.log(`✅ User created: ${newUser.id} (${username})`);

      // E-Mail senden wenn Feature aktiviert ist
      if (config.isFeatureEnabled('EMAIL_VERIFICATION')) {
        try {
          await emailService.sendVerificationEmail(email, username, verificationToken);
          console.log(`📧 Verification email sent to: ${email}`);
        } catch (emailError) {
          console.error('❌ Failed to send verification email:', emailError.message);
          // Optional: User löschen wenn E-Mail nicht gesendet werden kann
          // await User.delete(newUser.id);
          // throw new Error('Registrierung fehlgeschlagen: E-Mail konnte nicht gesendet werden');
        }
      }

      // JWT Token nur erstellen wenn Benutzer verifiziert ist oder Verification deaktiviert
      let token = null;
      if (emailVerified) {
        token = jwt.sign(
          { userId: newUser.id, username: newUser.username },
          config.jwt.secret,
          { expiresIn: config.jwt.expiresIn }
        );
      }

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          email_verified: emailVerified
        },
        token,
        requiresVerification: !emailVerified,
        message: emailVerified ? 
          'Registrierung erfolgreich' : 
          'Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.'
      };
    } catch (error) {
      console.error('❌ Error in register:', error);
      throw error;
    }
  }

  static async login(username, password) {
    try {
      console.log(`🔐 Login attempt for: ${username}`);
      
      // Benutzer finden (username oder email)
      let user = await User.findByUsername(username);
      if (!user) {
        user = await User.findByEmail(username);
      }
      
      if (!user) {
        throw new Error('Ungültige Anmeldedaten');
      }

      // Passwort prüfen
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Ungültige Anmeldedaten');
      }

      // E-Mail Verification Check
      if (config.isFeatureEnabled('EMAIL_VERIFICATION') && !user.email_verified) {
        console.log(`❌ Login denied for ${username}: Email not verified`);
        return {
          success: false,
          requiresVerification: true,
          message: 'Bitte bestätige zuerst deine E-Mail-Adresse',
          email: user.email
        };
      }

      console.log(`✅ Login successful for: ${username}`);

      // JWT Token erstellen
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          email_verified: user.email_verified
        },
        token
      };
    } catch (error) {
      console.error('❌ Error in login:', error);
      throw error;
    }
  }

  static async verifyEmail(token) {
    try {
      console.log(`📧 Email verification attempt with token: ${token.substring(0, 8)}...`);
      
      if (!config.isFeatureEnabled('EMAIL_VERIFICATION')) {
        throw new Error('E-Mail-Verifizierung ist deaktiviert');
      }

      // Benutzer mit diesem Token finden
      const user = await User.findByVerificationToken(token);
      if (!user) {
        throw new Error('Ungültiger Verifizierungstoken');
      }

      // Token Ablauf prüfen
      if (user.verification_expires && new Date() > new Date(user.verification_expires)) {
        throw new Error('Verifizierungstoken ist abgelaufen');
      }

      // Benutzer als verifiziert markieren
      await User.update(user.id, {
        email_verified: true,
        verification_token: null,
        verification_expires: null
      });

      console.log(`✅ Email verified for user: ${user.username}`);

      // Welcome E-Mail senden
      try {
        await emailService.sendWelcomeEmail(user.email, user.username);
      } catch (emailError) {
        console.error('❌ Failed to send welcome email:', emailError.message);
        // Welcome E-Mail Fehler soll Verification nicht blockieren
      }

      // JWT Token erstellen
      const jwtToken = jwt.sign(
        { userId: user.id, username: user.username },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          email_verified: true
        },
        token: jwtToken,
        message: 'E-Mail erfolgreich bestätigt'
      };
    } catch (error) {
      console.error('❌ Error in verifyEmail:', error);
      throw error;
    }
  }

  static async resendVerificationEmail(email) {
    try {
      console.log(`📧 Resend verification email for: ${email}`);
      
      if (!config.isFeatureEnabled('EMAIL_VERIFICATION')) {
        throw new Error('E-Mail-Verifizierung ist deaktiviert');
      }

      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Benutzer nicht gefunden');
      }

      if (user.email_verified) {
        throw new Error('E-Mail ist bereits bestätigt');
      }

      // Neuen Token generieren
      const verificationToken = emailService.generateVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await User.update(user.id, {
        verification_token: verificationToken,
        verification_expires: verificationExpires
      });

      // E-Mail senden
      await emailService.sendVerificationEmail(email, user.username, verificationToken);

      console.log(`✅ Verification email resent to: ${email}`);

      return {
        success: true,
        message: 'Bestätigungs-E-Mail wurde erneut gesendet'
      };
    } catch (error) {
      console.error('❌ Error in resendVerificationEmail:', error);
      throw error;
    }
  }

  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new Error('Benutzer nicht gefunden');
      }

      // E-Mail Verification Check für bestehende Sessions
      if (config.isFeatureEnabled('EMAIL_VERIFICATION') && !user.email_verified) {
        throw new Error('E-Mail-Adresse muss bestätigt werden');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verified
      };
    } catch (error) {
      console.error('❌ Error in verifyToken:', error);
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
      console.error('❌ Error in updatePassword:', error);
      throw error;
    }
  }

  // Helper method um Feature Status zu checken
  static getEmailVerificationStatus() {
    return {
      enabled: config.isFeatureEnabled('EMAIL_VERIFICATION'),
      emailServiceReady: emailService.isAvailable()
    };
  }

  // Legacy methods für Kompatibilität
  static async validateUser(username, password) {
    const result = await this.login(username, password);
    return result.success ? result.user : null;
  }

  static generateToken(user) {
    return jwt.sign(
      { userId: user.id, username: user.username },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }
}

module.exports = AuthService;