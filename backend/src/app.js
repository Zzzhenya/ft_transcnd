// backend/src/app.js - Mit bcrypt Passwort-Hashing
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

console.log('Starting Transcendence Backend with secure password hashing...');

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL Connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'transcendence',
  password: process.env.DB_PASSWORD || 'secretpassword',
  database: process.env.DB_NAME || 'transcendence_db',
});

// Test database connection
async function testDatabase() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

// Create tables if they don't exist
async function initializeTables() {
  try {
    console.log('Initializing database tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        is_two_factor_auth_enabled BOOLEAN DEFAULT FALSE,
        two_factor_auth_secret VARCHAR(255) DEFAULT NULL,
        forty_two_id VARCHAR(255) DEFAULT NULL,
        avatar VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // Hash default passwords
    const adminHashedPassword = await bcrypt.hash('admin123', 10);
    const user1HashedPassword = await bcrypt.hash('password', 10);

    // Insert default users with hashed passwords (only if they don't exist)
    await pool.query(`
      INSERT INTO users (username, email, password) VALUES 
      ('admin', 'admin@test.com', $1),
      ('user1', 'user1@test.com', $2)
      ON CONFLICT (username) DO NOTHING
    `, [adminHashedPassword, user1HashedPassword]);

    // Check how many users exist
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`Users table initialized with bcrypt hashing. Total users: ${userCount.rows[0].count}`);

    return true;
  } catch (error) {
    console.error('Table initialization failed:', error.message);
    return false;
  }
}

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Manual CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Simple logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Auth routes with SECURE password handling
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Register request for user:', req.body.username);
    
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Alle Felder sind erforderlich' 
      });
    }

    // Validate password length
    if (password.length < 3) {
      return res.status(400).json({ 
        message: 'Passwort muss mindestens 3 Zeichen lang sein' 
      });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        message: 'Benutzername oder E-Mail bereits vergeben' 
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with hashed password
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hashedPassword]
    );

    const newUser = result.rows[0];
    
    console.log(`User registered securely: ${username} (ID: ${newUser.id})`);
    
    res.status(201).json({
      message: 'Benutzer erfolgreich registriert',
      access_token: `token_${newUser.id}_${Date.now()}`,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: null
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login request for user:', req.body.username);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Benutzername und Passwort sind erforderlich' 
      });
    }

    // Find user (username or email)
    const result = await pool.query(
      'SELECT id, username, email, password FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        message: 'Ungültige Anmeldedaten' 
      });
    }

    const user = result.rows[0];

    // Compare password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        message: 'Ungültige Anmeldedaten' 
      });
    }

    console.log(`User logged in securely: ${user.username} (ID: ${user.id})`);

    res.json({
      access_token: `token_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
});

// Debug endpoints (NEVER show passwords)
app.get('/api/debug/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, created_at FROM users ORDER BY id');
    res.json({ 
      users: result.rows,
      total: result.rows.length,
      note: 'Passwords are securely hashed and not displayed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/tables', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    res.json({ 
      tables: result.rows.map(row => row.table_name),
      count: result.rows.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Security info endpoint
app.get('/api/security-info', (req, res) => {
  res.json({
    password_hashing: 'bcrypt with 10 salt rounds',
    password_storage: 'Passwords are never stored in plain text',
    last_updated: new Date().toISOString()
  });
});

// Health checks
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT COUNT(*) FROM users');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      users_count: parseInt(dbResult.rows[0].count),
      security: 'bcrypt password hashing enabled'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT COUNT(*) FROM users');
    res.json({ 
      status: 'Backend API running with PostgreSQL and bcrypt',
      timestamp: new Date().toISOString(),
      users_count: parseInt(dbResult.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Database error',
      error: error.message 
    });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({ 
    message: 'Transcendence Backend with PostgreSQL and bcrypt security',
    status: 'running',
    security: 'Passwords are hashed with bcrypt',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/health',
      'GET /api/debug/users',
      'GET /api/debug/tables',
      'GET /api/security-info'
    ]
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testDatabase();
    if (!dbConnected) {
      console.error('Cannot start server without database connection');
      process.exit(1);
    }

    // Initialize tables with secure password hashing
    const tablesInitialized = await initializeTables();
    if (!tablesInitialized) {
      console.error('Failed to initialize database tables');
      process.exit(1);
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at: http://0.0.0.0:${PORT}/api`);
      console.log(`Health check: http://0.0.0.0:${PORT}/health`);
      console.log('Database: PostgreSQL connected with auto-initialized tables');
      console.log('Security: bcrypt password hashing enabled');
      console.log('Backend ready with secure persistent storage!');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        pool.end();
        console.log('Server and database connections closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        pool.end();
        console.log('Server and database connections closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();