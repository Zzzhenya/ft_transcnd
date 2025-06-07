// scripts/migrate.js
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Simple database connection for migrations
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

const runMigrations = async () => {
  try {
    console.log('🔄 Running database migrations...');
    console.log('📋 Database config:', {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });
    
    // Wait for database to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        await query('SELECT 1');
        break;
      } catch (error) {
        console.log(`⏳ Waiting for database... (${retries} retries left)`);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Check if migrations table exists
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Run migration if not already executed
    const migrationFile = '002_add_user_profile_features.sql';
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    
    if (fs.existsSync(migrationPath)) {
      const existing = await query(
        'SELECT * FROM migrations WHERE filename = $1',
        [migrationFile]
      );

      if (existing.rows.length === 0) {
        console.log(`📄 Executing migration: ${migrationFile}`);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split and execute statements (PostgreSQL doesn't support multiple statements in one query)
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          try {
            await query(statement);
          } catch (error) {
            // Ignore "already exists" errors
            if (!error.message.includes('already exists') && 
                !error.message.includes('duplicate key') &&
                !error.message.includes('relation') &&
                !error.message.includes('does not exist')) {
              throw error;
            }
          }
        }

        // Mark migration as executed
        await query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [migrationFile]
        );

        console.log(`✅ Migration ${migrationFile} completed successfully`);
      } else {
        console.log(`⏭️  Migration ${migrationFile} already executed`);
      }
    } else {
      console.log(`⚠️  Migration file ${migrationFile} not found`);
    }

    console.log('✅ All migrations completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();