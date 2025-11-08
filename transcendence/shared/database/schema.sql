-- ============================================
-- FT_TRANSCENDENCE - Complete Database Schema
-- SQLite Version
-- ============================================

-- Drop existing tables (if any)
DROP TABLE IF EXISTS Notifications;
DROP TABLE IF EXISTS Game_Invitations;
DROP TABLE IF EXISTS Messages;
DROP TABLE IF EXISTS Channel_Members;
DROP TABLE IF EXISTS Channels;
DROP TABLE IF EXISTS Tournament_Players;
DROP TABLE IF EXISTS Matches;
DROP TABLE IF EXISTS Tournament_Singlematches;
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
  uuid VARCHAR(500),
  
  -- OAuth / 42 Integration
  intra_id INTEGER UNIQUE,
  oauth_provider VARCHAR(20),
  email_verified BOOLEAN DEFAULT 0,
  
  -- Profile
  display_name VARCHAR(100),
  avatar VARCHAR(255),
  bio TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'offline',
  current_match_id INTEGER,
  
  -- Online Status
  last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
  is_online INTEGER DEFAULT 0,
  
  -- Security
  mfa_enabled BOOLEAN DEFAULT 0,
  mfa_secret VARCHAR(255),
  mfa_backup_codes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  -- JWT Token
  jwt_token VARCHAR(500)
);

CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_intra_id ON Users(intra_id);
CREATE INDEX idx_users_online ON Users(is_online);
CREATE INDEX idx_users_last_seen ON Users(last_seen);

-- -------------------- FRIENDS --------------------
CREATE TABLE Friends (
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

CREATE INDEX idx_friends_user_id ON Friends(user_id);
CREATE INDEX idx_friends_friend_id ON Friends(friend_id);
CREATE INDEX idx_friends_status ON Friends(status);

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
CREATE TABLE Tournament_Singlematches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_tournament BOOLEAN DEFAULT 1,
  
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

CREATE INDEX idx_tournament_status ON Tournament_Singlematches(status);

-- -------------------- TOURNAMENT PARTICIPANTS --------------------
CREATE TABLE Tournament_Players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  tournament_alias VARCHAR(50) NOT NULL,
  
  -- For future modules:
  -- placement INTEGER,
  -- eliminated_in_round INTEGER,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tournament_id) REFERENCES Tournament_Singlematches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_players ON Tournament_Players(tournament_id);

-- -------------------- MATCHES --------------------
CREATE TABLE Matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER,
  
  -- Tournament Info
  round INTEGER,
  match_number INTEGER,
  bracket_type VARCHAR(20),
  
  -- Players
  player1_id INTEGER NOT NULL,
  player2_id INTEGER NOT NULL,
  
  -- Results
  winner_id INTEGER,
  loser_id INTEGER,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  
  -- Match Details
  status VARCHAR(20) DEFAULT 'waiting',
  game_mode VARCHAR(20) DEFAULT 'normal',
  match_type VARCHAR(20),
  duration INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  
  FOREIGN KEY (tournament_id) REFERENCES Tournament_Singlematches(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES Users(id),
  FOREIGN KEY (player2_id) REFERENCES Users(id),
  FOREIGN KEY (winner_id) REFERENCES Users(id),
  FOREIGN KEY (loser_id) REFERENCES Users(id)
);

CREATE INDEX idx_matches_tournament ON Matches(tournament_id);
CREATE INDEX idx_matches_players ON Matches(player1_id, player2_id);
CREATE INDEX idx_matches_status ON Matches(status);

-- -------------------- CHANNELS (CHAT) --------------------
CREATE TABLE Channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) DEFAULT 'public',
  password_hash VARCHAR(255),
  
  owner_id INTEGER NOT NULL,
  description TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (owner_id) REFERENCES Users(id)
);

CREATE INDEX idx_channels_name ON Channels(name);
CREATE INDEX idx_channels_owner ON Channels(owner_id);

-- -------------------- CHANNEL MEMBERS --------------------
CREATE TABLE Channel_Members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  role VARCHAR(20) DEFAULT 'member',
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
  
  match_id INTEGER,
  game_mode VARCHAR(20) DEFAULT 'normal',
  
  status VARCHAR(20) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  responded_at TIMESTAMP,
  
  FOREIGN KEY (from_user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES Matches(id)
);

CREATE INDEX idx_invitations_from ON Game_Invitations(from_user_id);
CREATE INDEX idx_invitations_to ON Game_Invitations(to_user_id);
CREATE INDEX idx_invitations_status ON Game_Invitations(status);

-- -------------------- NOTIFICATIONS --------------------
CREATE TABLE Notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  actor_id INTEGER,
  
  type VARCHAR(30) NOT NULL,
  title VARCHAR(100),
  content TEXT,
  payload TEXT,
  link VARCHAR(255),
  
  read BOOLEAN DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES Users(id)
);

CREATE INDEX idx_notifications_user ON Notifications(user_id);
CREATE INDEX idx_notifications_read ON Notifications(read);
CREATE INDEX idx_notifications_created ON Notifications(created_at);