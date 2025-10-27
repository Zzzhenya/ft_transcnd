const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database Connection
const DB_PATH = process.env.DATABASE_URL ? 
  process.env.DATABASE_URL.replace('sqlite:', '') : 
  '/app/shared/database/transcendence.db';

console.log('📍 Database Service connecting to:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database');
    db.run('PRAGMA foreign_keys = ON');
  }
});

// Promisify database methods
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'database-service',
    database: 'sqlite',
    timestamp: new Date().toISOString()
  });
});

// ==================== READ ====================
// GET /api/read?table=users&id=1&column=username
app.get('/api/read', async (req, res) => {
  try {
    const { table, id, column } = req.query;
    
    if (!table || !id || !column) {
      return res.status(400).json({ 
        error: 'Missing parameters: table, id, column required' 
      });
    }

    const sql = `SELECT ${column} FROM ${table} WHERE id = ?`;
    const row = await dbGet(sql, [id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({ 
      success: true, 
      value: row[column] 
    });
  } catch (error) {
    console.error('❌ Read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== WRITE ====================
// POST /api/write
// Body: { "table": "users", "id": 1, "column": "status", "value": "online" }
app.post('/api/write', async (req, res) => {
  try {
    const { table, id, column, value } = req.body;
    
    if (!table || !id || !column || value === undefined) {
      return res.status(400).json({ 
        error: 'Missing parameters: table, id, column, value required' 
      });
    }

    const sql = `UPDATE ${table} SET ${column} = ? WHERE id = ?`;
    const result = await dbRun(sql, [value, id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Value written successfully',
      changes: result.changes
    });
  } catch (error) {
    console.error('❌ Write error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHECK ====================
// GET /api/check?table=users&id=1&column=status&checkvalue=online
app.get('/api/check', async (req, res) => {
  try {
    const { table, id, column, checkvalue } = req.query;
    
    if (!table || !id || !column || checkvalue === undefined) {
      return res.status(400).json({ 
        error: 'Missing parameters: table, id, column, checkvalue required' 
      });
    }

    const sql = `SELECT ${column} FROM ${table} WHERE id = ?`;
    const row = await dbGet(sql, [id]);
    
    if (!row) {
      return res.json({ exists: false, match: false });
    }
    
    const actualValue = row[column];
    const matches = String(actualValue) === String(checkvalue);
    
    res.json({ 
      exists: true, 
      match: matches,
      actualValue: actualValue
    });
  } catch (error) {
    console.error('❌ Check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SET NEW ID ====================
// POST /api/setNewId
// Body: { "table": "users", "data": { "username": "test", "email": "test@example.com" } }
app.post('/api/setNewId', async (req, res) => {
  try {
    const { table, data } = req.body;
    
    if (!table || !data || typeof data !== 'object') {
      return res.status(400).json({ 
        error: 'Missing parameters: table and data (object) required' 
      });
    }

    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = await dbRun(sql, values);
    
    res.json({ 
      success: true, 
      id: result.id 
    });
  } catch (error) {
    console.error('❌ SetNewId error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== REMOVE ID ====================
// DELETE /api/removeId?table=users&id=5
app.delete('/api/removeId', async (req, res) => {
  try {
    const { table, id } = req.query;
    
    if (!table || !id) {
      return res.status(400).json({ 
        error: 'Missing parameters: table, id required' 
      });
    }

    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const result = await dbRun(sql, [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Record deleted successfully',
      changes: result.changes
    });
  } catch (error) {
    console.error('❌ RemoveId error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRINT ID INPUT ====================
// GET /api/printIdInput?table=users&id=1
app.get('/api/printIdInput', async (req, res) => {
  try {
    const { table, id } = req.query;
    
    if (!table || !id) {
      return res.status(400).json({ 
        error: 'Missing parameters: table, id required' 
      });
    }

    const sql = `SELECT * FROM ${table} WHERE id = ?`;
    const row = await dbGet(sql, [id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    const values = Object.values(row);
    const outputString = values.join(';');
    
    res.json({ 
      success: true, 
      data: outputString,
      columns: Object.keys(row)
    });
  } catch (error) {
    console.error('❌ PrintIdInput error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== BONUS: LIST ====================
// GET /api/list?table=users&limit=100&offset=0
app.get('/api/list', async (req, res) => {
  try {
    const { table, limit = 100, offset = 0 } = req.query;
    
    if (!table) {
      return res.status(400).json({ error: 'Missing parameter: table required' });
    }

    const sql = `SELECT * FROM ${table} LIMIT ? OFFSET ?`;
    const rows = await dbAll(sql, [limit, offset]);
    
    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });
  } catch (error) {
    console.error('❌ List error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== BONUS: QUERY ====================
// POST /api/query (für komplexere Queries, z.B. JOIN, WHERE mit mehreren Bedingungen)
// Body: { "sql": "SELECT * FROM users WHERE status = ?", "params": ["online"] }
app.post('/api/query', async (req, res) => {
  try {
    const { sql, params = [] } = req.body;
    
    if (!sql) {
      return res.status(400).json({ error: 'Missing parameter: sql required' });
    }

    // Nur SELECT Queries erlauben für Sicherheit
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      return res.status(403).json({ error: 'Only SELECT queries allowed' });
    }

    const rows = await dbAll(sql, params);
    
    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });
  } catch (error) {
    console.error('❌ Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3006;

app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   DATABASE SERVICE STARTED (SQLite)        ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${DB_PATH}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET    /health');
  console.log('  GET    /api/read');
  console.log('  POST   /api/write');
  console.log('  GET    /api/check');
  console.log('  POST   /api/setNewId');
  console.log('  DELETE /api/removeId');
  console.log('  GET    /api/printIdInput');
  console.log('  GET    /api/list');
  console.log('  POST   /api/query');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, closing database...');
  db.close(() => {
    console.log('Database closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, closing database...');
  db.close(() => {
    console.log('Database closed');
    process.exit(0);
  });
});

module.exports = app;