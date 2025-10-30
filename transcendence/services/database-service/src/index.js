// index.mjs (or index.js if using "type": "module" in package.json)
import Fastify from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import PQueue from 'p-queue';

// =============================================
// ⚙️ Fastify Setup
// =============================================
const fastify = Fastify({ logger: true });
fastify.register(cors);

// =============================================
// 🗄️ SQLite Setup (Better-SQLite3)
// =============================================
const DB_PATH = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('sqlite:', '')
  : './transcendence.db';

console.log('📍 Connecting to SQLite database at:', DB_PATH);

const db = new Database(DB_PATH);

// --- Enable Best-Practice Pragmas ---
db.pragma('journal_mode = WAL');     // ✅ concurrent reads + safe writes
db.pragma('synchronous = NORMAL');   // good balance between safety & speed
db.pragma('foreign_keys = ON');      // enforce FK constraints

console.log('✅ SQLite database ready (WAL mode ON)');

// Optional: queue writes to avoid blocking (single write at a time)
const writeQueue = new PQueue({ concurrency: 1 });

// =============================================
// 🔧 Safe DB Helper Functions
// =============================================
const dbRun = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const info = stmt.run(params);
    return { id: info.lastInsertRowid, changes: info.changes };
  } catch (err) {
    fastify.log.error({ err, sql }, 'DB Run Error');
    throw err;
  }
};

const dbGet = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    return stmt.get(params);
  } catch (err) {
    fastify.log.error({ err, sql }, 'DB Get Error');
    throw err;
  }
};

const dbAll = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(params);
  } catch (err) {
    fastify.log.error({ err, sql }, 'DB All Error');
    throw err;
  }
};

// =============================================
// 🧱 Allowed Tables / Columns (SQL Injection Safety)
// =============================================
const allowedTables = {
  users: ['id', 'name', 'email'],
  posts: ['id', 'title', 'content'],
  // add more as needed...
};

function validateTableAndColumn(table, column) {
  const columns = allowedTables[table];
  if (!columns) return false;
  if (column && !columns.includes(column)) return false;
  return true;
}

// =============================================
// 🩺 Health Check
// =============================================
fastify.get('/health', async () => ({
  status: 'ok',
  service: 'database-service',
  database: 'sqlite',
  wal_mode: db.pragma('journal_mode', { simple: true }),
  timestamp: new Date().toISOString(),
}));

// =============================================
// 📖 READ
// =============================================
fastify.get('/api/read', async (request, reply) => {
  const { table, id, column } = request.query;

  if (!table || !id || !column) {
    return reply.code(400).send({ error: 'Missing parameters: table, id, column required' });
  }

  if (!validateTableAndColumn(table, column)) {
    return reply.code(400).send({ error: 'Invalid table or column' });
  }

  const sql = `SELECT ${column} FROM ${table} WHERE id = ?`;
  const row = dbGet(sql, [id]);

  if (!row) return reply.code(404).send({ error: 'Record not found' });

  return { success: true, value: row[column] };
});

// =============================================
// ✍️ WRITE (Transactional + Queued)
// =============================================
fastify.post('/api/write', async (request, reply) => {
  const { table, id, column, value } = request.body;

  if (!table || !id || !column || value === undefined) {
    return reply.code(400).send({ error: 'Missing parameters: table, id, column, value required' });
  }

  if (!validateTableAndColumn(table, column)) {
    return reply.code(400).send({ error: 'Invalid table or column' });
  }

  const sql = `UPDATE ${table} SET ${column} = ? WHERE id = ?`;

  try {
    // Run writes sequentially to avoid DB locks
    const result = await writeQueue.add(() =>
      db.transaction(() => dbRun(sql, [value, id]))()
    );

    if (result.changes === 0) {
      return reply.code(404).send({ error: 'Record not found' });
    }

    return { success: true, message: 'Value written successfully', changes: result.changes };
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ error: 'Database write failed', details: err.message });
  }
});

// =============================================
// 📋 LIST (Paginated)
// =============================================
fastify.get('/api/list', async (request, reply) => {
  const { table, limit = 100, offset = 0 } = request.query;

  if (!table) return reply.code(400).send({ error: 'Missing parameter: table required' });
  if (!allowedTables[table]) return reply.code(400).send({ error: 'Invalid table' });

  const sql = `SELECT * FROM ${table} LIMIT ? OFFSET ?`;
  const rows = dbAll(sql, [limit, offset]);

  return { success: true, count: rows.length, data: rows };
});

// =============================================
// 🚀 Start Server
// =============================================
const PORT = process.env.PORT || 3006;

fastify.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Using SQLite at: ${DB_PATH}`);
  })
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });

// =============================================
// 🧹 Graceful Shutdown with WAL Checkpoint
// =============================================
const shutdown = (signal) => {
  console.log(`🛑 ${signal} received. Cleaning up...`);

  try {
    console.log('🔄 Performing WAL checkpoint...');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    console.log('✅ Database closed cleanly');
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
