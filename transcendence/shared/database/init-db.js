const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initDatabase() {
  console.log('🗄️  Initializing database...');
  
  // Alte DB löschen (NUR für Development!)
  if (fs.existsSync(DB_PATH)) {
    console.log('⚠️  Removing old database...');
    fs.unlinkSync(DB_PATH);
  }
  
  // Neue DB erstellen
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error creating database:', err);
      process.exit(1);
    }
    console.log('✅ Database file created');
  });
  
  // Schema laden
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  
  // Schema ausführen
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Error executing schema:', err);
      process.exit(1);
    }
    console.log('✅ Schema created successfully');
    
    // Test-Daten einfügen (optional)
    insertTestData(db);
  });
}

function insertTestData(db) {
  console.log('📝 Inserting test data...');
  
  const testUsers = `
    INSERT INTO Users (username, email, password_hash, display_name, is_guest)
    VALUES 
      ('alice', 'alice@example.com', '$2b$10$hash1', 'Alice', 0),
      ('bob', 'bob@example.com', '$2b$10$hash2', 'Bob', 0),
      ('guest1', 'guest1@example.com', NULL, 'Guest Player', 1);
  `;
  
  db.exec(testUsers, (err) => {
    if (err) {
      console.error('⚠️  Error inserting test data:', err);
    } else {
      console.log('✅ Test data inserted');
    }
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('🎉 Database initialization complete!');
      }
    });
  });
}

// Run it
initDatabase();