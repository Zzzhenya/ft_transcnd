// src/utils/database.js
const { Pool } = require('pg');

// PostgreSQL Verbindungspool
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'transcendence',
  password: process.env.DB_PASSWORD || 'secretpassword',
  database: process.env.DB_NAME || 'transcendence'
});

// Initialisiere Datenbank mit Benutzertabelle
const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        password VARCHAR(255),
        is_two_factor_auth_enabled BOOLEAN DEFAULT false,
        two_factor_auth_secret VARCHAR(255),
        forty_two_id VARCHAR(255),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Trigger für updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await pool.query(`
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('PostgreSQL Datenbank initialisiert');
  } catch (error) {
    console.error('Fehler bei der Datenbankinitialisierung:', error);
  }
};

// Helper-Funktion für Queries
const query = (text, params) => pool.query(text, params);

module.exports = {
  query,  // Statt 'db' exportieren wir 'query'
  pool,   // Für erweiterte Nutzung
  initDatabase
};