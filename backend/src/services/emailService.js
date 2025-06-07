// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../../config/config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Nur initialisieren wenn E-Mail Verification aktiviert ist
    if (!config.isFeatureEnabled('EMAIL_VERIFICATION')) {
      console.log('📧 Email Service: DISABLED (EMAIL_VERIFICATION=false)');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.auth.user,
          pass: config.email.smtp.auth.pass
        },
        tls: {
          rejectUnauthorized: false // Für Entwicklung
        }
      });

      console.log('📧 Email Service: ENABLED');
      
      // Test connection (optional)
      this.verifyConnection();
    } catch (error) {
      console.error('❌ Email Service initialization failed:', error.message);
    }
  }

  async verifyConnection() {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      return false;
    }
  }

  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateVerificationLink(token) {
    const baseUrl = process.env.FRONTEND_URL || 'https://ft_transcendence';
    return `${baseUrl}/verify-email?token=${token}`;
  }

  async sendVerificationEmail(email, username, token) {
    // Feature Check
    if (!config.isFeatureEnabled('EMAIL_VERIFICATION')) {
      console.log('📧 Email verification skipped (disabled)');
      return { success: true, message: 'Email verification disabled' };
    }

    if (!this.transporter) {
      throw new Error('Email service not properly configured');
    }

    const verificationLink = this.generateVerificationLink(token);
    
    const mailOptions = {
      from: config.email.templates.verification.from,
      to: email,
      subject: config.email.templates.verification.subject,
      html: this.getVerificationEmailTemplate(username, verificationLink),
      text: `Hallo ${username},\n\nBitte bestätige deine E-Mail-Adresse: ${verificationLink}\n\nDieser Link ist 24 Stunden gültig.\n\nTranscendence Team`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  getVerificationEmailTemplate(username, verificationLink) {
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>E-Mail bestätigen - Transcendence</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid #007bff;
            }
            .logo {
                font-size: 2.5em;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }
            .title {
                color: #333;
                margin-bottom: 20px;
            }
            .button {
                display: inline-block;
                padding: 15px 30px;
                background-color: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
                transition: background-color 0.3s;
            }
            .button:hover {
                background-color: #0056b3;
            }
            .info-box {
                background-color: #f8f9fa;
                padding: 20px;
                border-left: 4px solid #007bff;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 0.9em;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏓</div>
                <h1 style="color: #007bff; margin: 0;">TRANSCENDENCE</h1>
            </div>
            
            <h2 class="title">Hallo ${username}!</h2>
            
            <p>Willkommen bei Transcendence! Um dein Konto zu aktivieren, musst du deine E-Mail-Adresse bestätigen.</p>
            
            <div style="text-align: center;">
                <a href="${verificationLink}" class="button">
                    📧 E-Mail bestätigen
                </a>
            </div>
            
            <div class="info-box">
                <h3>📋 Was passiert als nächstes?</h3>
                <ul>
                    <li>Klicke auf den Button oben</li>
                    <li>Du wirst zu Transcendence weitergeleitet</li>
                    <li>Dein Konto wird automatisch aktiviert</li>
                    <li>Du kannst dich sofort einloggen und spielen!</li>
                </ul>
            </div>
            
            <div class="warning">
                <strong>⚠️ Wichtig:</strong> Dieser Link ist nur 24 Stunden gültig. Falls er abgelaufen ist, kannst du dir einen neuen Link zusenden lassen.
            </div>
            
            <p>Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                <a href="${verificationLink}">${verificationLink}</a>
            </p>
            
            <div class="footer">
                <p><strong>Transcendence Team</strong></p>
                <p>Du hast diese E-Mail erhalten, weil du dich bei Transcendence registriert hast.</p>
                <p style="font-size: 0.8em; color: #999;">
                    Falls du dich nicht registriert hast, ignoriere diese E-Mail einfach.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async sendWelcomeEmail(email, username) {
    // Feature Check
    if (!config.isFeatureEnabled('EMAIL_VERIFICATION')) {
      return { success: true, message: 'Welcome email skipped (verification disabled)' };
    }

    if (!this.transporter) {
      console.log('📧 Welcome email skipped (transporter not configured)');
      return { success: true, message: 'Welcome email skipped' };
    }

    const mailOptions = {
      from: config.email.templates.verification.from,
      to: email,
      subject: 'Willkommen bei Transcendence! 🏓',
      html: this.getWelcomeEmailTemplate(username),
      text: `Willkommen bei Transcendence, ${username}!\n\nDeine E-Mail wurde erfolgreich bestätigt. Du kannst jetzt alle Features nutzen!\n\nViel Spaß beim Spielen!\nTranscendence Team`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        message: 'Welcome email sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      // Welcome email failure should not break the flow
      return { success: false, message: 'Welcome email failed', error: error.message };
    }
  }

  getWelcomeEmailTemplate(username) {
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Willkommen bei Transcendence!</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 3em;
                margin-bottom: 10px;
            }
            .success-badge {
                background-color: #28a745;
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                display: inline-block;
                margin: 20px 0;
                font-weight: bold;
            }
            .feature-list {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎉</div>
                <h1 style="color: #28a745;">Willkommen bei Transcendence!</h1>
                <div class="success-badge">✅ E-Mail bestätigt</div>
            </div>
            
            <h2>Hallo ${username}!</h2>
            
            <p>Deine E-Mail wurde erfolgreich bestätigt! Du kannst jetzt alle Features von Transcendence nutzen.</p>
            
            <div class="feature-list">
                <h3>🚀 Was du jetzt machen kannst:</h3>
                <ul>
                    <li>🏓 <strong>Pong spielen</strong> - Fordere andere Spieler heraus!</li>
                    <li>💬 <strong>Chatten</strong> - Unterhalte dich mit anderen Spielern</li>
                    <li>📊 <strong>Statistiken</strong> - Verfolge deine Fortschritte</li>
                    <li>👤 <strong>Profil anpassen</strong> - Lade dein Avatar hoch</li>
                    <li>🏆 <strong>Leaderboard</strong> - Werde zum Pong-Champion!</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://ft_transcendence" style="display: inline-block; padding: 15px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    🎮 Jetzt spielen!
                </a>
            </div>
            
            <div class="footer">
                <p><strong>Viel Spaß beim Spielen!</strong></p>
                <p>Das Transcendence Team</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Utility method to check if email service is available
  isAvailable() {
    return config.isFeatureEnabled('EMAIL_VERIFICATION') && this.transporter !== null;
  }

  // Method to get service status
  getStatus() {
    return {
      enabled: config.isFeatureEnabled('EMAIL_VERIFICATION'),
      configured: this.transporter !== null,
      ready: this.isAvailable()
    };
  }
}

module.exports = new EmailService();