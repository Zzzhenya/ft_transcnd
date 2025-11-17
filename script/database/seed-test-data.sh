#!/bin/bash
set -e

echo "🌱 Starting Database Seeding..."

DB_CONTAINER="sqlite-web"
DB_PATH="/app/shared/database/transcendence.db"

# Password hash for "123"
HASH='$2b$10$xacKWaH5DbJVX3jOO1WzPeQhOdZejx2K8CBPhcZ0/JFPrfsA4MHEW'

# Avatar path prefix
AVATAR_PATH='/avatars/'

# Test ob Container läuft
if ! docker ps | grep -q "$DB_CONTAINER"; then
  echo "❌ Container $DB_CONTAINER not running!"
  exit 1
fi

echo "✅ Container found"

# Clearing data (in richtiger Reihenfolge wegen Foreign Keys)
echo "🗑️  Clearing existing data..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "
DELETE FROM Tournament_Matches;
DELETE FROM Remote_Match;
DELETE FROM Tournament_Players;
DELETE FROM Tournament;
DELETE FROM Friends;
DELETE FROM Users;
DELETE FROM sqlite_sequence;
"

echo "✅ Data cleared"

# Creating users (all with password "123")
echo "👥 Creating 8 users (password: 123)..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "
INSERT INTO Users (id, username, email, password_hash, is_guest, user_status, display_name, avatar) VALUES 
(1, 'player1', 'p1@p1.de', '$HASH', 0, 'offline', 'Player One', '${AVATAR_PATH}1.jpg'),
(2, 'player2', 'p2@p2.de', '$HASH', 0, 'offline', 'Player Two', '${AVATAR_PATH}2.jpg'),
(3, 'player3', 'p3@p3.de', '$HASH', 0, 'offline', 'Player Three', '${AVATAR_PATH}3.jpg'),
(4, 'player4', 'p4@p4.de', '$HASH', 0, 'offline', 'Player Four', '${AVATAR_PATH}4.jpg'),
(5, 'player5', 'p5@p5.de', '$HASH', 0, 'offline', 'Player Five', '${AVATAR_PATH}5.jpg'),
(6, 'player6', 'p6@p6.de', '$HASH', 0, 'offline', 'Player Six', '${AVATAR_PATH}6.jpg'),
(7, 'player7', 'p7@p7.de', '$HASH', 0, 'offline', 'Player Seven', '${AVATAR_PATH}7.jpg'),
(8, 'player8', 'p8@p8.de', '$HASH', 0, 'offline', 'Player Eight', '${AVATAR_PATH}8.jpg');
"

echo "✅ Users created"

# Creating Friends relationships
echo "👥 Creating friend relationships..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "
INSERT INTO Friends (user_id, friend_id, friends_status, created_at, accepted_at) VALUES
(1, 2, 'accepted', datetime('now'), datetime('now')),
(2, 1, 'accepted', datetime('now'), datetime('now')),
(1, 3, 'accepted', datetime('now'), datetime('now')),
(3, 1, 'accepted', datetime('now'), datetime('now')),
(4, 5, 'pending', datetime('now'), NULL),
(6, 7, 'accepted', datetime('now'), datetime('now')),
(7, 6, 'accepted', datetime('now'), datetime('now'));
"

echo "✅ Friends created"

# Creating tournaments
echo "🏆 Creating 3 tournaments..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "
INSERT INTO Tournament (id, T_name, T_description, Tournament_status, player_count, current_players, winner_id, winner_username, created_at) VALUES 
(1, 'Summer Cup 2025', 'First tournament - 4 players', 'finished', 4, 4, 1, 'player1', '2025-11-13 07:47:03'),
(2, 'Winter Championship', 'Big tournament - 8 players', 'finished', 8, 8, 7, 'player7', '2025-11-13 07:47:03'),
(3, 'Spring Cup', 'Currently running - 4 players', 'in_progress', 4, 4, NULL, NULL, '2025-11-13 07:47:03');
"

echo "✅ Tournaments created"

# Adding tournament players
echo "👤 Adding tournament players..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "
INSERT INTO Tournament_Players (id, tournament_id, user_id, tournament_alias, joined_at) VALUES
(1, 1, 1, 'P1', '2025-11-13 07:47:03'),
(2, 1, 2, 'P2', '2025-11-13 07:47:03'),
(3, 1, 3, 'P3', '2025-11-13 07:47:03'),
(4, 1, 4, 'P4', '2025-11-13 07:47:03'),
(5, 2, 1, 'P1', '2025-11-13 07:47:03'),
(6, 2, 2, 'P2', '2025-11-13 07:47:03'),
(7, 2, 3, 'P3', '2025-11-13 07:47:03'),
(8, 2, 4, 'P4', '2025-11-13 07:47:03'),
(9, 2, 5, 'P5', '2025-11-13 07:47:03'),
(10, 2, 6, 'P6', '2025-11-13 07:47:03'),
(11, 2, 7, 'P7', '2025-11-13 07:47:03'),
(12, 2, 8, 'P8', '2025-11-13 07:47:03'),
(13, 3, 1, 'P1', '2025-11-13 07:47:03'),
(14, 3, 6, 'P6', '2025-11-13 07:47:03'),
(15, 3, 7, 'P7', '2025-11-13 07:47:03'),
(16, 3, 8, 'P8', '2025-11-13 07:47:03');
"

