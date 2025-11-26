-- ============================================
-- FT_TRANSCENDENCE - Complete Database Schema
-- SQLite Version
-- UPDATED: Friends table with ordered pairs
-- ============================================

-- Drop existing tables (if any)
DROP TABLE IF EXISTS Notifications;
DROP TABLE IF EXISTS Game_Invitations;
DROP TABLE IF EXISTS Messages;
DROP TABLE IF EXISTS Channel_Members;
DROP TABLE IF EXISTS Channels;
DROP TABLE IF EXISTS Tournament_Players;
DROP TABLE IF EXISTS Tournament_Matches;
DROP TABLE IF EXISTS Tournament;
DROP TABLE IF EXISTS Blocked_Users;
DROP TABLE IF EXISTS Friends;
DROP TABLE IF EXISTS Users;

-- -------------------- USERS --------------------
CREATE TABLE Users (
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
  display_name VARCHAR(100),
  avatar VARCHAR(255),
  bio TEXT,
  
  -- Status
  user_status VARCHAR(20) DEFAULT 'registed',
  
  -- Online Status
  last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
  is_online INTEGER DEFAULT 0,
  
  -- Security
  mfa_enabled BOOLEAN DEFAULT 0,
  mfa_secret VARCHAR(255),
  mfa_backup_codes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_intra_id ON Users(intra_id);
CREATE INDEX idx_users_online ON Users(is_online);
CREATE INDEX idx_users_last_seen ON Users(last_seen);

-- -------------------- FRIENDS (UPDATED WITH ORDERED PAIRS) --------------------
CREATE TABLE Friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a_id INTEGER NOT NULL,  -- Always min(user1, user2)
  user_b_id INTEGER NOT NULL,  -- Always max(user1, user2)
  requester_id INTEGER NOT NULL,  -- Who initiated the request
  friends_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  
  FOREIGN KEY (user_a_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES Users(id) ON DELETE CASCADE,
  
  -- CRITICAL: This unique constraint prevents duplicate friend relationships
  UNIQUE(user_a_id, user_b_id)
);

CREATE INDEX idx_friends_user_a ON Friends(user_a_id);
CREATE INDEX idx_friends_user_b ON Friends(user_b_id);
CREATE INDEX idx_friends_status ON Friends(friends_status);
CREATE INDEX idx_friends_requester ON Friends(requester_id);

-- -------------------- BLOCKED USERS --------------------
CREATE TABLE Blocked_Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  blocked_user_id INTEGER NOT NULL,
  blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_user_id) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE(user_id, blocked_user_id)
);

CREATE INDEX idx_blocked_users ON Blocked_Users(user_id, blocked_user_id);

-- -------------------- TOURNAMENTS --------------------
CREATE TABLE Tournament (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  T_name VARCHAR(100) NOT NULL,
  T_description TEXT,
  -- is_tournament BOOLEAN DEFAULT 1,
  
  Tournament_status VARCHAR(20) DEFAULT 'registration',
  player_count INTEGER NOT NULL,
  current_players INTEGER DEFAULT 0,
  
  winner_id INTEGER,
  winner_username VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  
  FOREIGN KEY (winner_id) REFERENCES Users(id)
);

CREATE INDEX idx_tournament_status ON Tournament(Tournament_status);

