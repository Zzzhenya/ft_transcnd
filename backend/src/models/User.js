// models/User.js
const { query } = require('../utils/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.bio = data.bio;
    this.is_two_factor_auth_enabled = data.is_two_factor_auth_enabled;
    this.two_factor_auth_secret = data.two_factor_auth_secret;
    this.forty_two_id = data.forty_two_id;
    this.avatar = data.avatar;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create(userData) {
    const { username, email, password } = userData;
    
    try {
      const result = await query(
        `INSERT INTO users (username, email, password) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [username, email, password]
      );
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findByUsername(username) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    
    const setClause = fields.map((field, index) => 
      `${field} = $${index + 2}`
    ).join(', ');
    
    try {
      const result = await query(
        `UPDATE users 
         SET ${setClause}
         WHERE id = $1
         RETURNING *`,
        [id, ...values]
      );
      
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // First, get the user data before deletion (for logging purposes)
      const userToDelete = await User.findById(id);
      
      if (!userToDelete) {
        throw new Error('User not found');
      }

      // Delete user from database
      const result = await query(
        'DELETE FROM users WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get user count (useful for admin purposes)
  static async getUserCount() {
    try {
      const result = await query('SELECT COUNT(*) as count FROM users');
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting user count:', error);
      throw error;
    }
  }

  // Get all users (admin only - should be protected by admin middleware)
  static async getAllUsers(limit = 50, offset = 0) {
    try {
      const result = await query(
        `SELECT id, username, email, avatar, bio, created_at, updated_at, is_two_factor_auth_enabled 
         FROM users 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      
      return result.rows.map(row => new User(row));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Check if user exists by id (lightweight check)
  static async exists(id) {
    try {
      const result = await query(
        'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)',
        [id]
      );
      
      return result.rows[0].exists;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      throw error;
    }
  }
}

module.exports = User;