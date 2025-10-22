// const sqlite3 = require('sqlite3').verbose();
// const fs = require('fs');
// const path = require('path');

// const DB_PATH = path.join(__dirname, 'transcendence.db');
// const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// function initDatabase() {
//   console.log('🗄️  Initializing database...');
  
//   // Alte DB löschen (NUR für Development!)
//   if (fs.existsSync(DB_PATH)) {
//     console.log('⚠️  Removing old database...');
//     fs.unlinkSync(DB_PATH);
//   }
  
//   // Neue DB erstellen
//   const db = new sqlite3.Database(DB_PATH, (err) => {
//     if (err) {
//       console.error('❌ Error creating database:', err);
//       process.exit(1);
//     }
//     console.log('✅ Database file created');
//   });
  
//   // Schema laden
//   const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  
//   // Schema ausführen
//   db.exec(schema, (err) => {
//     if (err) {
//       console.error('❌ Error executing schema:', err);
//       process.exit(1);
//     }
//     console.log('✅ Schema created successfully');
    
//     // Test-Daten einfügen (optional)
//     insertTestData(db);
//   });
// }

// function insertTestData(db) {
//   console.log('📝 Inserting test data...');
  
//   const testUsers = `
//     INSERT INTO Users (username, email, password_hash, display_name, is_guest)
//     VALUES 
//       ('alice', 'alice@example.com', '$2b$10$hash1', 'Alice', 0),
//       ('bob', 'bob@example.com', '$2b$10$hash2', 'Bob', 0),
//       ('guest1', 'guest1@example.com', NULL, 'Guest Player', 1);
//   `;
  
//   db.exec(testUsers, (err) => {
//     if (err) {
//       console.error('⚠️  Error inserting test data:', err);
//     } else {
//       console.log('✅ Test data inserted');
//     }
    
//     db.close((err) => {
//       if (err) {
//         console.error('❌ Error closing database:', err);
//       } else {
//         console.log('🎉 Database initialization complete!');
//       }
//     });
//   });
// }

// // Run it
// initDatabase();


const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'transcendence.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initDatabase() {
  console.log('🗄️  Initializing database...');
  console.log('📁 DB Path:', DB_PATH);
  
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error('❌ schema.sql not found at:', SCHEMA_PATH);
    process.exit(1);
  }
  
  if (fs.existsSync(DB_PATH)) {
    console.log('⚠️  Removing old database...');
    fs.unlinkSync(DB_PATH);
  }
  
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error creating database:', err);
      process.exit(1);
    }
    console.log('✅ Database file created');
  });
  
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Error executing schema:', err);
      console.error('SQL Error:', err.message);
      process.exit(1);
    }
    console.log('✅ Schema created successfully');
    
    insertTestData(db);
  });
}

function insertTestData(db) {
  console.log('📝 Inserting test data...');
  
  const testUsers = `
    INSERT INTO Users (username, email, password_hash, display_name, is_guest)
    VALUES 
      ('alice', 'alice@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Alice', 0),
      ('bob', 'bob@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Bob', 0),
      ('charlie', 'charlie@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Charlie', 0),
      ('david', 'david@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'David', 0);
  `;
  
  db.exec(testUsers, (err) => {
    if (err) {
      console.error('⚠️  Error inserting test data:', err);
    } else {
      console.log('✅ Test data inserted (4 users)');
    }
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('🎉 Database initialization complete!');
        
        // ← NEU: Permissions setzen!
        try {
          fs.chmodSync(DB_PATH, 0o666); // rw-rw-rw-
          console.log('✅ Database permissions set to 666');
        } catch (chmodErr) {
          console.error('⚠️  Could not change permissions:', chmodErr.message);
        }
      }
    });
  });
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };