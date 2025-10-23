// setupDatabase.ts

// import path from 'path';

// const dbPath = path.resolve('/shared/test-db/database.sqlite');
import Database from 'better-sqlite3';

export function initDB(): Database.Database {
  const db = new Database('/shared/test-db/pong.sqlite');
  db.pragma('journal_mode = WAL');      // Enables WAL mode
  db.pragma('synchronous = NORMAL');    // Faster writes (can use FULL for durability)
  db.pragma('busy_timeout = 5000');     // Wait up to 5s if the database is locked
  return db;
}