const { dbRun, dbGet, dbAll } = require('../../../../shared/config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.bio = data.bio;
    this.avatar = data.avatar;
    this.is_two_factor_auth_enabled = data.is_two_factor_auth_enabled;
    this.two_factor_auth_secret = data.two_factor_auth_secret;
    this.forty_two_id = data.forty_two_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create(userData) {
    const { username, email, password } = userData;

    try {
      const result = await dbRun(
        `INSERT INTO users (username, email, password) 
                 VALUES (?, ?, ?)`,
        [username, email, password]
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
        `SELECT id, username, email, avatar, bio, created_at, updated_at, is_two_factor_auth_enabled 
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