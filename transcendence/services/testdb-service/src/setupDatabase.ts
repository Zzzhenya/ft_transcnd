// setupDatabase.ts

// import path from 'path';

// const dbPath = path.resolve('/shared/test-db/database.sqlite');
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export function initDB(): Database.Database {
  const dbPath = process.env.TESTDB_DATABASE_PATH || '/shared/test-db/pong.sqlite';
  const busyTimeout = parseInt(process.env.DATABASE_BUSY_TIMEOUT || '5000');
  
  // Create directory if it doesn't exist
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`[TESTDB] Created directory: ${dbDir}`);
  }
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');      // Enables WAL mode
  db.pragma('synchronous = NORMAL');    // Faster writes (can use FULL for durability)
  db.pragma(`busy_timeout = ${busyTimeout}`);     // Wait up to 5s if the database is locked
  return db;
}