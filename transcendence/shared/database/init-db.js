const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// ← GEÄNDERT: .db statt .sqlite!
const DB_PATH = path.join(__dirname, 'transcendence.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initDatabase() {
  console.log('🗄️  Checking database...');
  console.log('📁 DB Path:', DB_PATH);
  
  // Check if schema exists
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error('❌ schema.sql not found at:', SCHEMA_PATH);
    process.exit(1);
  }
  
  // 🔥 FIXED: Only create database if it doesn't exist
  if (fs.existsSync(DB_PATH)) {
    console.log('✅ Database already exists, skipping initialization');
    console.log('📊 Existing database size:', fs.statSync(DB_PATH).size, 'bytes');
    
    // Just ensure permissions are correct for existing database
    try {
      fs.chmodSync(DB_PATH, 0o666);
      const dbDir = path.dirname(DB_PATH);
      fs.chmodSync(dbDir, 0o777);
      console.log('✅ Database permissions verified');
    } catch (chmodErr) {
      console.error('⚠️  Could not set permissions:', chmodErr.message);
    }
    
    console.log('🎉 Database ready (existing data preserved)!');
    return;
  }
  
  // Only create new database if it doesn't exist
  console.log('📝 Creating new database...');
  
  // Neue DB erstellen
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error creating database:', err);
      process.exit(1);
    }
    console.log('✅ New database file created');
  });
  
  // Schema laden
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  
  // Schema ausführen
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Error executing schema:', err);
      console.error('SQL Error:', err.message);
      process.exit(1);
    }
    console.log('✅ Schema created successfully');
    
    // Test-Daten einfügen
    insertTestData(db);
  });
}

function insertTestData(db) {
  console.log('📝 Inserting initial test data for NEW database...');
  
  const testUsers = `
    INSERT INTO Users (username, email, password_hash, display_name, is_guest)
    VALUES 
      ('testuser', 'test@test.test', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Alice', 0);
  `;
  
  db.exec(testUsers, (err) => {
    if (err) {
      console.error('⚠️  Error inserting test data:', err);
    } else {
      console.log('✅ Initial test data inserted (1 user: testuser)');
    }
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('🎉 NEW Database initialization complete!');
        
        // ════════════════════════════════════════════════════════════
        // ✨ NEU: PERMISSIONS SETZEN! ✨
        // ════════════════════════════════════════════════════════════
        try {
          // DB File Permissions: rw-rw-rw-
          fs.chmodSync(DB_PATH, 0o666);
          console.log('✅ Database file permissions set to 666 (rw-rw-rw-)');
          
          // Ordner Permissions: rwxrwxrwx
          const dbDir = path.dirname(DB_PATH);
          fs.chmodSync(dbDir, 0o777);
          console.log('✅ Database directory permissions set to 777 (rwxrwxrwx)');
          
          // Check final permissions
          const stats = fs.statSync(DB_PATH);
          console.log('📊 Final file permissions:', (stats.mode & parseInt('777', 8)).toString(8));
        } catch (chmodErr) {
          console.error('⚠️  Could not change permissions:', chmodErr.message);
          console.error('    This will cause write errors in other services!');
        }
        // ════════════════════════════════════════════════════════════
      }
    });
  });
}

// Run it
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };