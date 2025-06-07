// config/config.js
// Zentrale Konfiguration für alle Features

const config = {
  // =================
  // FEATURE SWITCHES
  // =================
  features: {
    // E-Mail Verifizierung
    EMAIL_VERIFICATION: {
      enabled: process.env.ENABLE_EMAIL_VERIFICATION === 'true' || false,
      description: 'Aktiviert E-Mail Verifizierung bei der Registrierung'
    },
    
    // Weitere Features für die Zukunft
    TWO_FACTOR_AUTH: {
      enabled: process.env.ENABLE_2FA === 'true' || false,
      description: 'Zwei-Faktor-Authentifizierung'
    },
    
    OAUTH_LOGIN: {
      enabled: process.env.ENABLE_OAUTH === 'true' || false,
      description: 'OAuth Login (Google, GitHub, etc.)'
    },
    
    CHAT_SYSTEM: {
      enabled: process.env.ENABLE_CHAT === 'true' || true, // standardmäßig an
      description: 'Chat System'
    },
    
    GAME_STATISTICS: {
      enabled: process.env.ENABLE_GAME_STATS === 'true' || true,
      description: 'Spiel-Statistiken und Leaderboard'
    },
    
    USER_AVATARS: {
      enabled: process.env.ENABLE_AVATARS === 'true' || true,
      description: 'Benutzer Avatar Upload'
    },
    
    DEBUG_MODE: {
      enabled: process.env.DEBUG_MODE === 'true' || false,
      description: 'Debug-Modus mit erweiterten Logs'
    }
  },

  // =================
  // E-MAIL SETTINGS
  // =================
  email: {
    // SMTP Settings
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || ''
      }
    },
    
    // E-Mail Templates
    templates: {
      verification: {
        subject: 'Bestätige deine E-Mail-Adresse - Transcendence',
        from: process.env.EMAIL_FROM || 'noreply@transcendence.com'
      }
    },
    
    // Verification Settings
    verification: {
      tokenExpiry: process.env.EMAIL_TOKEN_EXPIRY || '24h',
      resendDelay: parseInt(process.env.EMAIL_RESEND_DELAY) || 60000 // 1 minute
    }
  },

  // =================
  // DATABASE SETTINGS
  // =================
  database: {
    type: process.env.DB_TYPE || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'transcendence',
    password: process.env.DB_PASSWORD || 'secretpassword',
    database: process.env.DB_NAME || 'transcendence_db'
  },

  // =================
  // JWT SETTINGS
  // =================
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // =================
  // APP SETTINGS
  // =================
  app: {
    port: parseInt(process.env.PORT) || 5000,
    cors: {
      origin: process.env.CORS_ORIGIN || 'https://ft_transcendence',
      credentials: true
    },
    rateLimiting: {
      enabled: process.env.ENABLE_RATE_LIMITING === 'true' || true,
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100
    }
  }
};

// Helper Functions
config.isFeatureEnabled = (featureName) => {
  return config.features[featureName]?.enabled || false;
};

config.getFeatureConfig = (featureName) => {
  return config.features[featureName] || null;
};

config.logFeatureStatus = () => {
  console.log('\n🚀 TRANSCENDENCE FEATURE STATUS:');
  console.log('================================');
  
  Object.entries(config.features).forEach(([key, feature]) => {
    const status = feature.enabled ? '✅ ENABLED' : '❌ DISABLED';
    const padding = ' '.repeat(Math.max(0, 20 - key.length));
    console.log(`${key}:${padding} ${status} - ${feature.description}`);
  });
  
  console.log('================================\n');
};

module.exports = config;