// services/database-service/src/index.js
const fastify = require('fastify')({ logger: true });
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = '/app/shared/database/transcendence.db';
const db = new sqlite3.Database(DB_PATH);

// ============================================
// QUEUE SYSTEM - nur ein Prozess gleichzeitig
// ============================================
const queue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  
  isProcessing = true;
  const task = queue.shift();
  
  try {
    await task.execute();
  } finally {
    isProcessing = false;
    processQueue();
  }
}

function addToQueue(execute) {
  return new Promise((resolve, reject) => {
    queue.push({
      execute: async () => {
        try {
          const result = await execute();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    });
    processQueue();
  });
}

// ============================================
// 1. READ: Wert aus DB lesen
// ============================================
// POST /db/read
// Body: { table: "users", id: 5, column: "username" }
// Returns: { value: "john_doe" }

fastify.post('/db/read', async (request, reply) => {
  const { table, id, column } = request.body;
  
  // Validierung
  if (!table || !id || !column) {
    return reply.code(400).send({ error: 'Missing table, id or column' });
  }
  
  return addToQueue(() => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT ${column} FROM ${table} WHERE id = ?`;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject({ error: err.message });
        } else if (!row) {
          reject({ error: 'Row not found' });
        } else {
          resolve({ value: row[column] });
        }
      });
    });
  });
});

// ============================================
// 2. WRITE: Wert in DB schreiben
// ============================================
// POST /db/write
// Body: { table: "users", id: 5, column: "username", value: "new_name" }
// Returns: { success: true, changes: 1 }

fastify.post('/db/write', async (request, reply) => {
  const { table, id, column, value } = request.body;
  
  // Validierung
  if (!table || !id || !column || value === undefined) {
    return reply.code(400).send({ error: 'Missing table, id, column or value' });
  }
  
  return addToQueue(() => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE ${table} SET ${column} = ? WHERE id = ?`;
      
      db.run(sql, [value, id], function(err) {
        if (err) {
          reject({ error: err.message });
        } else {
          resolve({ 
            success: true, 
            changes: this.changes 
          });
        }
      });
    });
  });
});

// ============================================
// 3. NEW ID: Neue Zeile erstellen, ID zurückgeben
// ============================================
// POST /db/new-id
// Body: { table: "users", data: { username: "john", email: "john@example.com" } }
// Returns: { id: 42 }

fastify.post('/db/new-id', async (request, reply) => {
  const { table, data } = request.body;
  
  // Validierung
  if (!table || !data || typeof data !== 'object') {
    return reply.code(400).send({ error: 'Missing table or data object' });
  }
  
  return addToQueue(() => {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
      
      db.run(sql, values, function(err) {
        if (err) {
          reject({ error: err.message });
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  });
});

// ============================================
// 4. CHECK: Prüfen ob Wert existiert
// ============================================
// POST /db/check
// Body: { table: "users", column: "email", value: "test@example.com" }
// Returns: { exists: true, id: 5 } oder { exists: false }

fastify.post('/db/check', async (request, reply) => {
  const { table, column, value } = request.body;
  
  // Validierung
  if (!table || !column || value === undefined) {
    return reply.code(400).send({ error: 'Missing table, column or value' });
  }
  
  return addToQueue(() => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id FROM ${table} WHERE ${column} = ?`;
      
      db.get(sql, [value], (err, row) => {
        if (err) {
          reject({ error: err.message });
        } else if (row) {
          resolve({ exists: true, id: row.id });
        } else {
          resolve({ exists: false });
        }
      });
    });
  });
});

// ============================================
// 5. BONUS: Mehrere Zeilen lesen
// ============================================
// POST /db/read-all
// Body: { table: "users", where: { status: "active" } }
// Returns: { rows: [...] }

fastify.post('/db/read-all', async (request, reply) => {
  const { table, where } = request.body;
  
  if (!table) {
    return reply.code(400).send({ error: 'Missing table' });
  }
  
  return addToQueue(() => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM ${table}`;
      let values = [];
      
      if (where && Object.keys(where).length > 0) {
        const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${conditions}`;
        values = Object.values(where);
      }
      
      db.all(sql, values, (err, rows) => {
        if (err) {
          reject({ error: err.message });
        } else {
          resolve({ rows: rows || [] });
        }
      });
    });
  });
});

// Server starten
const start = async () => {
  try {
    await fastify.listen({ port: 3006, host: '0.0.0.0' });
    console.log('🔒 Database Service running on port 3006');
    console.log('📋 Available endpoints:');
    console.log('   POST /db/read      - Wert lesen');
    console.log('   POST /db/write     - Wert schreiben');
    console.log('   POST /db/new-id    - Neue ID erstellen');
    console.log('   POST /db/check     - Wert prüfen');
    console.log('   POST /db/read-all  - Mehrere Zeilen');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();