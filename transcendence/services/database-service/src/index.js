// database-service.js
import Fastify from 'fastify';
import path from 'path';
import fs from 'fs';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import PQueue from 'p-queue';
import { registerRemoteMatchRoutes } from './remoteMatchRoutes.js';
import logger from './utils/logger.js';

// =============== Fastify Setup ===============
const fastify = Fastify({ logger: true });
fastify.register(cors);


// =============== Config ===============
const DB_PATH = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('sqlite:', '')
  : '/app/shared/database/transcendence.db';

logger.info('Waiting for database file', { path: DB_PATH });

const interval = setInterval(() => {
  if (fs.existsSync(DB_PATH)) {
    logger.info('Database file detected', { path: DB_PATH });
    clearInterval(interval);

    // Wait 5 more seconds
    setTimeout(() => {
      logger.info('Extra wait completed, proceeding with startup');
      // continue your logic here
    }, 5000);
  }
}, 5000);

function findFile(startPath, fileName) {
  let result = null;

  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        searchDir(filePath); // recurse
      } else if (file === fileName) {
        result = filePath;
        logger.info('Found file', { path: result });
        return;
      }
    }
  }

  if (fs.existsSync(startPath)) {
    searchDir(startPath);
  } else {
    logger.error('Start path not found', { startPath });
  }

  if (!result) logger.warn('File not found', { fileName });
  return result;
}

// Example:
findFile('/app', 'transcendence.db');

// const dir = path.dirname(DB_PATH);
// if (!fs.existsSync(dir)) {
//   fs.mkdirSync(dir, { recursive: true });
//   console.log(`📁 Created missing directory: ${dir}`);
// }

const DB_SERVICE_TOKEN = process.env.DB_SERVICE_TOKEN || 'super_secret_internal_token';
const PORT = 3006;

// =============== Timeout Configuration ===============
const DB_QUEUE_TIMEOUT = parseInt(process.env.DB_QUEUE_TIMEOUT || '8000'); // 8 seconds
const DB_QUEUE_MAX_SIZE = parseInt(process.env.DB_QUEUE_MAX_SIZE || '100');

logger.info('Connecting to SQLite database', { path: DB_PATH });
logger.info('Database queue timeout', { timeoutMs: DB_QUEUE_TIMEOUT });
logger.info('Database queue max size', { maxSize: DB_QUEUE_MAX_SIZE });

// =============== Database Init ===============
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

logger.info('SQLite ready (WAL mode ON)');

// =============== Queue Setup with Timeout ===============
const writeQueue = new PQueue({ 
  concurrency: 1,
  timeout: DB_QUEUE_TIMEOUT,
  throwOnTimeout: true
});

// Queue monitoring
writeQueue.on('add', () => {
  logger.debug('Queue add', { size: writeQueue.size, pending: writeQueue.pending });
});

writeQueue.on('next', () => {
  logger.debug('Queue next', { remaining: writeQueue.size });
});

writeQueue.on('error', (error) => {
  logger.error('Queue error', { error: error && error.message ? error.message : String(error) });
});

// Function to add with timeout and queue size check
const addToQueue = async (fn) => {
  if (writeQueue.size >= DB_QUEUE_MAX_SIZE) {
    throw new Error(`Queue full: ${writeQueue.size}/${DB_QUEUE_MAX_SIZE} items`);
  }
  
  return writeQueue.add(fn, { 
    timeout: DB_QUEUE_TIMEOUT 
  });
};

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
  logger.debug('Tables discovered', { tables: allowedTables });
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
  queue: {
    size: writeQueue.size,
    pending: writeQueue.pending,
    isPaused: writeQueue.isPaused
  },
  timestamp: new Date().toISOString(),
}));

