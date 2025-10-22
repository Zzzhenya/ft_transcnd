// ============================================
// User Model - Updated for new schema
// ============================================

const db = require('../../../shared/config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.display_name = data.display_name;
    this.avatar = data.avatar;
    this.bio = data.bio;
    this.is_guest = data.is_guest;
    this.status = data.status;
    this.intra_id = data.intra_id;
    this.oauth_provider = data.oauth_provider;
    this.created_at = data.created_at;
    this.last_login = data.last_login;
  }

  // ==================== CREATE ====================
  static async create(userData) {
    try {
      const result = await db.run(
        `INSERT INTO Users (
          username, 
          email, 
          password_hash, 
          display_name, 
          is_guest,
          intra_id,
          oauth_provider
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.username,
          userData.email,
          userData.password_hash || userData.password, // Support old field name
          userData.display_name || userData.username,
          userData.is_guest || 0,
          userData.intra_id || null,
          userData.oauth_provider || null
        ]
      );

      console.log('✅ User created with ID:', result.id);
      return await User.findById(result.id);
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  // ==================== READ ====================
  static async findById(id) {
    try {
      const row = await db.get('SELECT * FROM Users WHERE id = ?', [id]);
      return row ? new User(row) : null;
    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByUsername(username) {
    try {
      const row = await db.get('SELECT * FROM Users WHERE username = ?', [username]);
      return row ? new User(row) : null;
    } catch (error) {
      console.error('❌ Error finding user by username:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const row = await db.get('SELECT * FROM Users WHERE email = ?', [email]);
      return row ? new User(row) : null;
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  }

  static async findByIntraId(intraId) {
    try {
      const row = await db.get('SELECT * FROM Users WHERE intra_id = ?', [intraId]);
      return row ? new User(row) : null;
    } catch (error) {
      console.error('❌ Error finding user by intra_id:', error);
      throw error;
    }
  }

  static async getAllUsers(limit = 50, offset = 0) {
    try {
      const rows = await db.all(
        `SELECT 
          id, username, email, display_name, avatar, bio, 
          status, is_guest, created_at 
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

  // ==================== UPDATE ====================
  static async update(id, updateData) {
    try {
      // Remove undefined values
      const cleanData = Object.entries(updateData)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

      const fields = Object.keys(cleanData);
      const values = Object.values(cleanData);

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const setClause = fields.map(field => `${field} = ?`).join(', ');

      await db.run(
        `UPDATE Users SET ${setClause} WHERE id = ?`,
        [...values, id]
      );

      console.log('✅ User updated:', id);
      return await User.findById(id);
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  // ==================== DELETE ====================
  static async delete(id) {
    try {
      const user = await User.findById(id);
      
      if (!user) {
        throw new Error('User not found');
      }

      await db.run('DELETE FROM Users WHERE id = ?', [id]);
      
      console.log('✅ User deleted:', id);
      return user;
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  // ==================== UTILITY ====================
  static async getUserCount() {
    try {
      const result = await db.get('SELECT COUNT(*) as count FROM Users');
      return result.count;
    } catch (error) {
      console.error('❌ Error getting user count:', error);
      throw error;
    }
  }

  static async exists(id) {
    try {
      const row = await db.get('SELECT 1 FROM Users WHERE id = ? LIMIT 1', [id]);
      return !!row;
    } catch (error) {
      console.error('❌ Error checking if user exists:', error);
      throw error;
    }
  }

  // Helper: Remove password_hash from object (for API responses)
  toJSON() {
    const user = { ...this };
    delete user.password_hash;
    return user;
  }
}

module.exports = User;