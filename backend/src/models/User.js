// src/models/User.js
const { db } = require('../utils/database');
const bcrypt = require('bcrypt');

class User {
  // Finde einen Benutzer anhand seines Benutzernamens
  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Finde einen Benutzer anhand seiner ID
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Erstelle einen neuen Benutzer
  static async create(userData) {
    const { username, email, password } = userData;
    
    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // ID des neu erstellten Benutzers abrufen
            db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, row) => {
              if (err) {
                reject(err);
              } else {
                resolve(row);
              }
            });
          }
        }
      );
    });
  }

  // Aktualisiere einen Benutzer
  static update(id, userData) {
    const { username, email, avatar } = userData;
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET username = ?, email = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [username, email, avatar, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, changes: this.changes });
          }
        }
      );
    });
  }
}

module.exports = User;