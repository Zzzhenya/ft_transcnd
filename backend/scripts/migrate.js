// Vereinfachte Migration ohne SQL-Parsing
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const runMigrations = async () => {
  try {
    console.log('🔄 Running database migrations...');
    
    // Einfach nur ein CREATE TABLE ohne komplexe Parsing
    const basicSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(basicSQL);
    console.log('✅ Basic migration completed');
    await pool.end();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
};

runMigrations();