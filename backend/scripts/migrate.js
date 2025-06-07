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

// Function to properly parse SQL statements, handling dollar-quoted strings
const parseSQL = (sql) => {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const remaining = sql.slice(i);

    if (!inDollarQuote) {
      // Check for start of dollar-quoted string
      if (char === '$') {
        const dollarMatch = remaining.match(/^\$([^$]*)\$/);
        if (dollarMatch) {
          inDollarQuote = true;
          dollarTag = dollarMatch[0];
          current += dollarTag;
          i += dollarTag.length;
          continue;
        }
      }
      
      // Check for statement end
      if (char === ';') {
        const statement = current.trim();
        if (statement) {
          statements.push(statement);
        }
        current = '';
        i++;
        continue;
      }
    } else {
      // We're inside a dollar-quoted string, look for the closing tag
      if (remaining.startsWith(dollarTag)) {
        inDollarQuote = false;
        current += dollarTag;
        i += dollarTag.length;
        dollarTag = '';
        continue;
      }
    }

    current += char;
    i++;
  }

  // Add the last statement if it doesn't end with semicolon
  const lastStatement = current.trim();
  if (lastStatement) {
    statements.push(lastStatement);
  }

  return statements.filter(stmt => stmt.length > 0 && !stmt.match(/^\s*--/));
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

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      const existing = await query(
        'SELECT * FROM migrations WHERE filename = $1',
        [migrationFile]
      );

      if (existing.rows.length === 0) {
        console.log(`📄 Executing migration: ${migrationFile}`);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Parse SQL statements properly
        const statements = parseSQL(migrationSQL);

        for (const statement of statements) {
          try {
            console.log(`Executing statement: ${statement.substring(0, 100)}...`);
            await query(statement);
          } catch (error) {
            console.log(`Error in statement: ${statement.substring(0, 100)}...`);
            // Only ignore specific "already exists" errors
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate key value') ||
                (error.message.includes('relation') && error.message.includes('already exists'))) {
              console.log(`⚠️  Skipping: ${error.message}`);
              continue;
            }
            throw error;
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
    }

    console.log('✅ All migrations completed');
    await pool.end();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
};

runMigrations();