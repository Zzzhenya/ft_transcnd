// index.mjs or index.js (if "type": "module" in package.json)
import Fastify from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';

const fastify = Fastify({ logger: true });

// Enable CORS
fastify.register(cors);

// SQLite Database Connection
const DB_PATH = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('sqlite:', '')
  : './transcendence.db';

console.log('📍 Database Service connecting to:', DB_PATH);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('✅ Connected to SQLite database');

// ==================== DATABASE HELPERS ====================
const dbRun = (sql, params = []) => {
  const stmt = db.prepare(sql);
  const info = stmt.run(params);
  return { id: info.lastInsertRowid, changes: info.changes };
};

const dbGet = (sql, params = []) => {
  const stmt = db.prepare(sql);
  return stmt.get(params);
};

const dbAll = (sql, params = []) => {
  const stmt = db.prepare(sql);
  return stmt.all(params);
};

// ==================== HEALTH CHECK ====================
fastify.get('/health', async () => ({
  status: 'ok',
  service: 'database-service',
  database: 'sqlite',
  timestamp: new Date().toISOString()
}));

// ==================== READ ====================
fastify.get('/api/read', async (request, reply) => {
  const { table, id, column } = request.query;

  if (!table || !id || !column) {
    return reply.code(400).send({ error: 'Missing parameters: table, id, column required' });
  }

  const sql = `SELECT ${column} FROM ${table} WHERE id = ?`;
  const row = dbGet(sql, [id]);

  if (!row) return reply.code(404).send({ error: 'Record not found' });

  return { success: true, value: row[column] };
});

// ==================== WRITE ====================
fastify.post('/api/write', async (request, reply) => {
  const { table, id, column, value } = request.body;

  if (!table || !id || !column || value === undefined) {
    return reply.code(400).send({ error: 'Missing parameters: table, id, column, value required' });
  }

  const sql = `UPDATE ${table} SET ${column} = ? WHERE id = ?`;
  const result = dbRun(sql, [value, id]);

  if (result.changes === 0) return reply.code(404).send({ error: 'Record not found' });

  return { success: true, message: 'Value written successfully', changes: result.changes };
});

// ==================== LIST ====================
fastify.get('/api/list', async (request, reply) => {
  const { table, limit = 100, offset = 0 } = request.query;

  if (!table) return reply.code(400).send({ error: 'Missing parameter: table required' });

  const sql = `SELECT * FROM ${table} LIMIT ? OFFSET ?`;
  const rows = dbAll(sql, [limit, offset]);

  return { success: true, count: rows.length, data: rows };
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3006;

fastify.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Database: ${DB_PATH}`);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, closing database...');
  db.close();
  console.log('Database closed');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, closing database...');
  db.close();
  console.log('Database closed');
  process.exit(0);
});
