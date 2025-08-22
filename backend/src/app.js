// src/app.js - Mit Migrations-Support und echter Datenbank
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'transcendence',
  password: process.env.DB_PASSWORD || 'secretpassword',
  database: process.env.DB_NAME || 'transcendence_db',
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Test database connection and check migrations
async function checkDatabase() {
  try {
    const client = await pool.connect();
    
    // Test connection
    await client.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`📊 Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Check admin user
    const adminResult = await client.query('SELECT username FROM users WHERE username = $1', ['admin']);
    if (adminResult.rows.length > 0) {
      console.log('👤 Admin user exists (username: admin, password: admin123)');
    } else {
      console.log('⚠️  No admin user found');
    }
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const achievementCount = await pool.query('SELECT COUNT(*) as count FROM achievements');
    
    res.json({
      database: 'connected',
      tables: tablesResult.rows.map(t => t.table_name),
      users: parseInt(userCount.rows[0].count),
      achievements: parseInt(achievementCount.rows[0].count),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      database: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Register attempt:', req.body);
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Benutzername, E-Mail und Passwort sind erforderlich' 
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        message: 'Benutzername oder E-Mail bereits vergeben' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, avatar',
      [username, email, hashedPassword]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ User registered: ${user.username} (ID: ${user.id})`);

    res.status(201).json({
      message: 'Benutzer erfolgreich registriert',
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Benutzername und Passwort sind erforderlich' 
      });
    }

    // Find user by username or email
    const result = await pool.query(
      'SELECT id, username, email, password, avatar FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW(), status = $1 WHERE id = $2',
      ['online', user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ User logged in: ${user.username} (ID: ${user.id})`);

    res.status(200).json({
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
});

// Get all users (Admin endpoint)
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.username, u.email, u.avatar, u.created_at, u.last_login, u.status,
        gs.games_played, gs.games_won, gs.games_lost, gs.total_score
      FROM users u
      LEFT JOIN game_stats gs ON u.id = gs.user_id
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get database tables (Admin endpoint)
app.get('/api/admin/tables', async (req, res) => {
  try {
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tables = {};
    
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      // Get columns
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `, [tableName]);
      
      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      
      tables[tableName] = {
        columns: columnsResult.rows,
        row_count: parseInt(countResult.rows[0].count)
      };
    }
    
    res.json({ tables });
  } catch (error) {
    console.error('Admin tables error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Server starten
async function startServer() {
  try {
    // Wait a bit for database to be ready
    console.log('⏳ Waiting for database...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check database
    await checkDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server läuft auf Port ${PORT}`);
      console.log(`🌍 Umgebung: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 DB Status: http://localhost:${PORT}/api/db-status`);
      console.log(`👥 Admin Users: http://localhost:${PORT}/api/admin/users`);
      console.log(`🗄️  Admin Tables: http://localhost:${PORT}/api/admin/tables`);
      console.log('');
      console.log('🔐 Default Admin Login:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    });
  } catch (error) {
    console.error('❌ Fehler beim Starten des Servers:', error);
    console.log('⚠️ Server läuft trotzdem...');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server läuft auf Port ${PORT} (ohne DB)`);
    });
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM empfangen, fahre Server herunter...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT empfangen, fahre Server herunter...');
  await pool.end();
  process.exit(0);
});

startServer();