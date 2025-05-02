// src/utils/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Stelle sicher, dass das Datenbankverzeichnis existiert
const dbDir = path.join(__dirname, '../../db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Erstelle Datenbankverbindung
const dbPath = path.join(dbDir, 'transcendence.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialisiere Datenbank mit Benutzertabelle
const initDatabase = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password TEXT,
        is_two_factor_auth_enabled INTEGER DEFAULT 0,
        two_factor_auth_secret TEXT,
        forty_two_id TEXT,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Datenbank initialisiert');
  });
};

module.exports = {
  db,
  initDatabase
};