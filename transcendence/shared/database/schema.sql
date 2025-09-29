-- ft_transcendence SQLite Schema

-- Users and Authentication
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles and Stats
CREATE TABLE user_stats (
    user_id INTEGER PRIMARY KEY,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Games
CREATE TABLE games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER,
    winner_id INTEGER,
    final_score TEXT,
    game_state TEXT, -- JSON blob for current state
    status TEXT DEFAULT 'waiting',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    FOREIGN KEY (player1_id) REFERENCES users(id),
    FOREIGN KEY (player2_id) REFERENCES users(id),
    FOREIGN KEY (winner_id) REFERENCES users(id)
);

-- Tournaments
CREATE TABLE tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bracket TEXT, -- JSON blob
    status TEXT DEFAULT 'registration',
    winner_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (winner_id) REFERENCES users(id)
);

-- Tournament Participants
CREATE TABLE tournament_players (
    tournament_id INTEGER,
    player_id INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id, player_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (player_id) REFERENCES users(id)
);

-- Application Logs
CREATE TABLE application_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT, -- JSON blob
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, email, password_hash, display_name) VALUES
('admin', 'admin@transcendence.com', '$2b$10$rqiU7VNSMuFgwdXaK/2Gie8GskBUYFr8fI7RO7kI2GjOt1.3fE9Ym', 'Admin User'),
('player1', 'player1@test.com', '$2b$10$rqiU7VNSMuFgwdXaK/2Gie8GskBUYFr8fI7RO7kI2GjOt1.3fE9Ym', 'Player One'),
('player2', 'player2@test.com', '$2b$10$rqiU7VNSMuFgwdXaK/2Gie8GskBUYFr8fI7RO7kI2GjOt1.3fE9Ym', 'Player Two');

-- Default password for all test users is 'password123'
