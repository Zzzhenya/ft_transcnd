-- Add profile features to users table
-- Migration: 002_add_user_profile_features.sql

-- Add avatar column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT NULL;

-- Add display_name column if needed
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) DEFAULT NULL;

-- Add bio column for user description
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;

-- Add last_login tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP DEFAULT NULL;

-- Add status column (online, offline, away)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline';

-- Create game_stats table for user statistics
CREATE TABLE IF NOT EXISTS game_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create matches table for game history
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    duration INTEGER DEFAULT 0, -- in seconds
    game_type VARCHAR(50) DEFAULT 'classic',
    status VARCHAR(20) DEFAULT 'completed', -- pending, in_progress, completed, abandoned
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon VARCHAR(50) DEFAULT '🏆',
    condition_type VARCHAR(50) NOT NULL, -- games_played, games_won, streak, etc.
    condition_value INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_achievements table (many-to-many)
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Create friends table for friend relationships
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, condition_type, condition_value) VALUES
('First Game', 'Play your first game', '🎮', 'games_played', 1),
('First Victory', 'Win your first game', '🏆', 'games_won', 1),
('Rising Star', 'Win 10 games', '⭐', 'games_won', 10),
('On Fire', 'Win 5 games in a row', '🔥', 'best_streak', 5),
('Master Player', 'Win 50 games', '💎', 'games_won', 50),
('Dedicated', 'Play 100 games', '🎯', 'games_played', 100),
('Champion', 'Win 100 games', '👑', 'games_won', 100),
('Unstoppable', 'Win 10 games in a row', '⚡', 'best_streak', 10),
('Legend', 'Win 500 games', '🌟', 'games_won', 500),
('Perfectionist', 'Achieve 90% win rate with 50+ games', '💯', 'win_rate', 90)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_requester_id ON friends(requester_id);
CREATE INDEX IF NOT EXISTS idx_friends_addressee_id ON friends(addressee_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Create triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_stats_updated_at ON game_stats;
CREATE TRIGGER update_game_stats_updated_at 
    BEFORE UPDATE ON game_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_friends_updated_at ON friends;
CREATE TRIGGER update_friends_updated_at 
    BEFORE UPDATE ON friends 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize game stats for new users
CREATE OR REPLACE FUNCTION init_user_game_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO game_stats (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create game stats when user is created
DROP TRIGGER IF EXISTS init_game_stats_on_user_create ON users;
CREATE TRIGGER init_game_stats_on_user_create
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION init_user_game_stats();

-- Initialize game stats for existing users
INSERT INTO game_stats (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM game_stats);

-- Add constraints for data integrity
ALTER TABLE matches 
ADD CONSTRAINT check_valid_scores CHECK (player1_score >= 0 AND player2_score >= 0);

ALTER TABLE matches 
ADD CONSTRAINT check_winner_is_player CHECK (
    winner_id IS NULL OR winner_id = player1_id OR winner_id = player2_id
);

ALTER TABLE game_stats 
ADD CONSTRAINT check_positive_stats CHECK (
    games_played >= 0 AND games_won >= 0 AND games_lost >= 0 AND 
    games_won <= games_played AND games_lost <= games_played AND
    total_score >= 0 AND best_streak >= 0 AND current_streak >= 0
);