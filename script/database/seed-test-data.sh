#!/bin/bash

set -e

echo "🌱 Starting Database Seeding..."

DB_CONTAINER="sqlite-web"
DB_PATH="/app/shared/database/transcendence.db"

# Test ob Container läuft
if ! docker ps | grep -q "$DB_CONTAINER"; then
  echo "❌ Container not running!"
  exit 1
fi

echo "✅ Container found"

# Einzelne SQLite Commands - EINS NACH DEM ANDEREN
echo "🗑️  Clearing..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "DELETE FROM Matches; DELETE FROM Tournament_Players; DELETE FROM Tournament_Singlematches; DELETE FROM users; DELETE FROM sqlite_sequence;"

echo "👥 Creating users..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status, bio, avatar ) VALUES (1, 'player1', 'player1@test.com', 'hash1', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (2, 'player2', 'player2@test.com', 'hash2', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (3, 'player3', 'player3@test.com', 'hash3', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (4, 'player4', 'player4@test.com', 'hash4', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (5, 'player5', 'player5@test.com', 'hash5', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (6, 'player6', 'player6@test.com', 'hash6', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (7, 'player7', 'player7@test.com', 'hash7', 0, 'offline');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO users (id, username, email, password_hash, is_guest, status) VALUES (8, 'player8', 'player8@test.com', 'hash8', 0, 'offline');"

echo "🏆 Creating tournaments..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Singlematches (id, name, description, is_tournament, status, player_count, current_players) VALUES (1, 'Summer Cup', 'Test 1', 1, 'finished', 4, 4);"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Singlematches (id, name, description, is_tournament, status, player_count, current_players) VALUES (2, 'Winter Cup', 'Test 2', 1, 'finished', 8, 8);"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Singlematches (id, name, description, is_tournament, status, player_count, current_players) VALUES (3, 'Spring Cup', 'Test 3', 1, 'in_progress', 4, 4);"

echo "👤 Adding tournament players..."
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Players (tournament_id, user_id, tournament_alias) VALUES (1, 1, 'P1'), (1, 2, 'P2'), (1, 3, 'P3'), (1, 4, 'P4');"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "INSERT INTO Tournament_Players (tournament_id, user_id, tournament_alias) VALUES (2, 1, 'P1'), (2, 2, 'P2'), (2, 3, 'P3'), (2, 4, 'P4'), (2, 5, 'P5'), (2, 6, 'P6'), (2, 7, 'P7'), (2, 8, 'P8');"

echo ""
echo "📊 Result:"
docker exec $DB_CONTAINER sqlite3 $DB_PATH "SELECT COUNT(*) || ' users' FROM users; SELECT COUNT(*) || ' tournaments' FROM Tournament_Singlematches; SELECT COUNT(*) || ' players' FROM Tournament_Players;"

echo ""
echo "✅ DONE!"