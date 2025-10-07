const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file location
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/transcendence.db');

// Create data directory if it doesn't exist
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
	if (err) {
		console.error('❌ Database connection error:', err);
		process.exit(1);
	} else {
		console.log('✅ Connected to SQLite database at:', DB_PATH);

		// Enable foreign keys
		db.run('PRAGMA foreign_keys = ON');
	}
});

// Helper function to run migrations
const runMigrations = () => {
	const migrationsPath = path.join(__dirname, '../database/migrations');

	if (!fs.existsSync(migrationsPath)) {
		console.log('⚠️  No migrations folder found');
		return;
	}

	const files = fs.readdirSync(migrationsPath)
		.filter(f => f.endsWith('.sql'))
		.sort();

	files.forEach(file => {
		const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
		db.exec(sql, (err) => {
			if (err) {
				console.error(`❌ Migration ${file} failed:`, err);
			} else {
				console.log(`✅ Migration ${file} completed`);
			}
		});
	});
};

// Run migrations on startup
runMigrations();

// Promisify database methods for easier async/await usage
const dbRun = (sql, params = []) => {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (err) {
			if (err) reject(err);
			else resolve({ lastID: this.lastID, changes: this.changes });
		});
	});
};

const dbGet = (sql, params = []) => {
	return new Promise((resolve, reject) => {
		db.get(sql, params, (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	});
};

const dbAll = (sql, params = []) => {
	return new Promise((resolve, reject) => {
		db.all(sql, params, (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
};

module.exports = {
	db,
	dbRun,
	dbGet,
	dbAll
};