#!/bin/bash
set -e

echo "🌱 Starting Database Seeding..."

DB_CONTAINER="sqlite-web"
DB_PATH="/app/shared/database/transcendence.db"

# Password hash for "123"
HASH='$2b$10$xacKWaH5DbJVX3jOO1WzPeQhOdZejx2K8CBPhcZ0/JFPrfsA4MHEW'

# Test ob Container läuft
if ! docker ps | grep -q "$DB_CONTAINER"; then
  echo "❌ Container not running!"
  exit 1
fi

echo "✅ Container found"

# Clearing data
echo "🗑️  Clearing..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "DELETE FROM Matches; DELETE FROM Tournament_Players; DELETE FROM Tournament_Singlematches; DELETE FROM users; DELETE FROM sqlite_sequence;"

# Creating users (all with password "123")
echo "👥 Creating users (password: 123)..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (1, 'player1', 'p1@p1.de', '$HASH', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (2, 'player2', 'p2@p2.de', '$HASH', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (3, 'player3', 'p3@p3.de', '$HASH', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (4, 'player4', 'p4@p4.de', '$HASH', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (5, 'player5', 'p5@p5.de', '$HASH', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (6, 'player6', 'p6@p6.de', '$HASH', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (7, 'player7', 'p7@p7.de', '$HASH', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (8, 'player8', 'p8@p8.de', '$HASH', 0, 'offline');"

# Creating tournaments
echo "🏆 Creating tournaments..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Singlematches (id, name, description, is_tournament, status, player_count, current_players) VALUES (1, 'Summer Cup', 'Test 1', 1, 'finished', 4, 4);"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Singlematches (id, name, description, is_tournament, status, player_count, current_players) VALUES (2, 'Winter Cup', 'Test 2', 1, 'finished', 8, 8);"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Singlematches (id, name, description, is_tournament, status, player_count, current_players) VALUES (3, 'Spring Cup', 'Test 3', 1, 'in_progress', 4, 4);"

# Adding tournament players
echo "👤 Adding tournament players..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Players (tournament_id, user_id, tournament_alias) VALUES (1, 1, 'P1'), (1, 2, 'P2'), (1, 3, 'P3'), (1, 4, 'P4');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Players (tournament_id, user_id, tournament_alias) VALUES (2, 1, 'P1'), (2, 2, 'P2'), (2, 3, 'P3'), (2, 4, 'P4'), (2, 5, 'P5'), (2, 6, 'P6'), (2, 7, 'P7'), (2, 8, 'P8');"

# Results
echo ""
echo "📊 Result:"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "SELECT COUNT(*) || ' users' FROM users; SELECT COUNT(*) || ' tournaments' FROM Tournament_Singlematches; SELECT COUNT(*) || ' players' FROM Tournament_Players;"
echo ""
echo "✅ DONE!"
echo ""
echo "📝 Login Info:"
echo "   Username: player1-8"
echo "   Email: p1@p1.de - p8@p8.de"
echo "   Password: 123"