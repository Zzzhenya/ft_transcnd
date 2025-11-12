-- ============================================
-- FT_TRANSCENDENCE - Your Exact DBML Schema
-- ============================================

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    is_guest BOOLEAN DEFAULT 0,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    
    -- OAuth / 42 Integration
    intra_id INTEGER UNIQUE,
    oauth_provider VARCHAR(20),
    email_verified BOOLEAN DEFAULT 0,
    
    -- Profile
    display_name VARCHAR(100) UNIQUE,
    avatar_url VARCHAR(255),
    bio TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'offline',
    current_match_id INTEGER,
    
    -- Security
    mfa_enabled BOOLEAN DEFAULT 0,
    mfa_secret VARCHAR(255),
    mfa_backup_codes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    
    jwt VARCHAR(512),
    tocken VARCHAR(512)
);

CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_intra_id ON Users(intra_id);

-- ============ FRIENDS ============
CREATE TABLE IF NOT EXISTS Friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_friends_user ON Friends(user_id);
CREATE INDEX idx_friends_friend ON Friends(friend_id);

-- ============ BLOCKED USERS ============
CREATE TABLE IF NOT EXISTS Blocked_Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    blocked_user_id INTEGER NOT NULL,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE(user_id, blocked_user_id)
);

CREATE INDEX idx_blocked_user ON Blocked_Users(user_id);

-- ============ TOURNAMENT ============
CREATE TABLE IF NOT EXISTS Tournament (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100),
    description TEXT,
    
    status VARCHAR(20) DEFAULT 'registration',
    player_count INTEGER NOT NULL,
    current_players INTEGER DEFAULT 0,
    
    winner_id INTEGER,
    winner_username VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    
    FOREIGN KEY (winner_id) REFERENCES Users(id)
);

CREATE INDEX idx_tournament_status ON Tournament(status);

-- ============ TOURNAMENT PLAYERS ============
CREATE TABLE IF NOT EXISTS Tournament_Players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    tournament_alias VARCHAR(50) NOT NULL,
    
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES Tournament(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_players ON Tournament_Players(tournament_id);

-- ============ MATCHES TOURNAMENT ============
CREATE TABLE IF NOT EXISTS Matches_Tournament (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    
    -- Tournament Info
    round INTEGER,
    match_number INTEGER,
    
    -- Players
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    
    -- Results
    winner_id INTEGER,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    
    -- Match Details
    status VARCHAR(20) DEFAULT 'waiting',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES Tournament(id) ON DELETE CASCADE,
    FOREIGN KEY (player1_id) REFERENCES Users(id),
    FOREIGN KEY (player2_id) REFERENCES Users(id),
    FOREIGN KEY (winner_id) REFERENCES Users(id)
);

CREATE INDEX idx_match_tournament ON Matches_Tournament(tournament_id);
CREATE INDEX idx_match_players ON Matches_Tournament(player1_id, player2_id);
CREATE INDEX idx_match_status ON Matches_Tournament(status);

-- ============ REMOTE MATCH (1v1) ============
CREATE TABLE IF NOT EXISTS Remote_Match (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Players
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    
    -- Results
    winner_id INTEGER,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    
    -- Match Details
    status VARCHAR(20) DEFAULT 'waiting',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    
    FOREIGN KEY (player1_id) REFERENCES Users(id),
    FOREIGN KEY (player2_id) REFERENCES Users(id),
    FOREIGN KEY (winner_id) REFERENCES Users(id)
);

CREATE INDEX idx_remote_match_players ON Remote_Match(player1_id, player2_id);
CREATE INDEX idx_remote_match_status ON Remote_Match(status);

-- ============ GAME INVITATIONS ============
CREATE TABLE IF NOT EXISTS Game_Invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    is_tournament BOOLEAN DEFAULT 0,
    
    game_id INTEGER,
    game_mode VARCHAR(20) DEFAULT 'normal',
    
    status VARCHAR(20) DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    responded_at TIMESTAMP,
    
    FOREIGN KEY (from_user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX idx_game_inv_from ON Game_Invitations(from_user_id);
CREATE INDEX idx_game_inv_to ON Game_Invitations(to_user_id);
CREATE INDEX idx_game_inv_status ON Game_Invitations(status);

-- ============ SAMPLE DATA ============
INSERT INTO Users (username, email, password_hash, display_name, Guest) VALUES
('admin', 'admin@transcendence.com', '$2b$10$rqiU7VNSMuFgwdXaK/2Gie8GskBUYFr8fI7RO7kI2GjOt1.3fE9Ym', 'Admin User', 0),
('player1', 'player1@test.com', '$2b$10$rqiU7VNSMuFgwdXaK/2Gie8GskBUYFr8fI7RO7kI2GjOt1.3fE9Ym', 'Player One', 0),
('player2', 'player2@test.com', '$2b$10$rqiU7VNSMuFgwdXaK/2Gie8GskBUYFr8fI7RO7kI2GjOt1.3fE9Ym', 'Player Two', 0);

-- Default password: 'password123'