// 📊 Queue status endpoint
fastify.get('/internal/queue-status', async () => ({
  success: true,
  queue: {
    size: writeQueue.size,
    pending: writeQueue.pending,
    isPaused: writeQueue.isPaused,
    maxSize: DB_QUEUE_MAX_SIZE,
    timeout: DB_QUEUE_TIMEOUT,
    utilization: (writeQueue.size / DB_QUEUE_MAX_SIZE) * 100
  },
  timestamp: new Date().toISOString()
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
    logger.warn('Invalid table requested', { table });
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
      logger.warn('Invalid columns requested', { invalidCols });
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
      logger.warn('Invalid filter column', { column: col });
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
  logger.debug('Query execute', { values, sql });
    const rows = dbAll(sql, values);
  fastify.log.error("13")
  logger.debug('Query result rows', { count: rows ? rows.length : 0 });
    // console.log(rows);
    // return reply.code(200).send({ success: true, count: rows.length, data: rows });
    // return { success: true, count: rows.length, data: rows };
  logger.info('Query result', { count: rows ? rows.length : 0 });
  return reply.code(200).send({ success: true, data: rows ? rows : null });
    // return rows ? rows : null;
  } catch (err) {
    fastify.log.error(err);
    logger.error('Insert failed', { err: err && err.message ? err.message : String(err) });
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

// ✏️ /internal/users
fastify.post('/internal/users', async (request, reply) => {
  const { table, action, values } = request.body;

  if (!table || action !== 'insert' || !values) {
    return reply.code(400).send({ error: 'Missing or invalid parameters' });
  }

  if (!allowedTables[table]) {
    return reply.code(400).send({ error: 'Invalid table name' });
  }

  // Validate all provided columns
  const cols = Object.keys(values);
  const invalidCols = cols.filter(c => !validateTableColumn(table, c));
  if (invalidCols.length > 0) {
    return reply.code(400).send({ error: 'Invalid column(s)', invalidCols });
  }

  // Build SQL dynamically
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT INTO ${safeIdentifier(table)} (${cols.map(safeIdentifier).join(', ')}) VALUES (${placeholders})`;

  try {
    const result = await addToQueue(() =>
      db.transaction(() => dbRun(sql, Object.values(values)))()
    );

    // ✅ Return the lastInsertRowid from SQLite
    return { success: true, id: result.lastInsertRowid, changes: result.changes };
  } catch (err) {
  fastify.log.error(err);
  logger.error('Write failed', { err: err && err.message ? err.message : String(err) });
    
    // Handle timeout errors specifically
    if (err.name === 'TimeoutError') {
      return reply.code(504).send({ 
        error: 'Database operation timed out', 
        details: 'Request took longer than expected to process',
        queueStatus: {
          size: writeQueue.size,
          pending: writeQueue.pending
        }
      });
    }
    
    // Handle queue full errors
    if (err.message.includes('Queue full')) {
      return reply.code(503).send({ 
        error: 'Service temporarily unavailable', 
        details: err.message,
        queueStatus: {
          size: writeQueue.size,
          maxSize: DB_QUEUE_MAX_SIZE
        }
      });
    }
    
    return reply.code(500).send({ error: 'Database insert failed', details: err.message });
  }
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
    const result = await addToQueue(() =>
      db.transaction(() => dbRun(sql, [value, id]))()
    );

    if (result.changes === 0)
      return reply.code(404).send({ error: 'Record not found' });

    return { success: true, message: 'Value written successfully', changes: result.changes };
  } catch (err) {
  fastify.log.error(err);
  logger.error('Delete failed', { err: err && err.message ? err.message : String(err) });
    
    // Handle timeout errors specifically
    if (err.name === 'TimeoutError') {
      return reply.code(504).send({ 
        error: 'Database operation timed out', 
        details: 'Request took longer than expected to process',
        queueStatus: {
          size: writeQueue.size,
          pending: writeQueue.pending
        }
      });
    }
    
    // Handle queue full errors
    if (err.message.includes('Queue full')) {
      return reply.code(503).send({ 
        error: 'Service temporarily unavailable', 
        details: err.message,
        queueStatus: {
          size: writeQueue.size,
          maxSize: DB_QUEUE_MAX_SIZE
        }
      });
    }
    
    return reply.code(500).send({ error: 'Database write failed', details: err.message });
  }
});

// �️ DELETE
fastify.post('/internal/delete', async (request, reply) => {
  const { table, filters } = request.body;
  
  if (!table || !filters) {
    return reply.code(400).send({ error: 'Missing parameters: table and filters required' });
  }

  if (!allowedTables[table]) {
    return reply.code(400).send({ error: 'Invalid table name' });
  }

  // Build WHERE clause from filters
  const whereConditions = [];
  const whereValues = [];
  
  for (const [column, value] of Object.entries(filters)) {
    if (!validateTableColumn(table, column)) {
      return reply.code(400).send({ error: `Invalid column: ${column}` });
    }
    whereConditions.push(`${safeIdentifier(column)} = ?`);
    whereValues.push(value);
  }

  if (whereConditions.length === 0) {
    return reply.code(400).send({ error: 'No valid filters provided' });
  }

  const sql = `DELETE FROM ${safeIdentifier(table)} WHERE ${whereConditions.join(' AND ')}`;

  try {
    const result = await addToQueue(() =>
      db.transaction(() => dbRun(sql, whereValues))()
    );

    if (result.changes === 0) {
      return reply.code(404).send({ error: 'No records found to delete' });
    }

    return { success: true, message: 'Record(s) deleted successfully', changes: result.changes };
  } catch (err) {
    fastify.log.error(err);
    
    // Handle timeout errors specifically
    if (err.name === 'TimeoutError') {
      return reply.code(504).send({ 
        error: 'Database operation timed out', 
        details: 'Request took longer than expected to process',
        queueStatus: {
          size: writeQueue.size,
          pending: writeQueue.pending
        }
      });
    }
    
    // Handle queue full errors
    if (err.message.includes('Queue full')) {
      return reply.code(503).send({ 
        error: 'Service temporarily unavailable', 
        details: err.message,
        queueStatus: {
          size: writeQueue.size,
          maxSize: DB_QUEUE_MAX_SIZE
        }
      });
    }
    
    return reply.code(500).send({ error: 'Database delete failed', details: err.message });
  }
});

// �📋 LIST
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

// ================= REMOTE MATCH ROUTES =================
registerRemoteMatchRoutes(fastify, {
  db,
  dbRun,
  dbGet,
  addToQueue,
  writeQueue,
  allowedTables,
});

// ================= Start Server =================
fastify.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => logger.info('Database service running internally', { port: PORT }))
  .catch(err => {
    fastify.log.error(err);
    logger.error('Failed to start database service', { err: err && err.message ? err.message : String(err) });
    process.exit(1);
  });

// ================= Graceful Shutdown =================
function shutdown(signal) {
  logger.info('Shutdown signal received', { signal });
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    logger.info('Database closed cleanly');
  } catch (err) {
    logger.error('Error during shutdown', { err: err && err.message ? err.message : String(err) });
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ====== REFRESH SCHEMA REMOVED ======
// setInterval(refreshSchema, 60_000);