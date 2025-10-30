// Temporarily use direct sqlite3 until shared database is properly mounted
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const DB_PATH = process.env.DATABASE_URL ? 
  process.env.DATABASE_URL.replace('sqlite:', '') : 
  '/app/shared/database/transcendence.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Connected to SQLite database at:', DB_PATH);
    db.run('PRAGMA foreign_keys = ON');
    
    // Create users table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        bio TEXT,
        avatar VARCHAR(255),
        is_two_factor_auth_enabled BOOLEAN DEFAULT FALSE,
        two_factor_auth_secret VARCHAR(255),
        forty_two_id VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('❌ Error creating users table:', err);
      } else {
        console.log('✅ Users table ready');
      }
    });
  }
});

// Promisify database methods
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password_hash; // Map password_hash to password for backward compatibility
    this.password_hash = data.password_hash;
    this.bio = data.bio;
    this.avatar = data.avatar;
    this.is_two_factor_auth_enabled = data.is_two_factor_auth_enabled;
    this.two_factor_auth_secret = data.two_factor_auth_secret;
    this.forty_two_id = data.forty_two_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create(userData) {
    const { username, email, password, password_hash } = userData;
    // Use password_hash if provided, otherwise use password
    const hashToStore = password_hash || password;

    try {
      const result = await dbRun(
        `INSERT INTO users (username, email, password_hash) 
                 VALUES (?, ?, ?)`,
        [username, email, hashToStore]
      );

      // Fetch the created user
      const user = await dbGet(
        'SELECT * FROM users WHERE id = ?',
        [result.lastID]
      );

      return new User(user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const user = await dbGet(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      return user ? new User(user) : null;
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const user = await dbGet(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      return user ? new User(user) : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findByUsername(username) {
    try {
      const user = await dbGet(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      return user ? new User(user) : null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    const setClause = fields.map(field => `${field} = ?`).join(', ');

    try {
      await dbRun(
        `UPDATE users 
                 SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
        [...values, id]
      );

      return await User.findById(id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const userToDelete = await User.findById(id);

      if (!userToDelete) {
        throw new Error('User not found');
      }

      await dbRun('DELETE FROM users WHERE id = ?', [id]);

      return userToDelete;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getUserCount() {
    try {
      const result = await dbGet('SELECT COUNT(*) as count FROM users');
      return result.count;
    } catch (error) {
      console.error('Error getting user count:', error);
      throw error;
    }
  }

  static async getAllUsers(limit = 50, offset = 0) {
    try {
      const users = await dbAll(
        `SELECT id, username, email, avatar, bio, created_at, updated_at, is_two_factor_auth_enabled, password_hash 
                 FROM users 
                 ORDER BY created_at DESC 
                 LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return users.map(row => new User(row));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  static async exists(id) {
    try {
      const user = await dbGet(
        'SELECT 1 FROM users WHERE id = ? LIMIT 1',
        [id]
      );

      return !!user;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      throw error;
    }
  }
}

module.exports = User;