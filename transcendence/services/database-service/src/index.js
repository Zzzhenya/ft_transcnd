// database-service.js
import Fastify from 'fastify';
import path from 'path';
import fs from 'fs';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import PQueue from 'p-queue';

// =============== Fastify Setup ===============
const fastify = Fastify({ logger: true });
fastify.register(cors);


// =============== Config ===============
const DB_PATH = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('sqlite:', '')
  : '/app/shared/database/transcendence.db';

const dirPath = '/app/shared/database';
const fileName = 'transcendence.db'

const watcher = fs.watch(dirPath, (eventType, changedFile) => {
  if (changedFile === fileName) {
    console.log(`✅ File detected: ${DB_PATH}`);
    watcher.close();
  }
});

// const dir = path.dirname(DB_PATH);
// if (!fs.existsSync(dir)) {
//   fs.mkdirSync(dir, { recursive: true });
//   console.log(`📁 Created missing directory: ${dir}`);
// }

const DB_SERVICE_TOKEN = process.env.DB_SERVICE_TOKEN || 'super_secret_internal_token';
const PORT = 3006;

console.log('📍 Connecting to SQLite database at:', DB_PATH);

// =============== Database Init ===============
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

console.log('✅ SQLite ready (WAL mode ON)');

const writeQueue = new PQueue({ concurrency: 1 });

// =============== Helpers ===============
const dbRun = (sql, params = []) => db.prepare(sql).run(params);
const dbGet = (sql, params = []) => db.prepare(sql).get(params);
const dbAll = (sql, params = []) => db.prepare(sql).all(params);

function safeIdentifier(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `"${name}"`;
}

// =============== Schema Discovery ===============
function getTablesAndColumns() {
  const tables = {};
  const tableRows = dbAll(`
    SELECT name 
    FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%';
  `);

  for (const { name } of tableRows) {
    const tableSafe = safeIdentifier(name);
    try {
      const columns = dbAll(`PRAGMA table_info(${tableSafe})`).map(c => c.name);
      tables[name] = columns;
    } catch (err) {
      console.warn(`⚠️ Could not read schema for table ${name}:`, err.message);
    }
  }

  return tables;
}

// Initial schema discovery
const allowedTables = getTablesAndColumns();

if (process.env.NODE_ENV !== 'production') {
  console.log('📋 Tables discovered:', allowedTables);
}

function validateTableColumn(table, column) {
  return allowedTables[table] && (!column || allowedTables[table].includes(column));
}

// ================= Security Middleware =================
fastify.addHook('onRequest', async (req, reply) => {
  // const token = req.headers['x-service-auth'];
  // if (token !== DB_SERVICE_TOKEN) {
  //   req.log.warn('🚫 Unauthorized access attempt to database service');
  //   return reply.code(403).send({ error: 'Forbidden: internal access only' });
  // }
});

// ================= Routes =================

// 🩺 Health check
fastify.get('/health', async () => ({
  status: 'ok',
  service: 'database-service',
  database: 'sqlite',
  wal_mode: db.pragma('journal_mode', { simple: true }),
  tables: Object.keys(allowedTables),
  timestamp: new Date().toISOString(),
}));

// 📑 Schema view (manual)
fastify.get('/internal/schema', async () => ({
  success: true,
  tables: allowedTables,
  refreshedAt: new Date().toISOString(),
}));

