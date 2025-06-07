// backend/src/models/User.js
const { Pool } = require('pg');
const config = require('../../config/config');

// Database connection
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.username,
  password: config.database.password,
  database: config.database.database,
  ssl: false
});

class User {
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.email = userData.email;
    this.password = userData.password;
    this.avatar = userData.avatar;
    this.email_verified = userData.email_verified;
    this.verification_token = userData.verification_token;
    this.verification_expires = userData.verification_expires;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
  }

  // Initialisierung der Datenbank-Tabelle
  static async initDatabase() {
    try {
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          avatar VARCHAR(255) DEFAULT NULL,
          email_verified BOOLEAN DEFAULT false,
          verification_token VARCHAR(255) DEFAULT NULL,
          verification_expires TIMESTAMP DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
        CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
      `;

      await pool.query(createUsersTable);
      await pool.query(createIndexes);
      
      console.log('✅ Users table initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing users table:', error);
      throw error;
    }
  }

  // Benutzer erstellen
  static async create(userData) {
    try {
      const query = `
        INSERT INTO users (username, email, password, avatar, email_verified, verification_token, verification_expires)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      
      const values = [
        userData.username,
        userData.email,
        userData.password,
        userData.avatar || null,
        userData.email_verified || false,
        userData.verification_token || null,
        userData.verification_expires || null
      ];

      const result = await pool.query(query, values);
      return new User(result.rows[0]);
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  // Benutzer per ID finden
  static async findById(id) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      throw error;
    }
  }

  // Benutzer per Benutzername finden
  static async findByUsername(username) {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await pool.query(query, [username]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('❌ Error finding user by username:', error);
      throw error;
    }
  }

  // Benutzer per E-Mail finden
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  }

  // Benutzer per Verification Token finden
  static async findByVerificationToken(token) {
    try {
      const query = 'SELECT * FROM users WHERE verification_token = $1';
      const result = await pool.query(query, [token]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('❌ Error finding user by verification token:', error);
      throw error;
    }
  }

  // Benutzer aktualisieren
  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Dynamisch SQL Query basierend auf updateData erstellen
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      // updated_at automatisch setzen
      fields.push(`updated_at = $${paramCount}`);
      values.push(new Date());
      values.push(id); // ID als letzter Parameter

      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount + 1}
        RETURNING *;
      `;

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  // Benutzer löschen
  static async delete(id) {
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  // Alle Benutzer abrufen (mit Pagination)
  static async findAll(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT id, username, email, avatar, email_verified, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const result = await pool.query(query, [limit, offset]);
      return result.rows.map(row => new User(row));
    } catch (error) {
      console.error('❌ Error finding all users:', error);
      throw error;
    }
  }

  // Benutzer Statistiken
  static async getStats() {
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM users';
      const verifiedQuery = 'SELECT COUNT(*) as verified FROM users WHERE email_verified = true';
      const recentQuery = `
        SELECT COUNT(*) as recent 
        FROM users 
        WHERE created_at > NOW() - INTERVAL '7 days'
      `;

      const [totalResult, verifiedResult, recentResult] = await Promise.all([
        pool.query(totalQuery),
        pool.query(verifiedQuery),
        pool.query(recentQuery)
      ]);

      return {
        total: parseInt(totalResult.rows[0].total),
        verified: parseInt(verifiedResult.rows[0].verified),
        recent: parseInt(recentResult.rows[0].recent),
        verificationRate: totalResult.rows[0].total > 0 ? 
          (verifiedResult.rows[0].verified / totalResult.rows[0].total * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw error;
    }
  }

  // Abgelaufene Verification Tokens bereinigen
  static async cleanupExpiredTokens() {
    try {
      const query = `
        UPDATE users 
        SET verification_token = NULL, verification_expires = NULL
        WHERE verification_expires < NOW() AND verification_token IS NOT NULL
        RETURNING id, username, email;
      `;
      
      const result = await pool.query(query);
      
      if (result.rows.length > 0) {
        console.log(`🧹 Cleaned up ${result.rows.length} expired verification tokens`);
      }
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error cleaning up expired tokens:', error);
      throw error;
    }
  }

  // Prüfen ob Username verfügbar ist
  static async isUsernameAvailable(username, excludeId = null) {
    try {
      let query = 'SELECT id FROM users WHERE username = $1';
      let values = [username];
      
      if (excludeId) {
        query += ' AND id != $2';
        values.push(excludeId);
      }
      
      const result = await pool.query(query, values);
      return result.rows.length === 0;
    } catch (error) {
      console.error('❌ Error checking username availability:', error);
      throw error;
    }
  }

  // Prüfen ob E-Mail verfügbar ist
  static async isEmailAvailable(email, excludeId = null) {
    try {
      let query = 'SELECT id FROM users WHERE email = $1';
      let values = [email];
      
      if (excludeId) {
        query += ' AND id != $2';
        values.push(excludeId);
      }
      
      const result = await pool.query(query, values);
      return result.rows.length === 0;
    } catch (error) {
      console.error('❌ Error checking email availability:', error);
      throw error;
    }
  }

  // Benutzer ohne Passwort zurückgeben (für API Responses)
  toSafeObject() {
    const { password, verification_token, ...safeUser } = this;
    return safeUser;
  }

  // Database Connection Test
  static async testConnection() {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connection successful:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  // Graceful shutdown
  static async closePool() {
    try {
      await pool.end();
      console.log('🔒 Database connection pool closed');
    } catch (error) {
      console.error('❌ Error closing database pool:', error);
    }
  }
}

// Automatische Datenbank-Initialisierung beim ersten Import
User.initDatabase().catch(error => {
  console.error('❌ Failed to initialize User database:', error);
});

// Cleanup Job für abgelaufene Tokens (läuft alle 6 Stunden)
if (config.isFeatureEnabled('EMAIL_VERIFICATION')) {
  setInterval(async () => {
    try {
      await User.cleanupExpiredTokens();
    } catch (error) {
      console.error('❌ Token cleanup job failed:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 Stunden
}

module.exports = User;