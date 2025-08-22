// scripts/migrate.js - Complete Migration Script
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Simple database connection for migrations
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'transcendence',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'transcendence_db',
  password: process.env.DB_PASSWORD || 'secretpassword',
  port: process.env.DB_PORT || 5432,
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
      user: process.env.DB_USER || 'transcendence',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'transcendence_db',
      port: process.env.DB_PORT || 5432
    });
    
    // Wait for database to be ready
    let retries = 30;
    while (retries > 0) {
      try {
        await query('SELECT 1');
        console.log('✅ Database connection established');
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

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📄 Found ${migrationFiles.length} migration files:`, migrationFiles);

    // Run each migration if not already executed
    for (const migrationFile of migrationFiles) {
      const existing = await query(
        'SELECT * FROM migrations WHERE filename = $1',
        [migrationFile]
      );

      if (existing.rows.length === 0) {
        console.log(`📄 Executing migration: ${migrationFile}`);
        const migrationPath = path.join(migrationsDir, migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        try {
          // Execute the entire migration as one transaction
          await query('BEGIN');
          
          // Split and execute statements
          const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

          for (const statement of statements) {
            try {
              await query(statement);
            } catch (error) {
              // Ignore "already exists" errors for CREATE TABLE IF NOT EXISTS, etc.
              if (!error.message.includes('already exists') && 
                  !error.message.includes('duplicate key') &&
                  !error.message.includes('constraint') &&
                  !error.message.includes('does not exist')) {
                console.error(`❌ Error in statement: ${statement.substring(0, 100)}...`);
                throw error;
              } else {
                console.log(`⏭️  Skipped existing: ${statement.substring(0, 50)}...`);
              }
            }
          }

          // Mark migration as executed
          await query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [migrationFile]
          );

          await query('COMMIT');
          console.log(`✅ Migration ${migrationFile} completed successfully`);
          
        } catch (error) {
          await query('ROLLBACK');
          console.error(`❌ Migration ${migrationFile} failed:`, error.message);
          throw error;
        }
      } else {
        console.log(`⏭️  Migration ${migrationFile} already executed`);
      }
    }

    // Verify tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('📊 Created tables:');
    for (const table of tablesResult.rows) {
      const countResult = await query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      console.log(`  - ${table.table_name}: ${countResult.rows[0].count} rows`);
    }

    console.log('✅ All migrations completed successfully');
    
    // Create a default admin user if none exists
    const adminExists = await query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (adminExists.rows.length === 0) {
      console.log('👤 Creating default admin user...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await query(`
        INSERT INTO users (username, email, password) 
        VALUES ($1, $2, $3)
      `, ['admin', 'admin@transcendence.local', hashedPassword]);
      
      console.log('✅ Admin user created (username: admin, password: admin123)');
    }

    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
};

runMigrations();