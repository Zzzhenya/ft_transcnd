// src/utils/database.js
const { Pool } = require('pg');

// PostgreSQL Verbindungspool
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'transcendence',
  password: process.env.DB_PASSWORD || 'secretpassword',
  database: process.env.DB_NAME || 'transcendence_db'
});

// Initialisiere Datenbank mit Benutzertabelle
const initDatabase = async () => {
  try {
    // SCHRITT 1: Prüfe ob users_id_seq bereits existiert
    const sequenceCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'users_id_seq' 
        AND relkind = 'S'
      );
    `);
    
    const sequenceExists = sequenceCheck.rows[0].exists;
    
    // SCHRITT 2: Prüfe ob users Tabelle bereits existiert
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    console.log(`🔍 Database Status: Sequence exists: ${sequenceExists}, Table exists: ${tableExists}`);
    
    // SCHRITT 3: Bereinige falls Sequence ohne Tabelle existiert
    if (sequenceExists && !tableExists) {
      console.log('🧹 Cleaning up orphaned sequence...');
      await pool.query('DROP SEQUENCE IF EXISTS users_id_seq CASCADE;');
    }
    
    // SCHRITT 4: Erstelle Tabelle (jetzt sicher)
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
    
    // SCHRITT 5: Trigger für updated_at (nur wenn noch nicht existiert)
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Trigger nur erstellen wenn er nicht existiert
    const triggerCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_users_updated_at'
      );
    `);
    
    if (!triggerCheck.rows[0].exists) {
      await pool.query(`
        CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    
    console.log('✅ Users table initialized successfully');
    
  } catch (error) {
    console.error('Fehler bei der Datenbankinitialisierung:', error);
    throw error; // Re-throw für besseres Error Handling
  }
};

// Helper-Funktion für Queries
const query = (text, params) => pool.query(text, params);

// Gesunde Verbindung prüfen
const healthCheck = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

module.exports = {
  query,        // Für normale Queries
  pool,         // Für erweiterte Nutzung
  initDatabase, // Initialisierung
  healthCheck   // Health Check
};