// 📦 POST /internal/query
fastify.post('/internal/query', async (request, reply) => {
  // console.log(request);
  fastify.log.info({ body: request.body }, 'Incoming query request');
  fastify.log.error("1")
  const { table, columns = '*', filters = {}, limit = 100, offset = 0 } = request.body;
  fastify.log.error("2")
  // 1️⃣ Validate table
  if (!allowedTables[table]) {
    fastify.log.error("3")
    console.log('Invalid table', table)
    return reply.code(400).send({ error: 'Invalid table' });
  }
  fastify.log.error("4")
  // 2️⃣ Validate requested columns
  let sqlColumns = '*';
  if (columns !== '*') {
    fastify.log.error("5")
    const invalidCols = columns.filter(c => !validateTableColumn(table, c));
    if (invalidCols.length > 0){
      fastify.log.error("6")
      console.log('Invalid columns', invalidCols)
      return reply.code(400).send({ error: 'Invalid columns', invalidCols });}
    sqlColumns = columns.map(safeIdentifier).join(', ');
  }
  fastify.log.error("7")
  // 3️⃣ Build WHERE clause safely
  const whereClauses = [];
  const values = [];
  for (const [col, val] of Object.entries(filters)) {
    fastify.log.error("8")
    if (!validateTableColumn(table, col)) {
      fastify.log.error("9")
      console.log('Invalid filer column', col)
      return reply.code(400).send({ error: 'Invalid filter column', column: col });
    }
    whereClauses.push(`${safeIdentifier(col)} = ?`);
    values.push(val);
  }
  fastify.log.error("10")
  const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 4️⃣ Construct final SQL
  const sql = `SELECT ${sqlColumns} FROM ${safeIdentifier(table)} ${whereSQL} LIMIT ? OFFSET ?`;
  values.push(limit, offset);
  fastify.log.error("11")
  // 5️⃣ Execute
  try {
    fastify.log.error("12")
    const rows = dbAll(sql, values);
    fastify.log.error("13")
    // console.log(rows);
    // return reply.code(200).send({ success: true, count: rows.length, data: rows });
    // return { success: true, count: rows.length, data: rows };
    fastify.log.error("result: ", rows ? rows : null)
    return reply.code(200).send({ success: true, data: rows ? rows : null });
    // return rows ? rows : null;
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ error: 'Database query failed', details: err.message });
  }
});


// 🔍 READ
fastify.get('/internal/read', async (request, reply) => {
  const { table, columns = 'id', id } = request.query;
  if (!table || !id)
    return reply.code(400).send({ error: 'Missing parameters: table, id required' });

  if (!allowedTables[table])
    return reply.code(400).send({ error: 'Invalid table' });

  const requestedColumns = columns.split(',').map(c => c.trim());
  const invalidCols = requestedColumns.filter(c => !validateTableColumn(table, c));
  if (invalidCols.length > 0)
    return reply.code(400).send({ error: 'Invalid column(s)', invalidCols });

  const sql = `SELECT ${requestedColumns.map(safeIdentifier).join(', ')} FROM ${safeIdentifier(table)} WHERE id = ?`;
  const row = dbGet(sql, [id]);
  if (!row) return reply.code(404).send({ error: 'Record not found' });

  return { success: true, data: row };
});

// ✏️ WRITE
fastify.post('/internal/write', async (request, reply) => {
  const { table, id, column, value } = request.body;
  if (!table || !id || !column || value === undefined)
    return reply.code(400).send({ error: 'Missing parameters' });

  if (!validateTableColumn(table, column))
    return reply.code(400).send({ error: 'Invalid table or column' });

  const sql = `UPDATE ${safeIdentifier(table)} SET ${safeIdentifier(column)} = ? WHERE id = ?`;

  try {
    const result = await writeQueue.add(() =>
      db.transaction(() => dbRun(sql, [value, id]))()
    );

    if (result.changes === 0)
      return reply.code(404).send({ error: 'Record not found' });

    return { success: true, message: 'Value written successfully', changes: result.changes };
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ error: 'Database write failed', details: err.message });
  }
});

// 📋 LIST
fastify.get('/internal/list', async (request, reply) => {
  const { table, columns = '*', limit = 100, offset = 0 } = request.query;
  if (!table) return reply.code(400).send({ error: 'Missing parameter: table required' });

  if (!allowedTables[table]) return reply.code(400).send({ error: 'Invalid table' });

  let sqlColumns = '*';
  if (columns !== '*') {
    const requestedColumns = columns.split(',').map(c => c.trim());
    const invalidCols = requestedColumns.filter(c => !validateTableColumn(table, c));
    if (invalidCols.length > 0)
      return reply.code(400).send({ error: 'Invalid column(s)', invalidCols });
    sqlColumns = requestedColumns.map(safeIdentifier).join(', ');
  }

  const sql = `SELECT ${sqlColumns} FROM ${safeIdentifier(table)} LIMIT ? OFFSET ?`;
  const rows = dbAll(sql, [limit, offset]);
  return { success: true, count: rows.length, data: rows };
});

// ================= Start Server =================
fastify.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => console.log(`🔒 Database service running internally on port ${PORT}`))
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });

// ================= Graceful Shutdown =================
function shutdown(signal) {
  console.log(`🛑 ${signal} received, shutting down...`);
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    console.log('✅ Database closed cleanly');
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ====== REFRESH SCHEMA REMOVED ======
// setInterval(refreshSchema, 60_000);