echo "✅ Tournament players added"

# Creating tournament matches
echo "⚔️  Creating tournament matches..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "
INSERT INTO Tournament_Matches (id, tournament_id, round, match_number, player1_id, player2_id, winner_id, loser_id, player1_score, player2_score, matches_status) VALUES
-- Tournament 1: Summer Cup (4 players)
(1, 1, 1, 1, 1, 2, 1, 2, 11, 9, 'finished'),
(2, 1, 1, 2, 3, 4, 4, 3, 7, 11, 'finished'),
(3, 1, 2, 3, 1, 4, 4, 1, 2, 11, 'finished'),

-- Tournament 2: Winter Championship (8 players)
(4, 2, 1, 1, 1, 2, 2, 1, 6, 11, 'finished'),
(5, 2, 1, 2, 3, 4, 4, 3, 3, 11, 'finished'),
(6, 2, 1, 3, 5, 6, 6, 5, 2, 11, 'finished'),
(7, 2, 1, 4, 7, 8, 7, 8, 11, 7, 'finished'),
(8, 2, 2, 5, 2, 4, 4, 2, 8, 11, 'finished'),
(9, 2, 2, 6, 6, 7, 7, 6, 7, 11, 'finished'),
(10, 2, 3, 7, 4, 7, 7, 4, 1, 11, 'finished'),

-- Tournament 3: Spring Cup (4 players, in progress)
(11, 3, 1, 1, 1, 6, 6, 1, 1, 11, 'finished'),
(12, 3, 1, 2, 7, 8, 7, 8, 11, 2, 'finished'),
(13, 3, 2, 3, 6, 7, NULL, NULL, 7, 11, 'in_progress');
"

echo "✅ Tournament matches created"

# Creating remote matches (1v1 games outside tournaments)
echo "🎮 Creating remote matches..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "
INSERT INTO Remote_Match (id, player1_id, player2_id, winner_id, player1_score, player2_score, Remote_status) VALUES
(1, 1, 2, 2, 1, 11, 'finished'),
(2, 1, 3, 1, 11, 2, 'finished'),
(3, 1, 4, 1, 11, 6, 'finished'),
(4, 4, 1, 1, 7, 11, 'finished'),
(5, 5, 1, 1, 2, 11, 'finished'),
(6, 6, 1, 6, 11, 1, 'finished'),
(7, 1, 7, 7, 10, 11, 'finished'),
(8, 1, 8, 8, 8, 11, 'finished'),
(9, 1, 2, 2, 7, 11, 'finished'),
(10, 2, 7, 2, 6, 11, 'finished'),
(11, 7, 8, 7, 11, 1, 'finished'),
(12, 6, 8, NULL, 2, 7, 'in_progress');
"

echo "✅ Remote matches created"

# Results
echo ""
echo "📊 Database Summary:"
echo "===================="
docker exec $DB_CONTAINER sqlite3 $DB_PATH "
SELECT '👥 Users: ' || COUNT(*) FROM Users;
SELECT '🏆 Tournaments: ' || COUNT(*) FROM Tournament;
SELECT '👤 Tournament Players: ' || COUNT(*) FROM Tournament_Players;
SELECT '⚔️  Tournament Matches: ' || COUNT(*) FROM Tournament_Matches;
SELECT '🎮 Remote Matches: ' || COUNT(*) FROM Remote_Match;
SELECT '🤝 Friends: ' || COUNT(*) FROM Friends;
"

echo ""
echo "✅ DATABASE SEEDING COMPLETE!"
echo ""
echo "📝 Login Info:"
echo "   Usernames: player1, player2, ..., player8"
echo "   Emails: p1@p1.de, p2@p2.de, ..., p8@p8.de"
echo "   Password: 123"
echo ""
echo "🎮 Test Scenarios:"
echo "   - Tournament 1 (Summer Cup): FINISHED - Winner: player1"
echo "   - Tournament 2 (Winter Championship): FINISHED - Winner: player7"
echo "   - Tournament 3 (Spring Cup): IN PROGRESS - Final match ongoing"
echo "   - 12 Remote Matches: 11 finished, 1 in progress"
echo "   - Friend relationships active"