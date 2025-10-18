// server.js
import Fastify, {FastifyRequest, FastifyReply}  from 'fastify';
import { initDB } from './setupDatabase.js';

const fastify = Fastify({ logger: true });
const db = initDB();

// Example table
db.prepare(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId TEXT,
    lastActive DATETIME,
    status INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Simple endpoint to record match result
fastify.post('/session', async (req, reply) => {
  const { sessionId, time, status } = req.body as {
    sessionId: string;
    time: string;
    status: number;
  };

  try {
    const stmt = db.prepare(`
      INSERT INTO sessions (sessionId, time, status)
      VALUES (?, ?, ?)
    `);
    stmt.run(sessionId, time, status);

    return { success: true };
  } catch (err) {
    req.log.error(err);
    reply.status(500).send({ error: 'Database error' });
  }
});

// Endpoint to get recent matches
fastify.get('/sessions', async (req, reply) => {
  const rows = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 50').all();
  return rows;
});

fastify.listen({ port: 3010 });