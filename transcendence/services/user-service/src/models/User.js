const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://database-service:3006';
const DB_SERVICE_TOKEN = process.env.DB_SERVICE_TOKEN || 'super_secret_internal_token';

// Database connection
const DB_PATH = process.env.DATABASE_URL ? 
  process.env.DATABASE_URL.replace('sqlite:', '') : 
  '/app/shared/database/transcendence.db';

console.log('📍 User.js connecting to database at:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    db.run('PRAGMA foreign_keys = ON');
    // Ensure Users table exists with display_name column CD/CI tests--- might need to adjust this in production
    db.run(`CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      display_name VARCHAR(100),
      is_guest BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Promisify database methods
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
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
    this.password_hash = data.password_hash || data.password;
    this.display_name = data.display_name || data.username; // Fallback to username
    this.avatar = data.avatar;
    this.bio = data.bio;
    this.is_guest = data.is_guest;
    this.status = data.status;
    this.created_at = data.created_at;
  }

  // ============ CREATE ============
  static async create(userData) {
    try {
      const res = await fetch(`${DATABASE_SERVICE_URL}/internal/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': DB_SERVICE_TOKEN
        },
        body: JSON.stringify({
          table: 'Users',
          action: 'insert',
          values: {
            username: userData.username,
            email: userData.email,
            password_hash: userData.password_hash || userData.password
          } })
        });
      // const result = await dbRun(
      //   // `INSERT INTO Users (username, email, password_hash, display_name, is_guest)
      //   `INSERT INTO Users (username, email, password_hash)
      //   VALUES (?, ?, ?)`,
      //   [
      //     userData.username,
      //     userData.email,
      //     userData.password_hash || userData.password
      //   ]
      //   //  VALUES (?, ?, ?, ?, ?)`,
      //   // [
      //   //   userData.username,
      //   //   userData.email,
      //   //   userData.password_hash || userData.password,
      //   //   userData.display_name || userData.username,
      //   //   userData.is_guest || 0
      //   // ]
      // );
      // // console.log(username, email, password);
      return await User.findById(res.id);
      // if (!res.ok) {
      //   throw new Error(`Database service responded with status ${res.status}`);
      // }
      // const data = await res.json();
      // // data.data is assumed to be an array of rows
      // console.log( data.data && data.data.length > 0 ? data.data[0] : null)
      // return data.data && data.data.length > 0 ? data.data[0] : null;
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }

    //   return await User.findById(result.id);
    // } catch (error) {
    //   console.error('❌ Error creating user:', error);
    //   throw error;
    // }
  }

  // ============ FIND BY ID ============
  static async findById(id) {
    // try {
    //   const row = await dbGet('SELECT * FROM Users WHERE id = ?', [id]);
    //   return row ? new User(row) : null;
    // } catch (error) {
    //   console.error('❌ Error finding user by id:', error);
    //   throw error;
    // }
    try {
      const res = await fetch(`${DATABASE_SERVICE_URL}/internal/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': DB_SERVICE_TOKEN
        },
        body: JSON.stringify({
          table: 'Users',
          columns: ['id'],
          filters: { id },
          limit: 1
        })
      });
      if (!res.ok) {
        throw new Error(`Database service responded with status ${res.status}`);
      }
      const data = await res.json();
      // data.data is assumed to be an array of rows
      console.log( data.data && data.data.length > 0 ? data.data[0] : null)
      return data.data && data.data.length > 0 ? data.data[0] : null;
    } catch (error) {
      console.error('❌ Error finding user by id:', error);
      throw error;
    }
  }

  /*
{
  "table": "Users",
  "columns": ["id"],          // Only fetch the ID if it exists
  "filters": {
    "username": "alice"       // The username you want to check
  },
  "limit": 1                  // Only need one row
}


  */

  // ============ FIND BY USERNAME ============
  static async findByUsername(username) {
    try {
      const res = await fetch(`${DATABASE_SERVICE_URL}/internal/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': DB_SERVICE_TOKEN
        },
        body: JSON.stringify({
          table: 'Users',
          columns: ['username'],
          filters: { username },
          limit: 1
        })
      });
    console.log(res)
  // const row = await dbGet('SELECT * FROM Users WHERE username = ?', [username]);
  //     return row ? new User(row) : null;
  //   } catch (error) {
  //     console.error('❌ Error finding user by username:', error);
  //     throw error;
  //   }
  // }
    if (!res.ok) {
      throw new Error(`Database service responded with status ${res.status}`);
    }
    const data = await res.json();
    // data.data is assumed to be an array of rows
    console.log("data: ", data)
    console.log( data.data && data.data.length > 0 ? data.data[0] : null)
    // return data.data && data.data.length > 0 ? data.data : null;
    return data.data && data.data.length > 0 ? data.data[0] : null;
  } catch (error) {
    console.error('❌ Error finding user by username:', error);
    throw error;
  }
}

  // ============ FIND BY EMAIL ============
  static async findByEmail(email) {
    // try {
    //   const row = await dbGet('SELECT * FROM Users WHERE email = ?', [email]);
    //   return row ? new User(row) : null;
    // } catch (error) {
    //   console.error('❌ Error finding user by email:', error);
    //   throw error;
    // }
    try {
      const res = await fetch(`${DATABASE_SERVICE_URL}/internal/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': DB_SERVICE_TOKEN
        },
        body: JSON.stringify({
          table: 'Users',
          columns: ["id","username","email","password_hash"],
          filters: { email },
          limit: 1
        })
      });
      if (!res.ok) {
        throw new Error(`Database service responded with status ${res.status}`);
      }
      const data = await res.json();
      // data.data is assumed to be an array of rows
      console.log( data.data && data.data.length > 0 ? data.data[0] : null)
      // return data.data && data.data.length > 0 ? data.data : null;
      return data.data && data.data.length > 0 ? data.data[0] : null;
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  }

  // ============ UPDATE ============
  static async update(id, updateData) {
    try {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      await dbRun(
        `UPDATE Users SET ${setClause} WHERE id = ?`,
        [...values, id]
      );

      return await User.findById(id);
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  // ============ DELETE ============
  static async delete(id) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      await dbRun('DELETE FROM Users WHERE id = ?', [id]);
      return user;
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  // ============ GET ALL USERS ============
  static async getAllUsers(limit = 50, offset = 0) {
    try {
      const rows = await dbAll(
        `SELECT id, username, email, display_name, avatar, bio, status, is_guest, created_at 
         FROM Users 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return rows.map(row => new User(row));
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      throw error;
    }
  }

  // ============ GET USER COUNT ============
  static async getUserCount() {
    try {
      const result = await dbGet('SELECT COUNT(*) as count FROM Users');
      return result.count;
    } catch (error) {
      console.error('❌ Error getting user count:', error);
      throw error;
    }
  }

  // ============ CHECK IF EXISTS ============
  static async exists(id) {
    // try {
    //   const row = await dbGet('SELECT 1 FROM Users WHERE id = ? LIMIT 1', [id]);
    //   return !!row;
    // } catch (error) {
    //   console.error('❌ Error checking if user exists:', error);
    //   throw error;
    // }

    try {
      const res = await fetch(`${DATABASE_SERVICE_URL}/internal/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': DB_SERVICE_TOKEN
        },
        body: JSON.stringify({
          table: 'Users',
          columns: ['id'],
          filters: { id },
          limit: 1
        })
      });
      if (!res.ok) {
        throw new Error(`Database service responded with status ${res.status}`);
      }
      const data = await res.json();
      // data.data is assumed to be an array of rows
      console.log( data.data && data.data.length > 0 ? data.data[0] : null)
      return data.data && data.data.length > 0 ? data.data[0] : null;
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }

  }
}

module.exports = User;