-- -------------------- TOURNAMENT PARTICIPANTS --------------------
CREATE TABLE Tournament_Players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id INTEGER,
  tournament_alias VARCHAR(50) NOT NULL,
  
  -- For future modules:
  -- placement INTEGER,
  -- eliminated_in_round INTEGER,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tournament_id) REFERENCES Tournament(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_players ON Tournament_Players(tournament_id);

-- -------------------- MATCHES --------------------
CREATE TABLE Tournament_Matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  
  -- Tournament Info
  round INTEGER,
  match_number INTEGER,
  -- bracket_type VARCHAR(20),
  
  -- Players
  player1_id INTEGER,
  player2_id INTEGER,

  player1_alias VARCHAR(50),
  player2_alias VARCHAR(50),
  
  -- Results
  winner_id INTEGER,
  winner_username VARCHAR(50),
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  
  -- Match Details
  matches_status VARCHAR(20) DEFAULT 'waiting',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP,
  
  FOREIGN KEY (tournament_id) REFERENCES Tournament(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES Users(id),
  FOREIGN KEY (player2_id) REFERENCES Users(id),
  FOREIGN KEY (winner_id) REFERENCES Users(id)
);

CREATE INDEX idx_matches_tournament ON Tournament_Matches(tournament_id);
CREATE INDEX idx_matches_players ON Tournament_Matches(player1_id, player2_id);
CREATE INDEX idx_matches_status ON Tournament_Matches(matches_status);

-- ============ REMOTE MATCHES ============
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
    Remote_status VARCHAR(20) DEFAULT 'waiting',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    
    FOREIGN KEY (player1_id) REFERENCES Users(id),
    FOREIGN KEY (player2_id) REFERENCES Users(id),
    FOREIGN KEY (winner_id) REFERENCES Users(id)
);

CREATE INDEX idx_remote_match_players ON Remote_Match(player1_id, player2_id);
CREATE INDEX idx_remote_match_status ON Remote_Match(Remote_status);

-- -------------------- CHANNELS (CHAT) --------------------
CREATE TABLE Channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  C_name VARCHAR(100) UNIQUE NOT NULL,
  C_type VARCHAR(20) DEFAULT 'public',
  password_hash VARCHAR(255),
  
  owner_id INTEGER NOT NULL,
  C_description TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (owner_id) REFERENCES Users(id)
);

CREATE INDEX idx_channels_name ON Channels(C_name);
CREATE INDEX idx_channels_owner ON Channels(owner_id);

-- -------------------- CHANNEL MEMBERS --------------------
CREATE TABLE Channel_Members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  CM_role VARCHAR(20) DEFAULT 'member',
  muted_until TIMESTAMP,
  banned BOOLEAN DEFAULT 0,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (channel_id) REFERENCES Channels(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE(channel_id, user_id)
);

CREATE INDEX idx_channel_members ON Channel_Members(channel_id, user_id);

-- -------------------- MESSAGES --------------------
CREATE TABLE Messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER,
  
  content TEXT NOT NULL,
  edited BOOLEAN DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMP,
  
  FOREIGN KEY (channel_id) REFERENCES Channels(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES Users(id),
  FOREIGN KEY (receiver_id) REFERENCES Users(id)
);

CREATE INDEX idx_messages_channel ON Messages(channel_id);
CREATE INDEX idx_messages_sender ON Messages(sender_id);
CREATE INDEX idx_messages_created ON Messages(created_at);

-- -------------------- GAME INVITATIONS --------------------
CREATE TABLE Game_Invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  
  tournament_id INTEGER,        -- NULL for remote
  remote_match_id INTEGER,      -- NULL for tounament
  
  GI_status VARCHAR(20) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  responded_at TIMESTAMP,
  
  FOREIGN KEY (from_user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (tournament_id) REFERENCES Tournament(id),
  FOREIGN KEY (remote_match_id) REFERENCES Remote_Match(id)
);

CREATE INDEX idx_invitations_from ON Game_Invitations(from_user_id);
CREATE INDEX idx_invitations_to ON Game_Invitations(to_user_id);
CREATE INDEX idx_invitations_status ON Game_Invitations(GI_status);

-- -------------------- NOTIFICATIONS --------------------
CREATE TABLE Notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  actor_id INTEGER,
  
  Noti_type VARCHAR(30) NOT NULL,
  title VARCHAR(100),
  content TEXT,
  payload TEXT,
  link VARCHAR(255),
  
  Noti_read BOOLEAN DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES Users(id)
);

CREATE INDEX idx_notifications_user ON Notifications(user_id);
CREATE INDEX idx_notifications_read ON Notifications(Noti_read);
CREATE INDEX idx_notifications_created ON Notifications(created_at);