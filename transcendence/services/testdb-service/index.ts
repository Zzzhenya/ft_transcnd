import Fastify from 'fastify';
import Database from 'better-sqlite3';

const fastify = Fastify();
// const db = new Database('./sessions.db');

export function initDB() {
  const db = new Database('./sessions.db');
  db.pragma('journal_mode = WAL');      // Enables WAL mode
  db.pragma('synchronous = NORMAL');    // Faster writes (can use FULL for durability)
  db.pragma('busy_timeout = 5000');     // Wait up to 5s if the database is locked
  return db;
}

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
)
`);

/*
db.prepare(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1 TEXT,
    player2 TEXT,
    score1 INTEGER,
    score2 INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();


// Simple endpoint to record match result
fastify.post('/match', async (req, reply) => {
  const { player1, player2, score1, score2 } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO matches (player1, player2, score1, score2)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(player1, player2, score1, score2);

    return { success: true };
  } catch (err) {
    req.log.error(err);
    reply.status(500).send({ error: 'Database error' });
  }
});

// Endpoint to get recent matches
fastify.get('/matches', async (req, reply) => {
  const rows = db.prepare('SELECT * FROM matches ORDER BY id DESC LIMIT 50').all();
  return rows;
});

*/

// const SESSION_TTL = 30 * 60 * 1000; // 30 minutes in ms

fastify.listen({ port: 3010 }, err => {
  if (err) throw err;
  console.log('🚀 Server running on http://localhost:3010');
});