#!/bin/bash

# Seed Test Data Script
# Schreibt Testdaten direkt in die SQLite Datenbank

set -e  # Stop bei Fehler

echo "🌱 Starting Database Seeding..."
echo ""

# Database Container Name
DB_CONTAINER="sqlite-web"
DB_PATH="/app/shared/database/transcendence.db"

# Prüfe ob Container läuft
if ! docker ps | grep -q "$DB_CONTAINER"; then
  echo "❌ Database container is not running!"
  echo "Start it with: docker-compose up -d database"
  exit 1
fi

echo "✅ Database container found"
echo ""

# Funktion: SQL ausführen
run_sql() {
  docker exec $DB_CONTAINER sqlite3 $DB_PATH "$1"
}

# ==================== CREATE TEST USERS ====================
echo "👥 Creating test users..."

run_sql "INSERT OR IGNORE INTO users (id, username, email, password_hash, is_guest, status, created_at) 
VALUES 
  (1, 'player1', 'player1@test.com', '\$2b\$10\$hashedpassword1', 0, 'offline', datetime('now')),
  (2, 'player2', 'player2@test.com', '\$2b\$10\$hashedpassword2', 0, 'offline', datetime('now')),
  (3, 'player3', 'player3@test.com', '\$2b\$10\$hashedpassword3', 0, 'offline', datetime('now')),
  (4, 'player4', 'player4@test.com', '\$2b\$10\$hashedpassword4', 0, 'offline', datetime('now')),
  (5, 'player5', 'player5@test.com', '\$2b\$10\$hashedpassword5', 0, 'offline', datetime('now')),
  (6, 'player6', 'player6@test.com', '\$2b\$10\$hashedpassword6', 0, 'offline', datetime('now')),
  (7, 'player7', 'player7@test.com', '\$2b\$10\$hashedpassword7', 0, 'offline', datetime('now')),
  (8, 'player8', 'player8@test.com', '\$2b\$10\$hashedpassword8', 0, 'offline', datetime('now'));"

echo "  ✅ Created 8 test users"

# ==================== CREATE TOURNAMENTS ====================
echo ""
echo "🏆 Creating tournaments..."

run_sql "INSERT INTO Tournament_Singlematches (name, description, is_tournament, status, player_count, current_players, winner_id, winner_username, created_at, started_at, finished_at)
VALUES 
  ('Summer Championship 2024', 'Test Tournament 1', 1, 'finished', 4, 4, 1, 'player1', datetime('now', '-30 days'), datetime('now', '-29 days'), datetime('now', '-28 days')),
  ('Winter Cup 2024', 'Test Tournament 2', 1, 'finished', 8, 8, 2, 'player2', datetime('now', '-20 days'), datetime('now', '-19 days'), datetime('now', '-18 days')),
  ('Spring Tournament 2025', 'Test Tournament 3', 1, 'in_progress', 4, 4, NULL, NULL, datetime('now', '-5 days'), datetime('now', '-4 days'), NULL);"

echo "  ✅ Created 3 tournaments"

# ==================== CREATE TOURNAMENT PLAYERS ====================
echo ""
echo "👤 Adding players to tournaments..."

run_sql "INSERT INTO Tournament_Players (tournament_id, user_id, tournament_alias, joined_at)
VALUES 
  (1, 1, 'Player1', datetime('now', '-30 days')),
  (1, 2, 'Player2', datetime('now', '-30 days')),
  (1, 3, 'Player3', datetime('now', '-30 days')),
  (1, 4, 'Player4', datetime('now', '-30 days')),
  (2, 1, 'Player1', datetime('now', '-20 days')),
  (2, 2, 'Player2', datetime('now', '-20 days')),
  (2, 3, 'Player3', datetime('now', '-20 days')),
  (2, 4, 'Player4', datetime('now', '-20 days')),
  (2, 5, 'Player5', datetime('now', '-20 days')),
  (2, 6, 'Player6', datetime('now', '-20 days')),
  (2, 7, 'Player7', datetime('now', '-20 days')),
  (2, 8, 'Player8', datetime('now', '-20 days')),
  (3, 1, 'Player1', datetime('now', '-5 days')),
  (3, 2, 'Player2', datetime('now', '-5 days')),
  (3, 3, 'Player3', datetime('now', '-5 days')),
  (3, 4, 'Player4', datetime('now', '-5 days'));"

echo "  ✅ Added players to tournaments"

# ==================== CREATE MATCHES ====================
echo ""
echo "🎮 Creating matches..."

run_sql "INSERT INTO Matches (tournament_id, round, match_number, player1_id, player2_id, winner_id, loser_id, player1_score, player2_score, status, game_mode, match_type, duration, created_at, started_at, finished_at)
VALUES 
  -- Tournament 1: Round 1
  (1, 1, 1, 1, 2, 1, 2, 11, 8, 'finished', 'tournament', 'tournament', 245, datetime('now', '-28 days'), datetime('now', '-28 days'), datetime('now', '-28 days')),
  (1, 1, 2, 3, 4, 4, 3, 9, 11, 'finished', 'tournament', 'tournament', 312, datetime('now', '-28 days'), datetime('now', '-28 days'), datetime('now', '-28 days')),
  -- Tournament 1: Final
  (1, 2, 1, 1, 4, 1, 4, 11, 7, 'finished', 'tournament', 'tournament', 289, datetime('now', '-28 days'), datetime('now', '-28 days'), datetime('now', '-28 days')),
  
  -- Tournament 2: Round 1
  (2, 1, 1, 1, 2, 1, 2, 11, 5, 'finished', 'tournament', 'tournament', 198, datetime('now', '-18 days'), datetime('now', '-18 days'), datetime('now', '-18 days')),
  (2, 1, 2, 3, 4, 3, 4, 11, 9, 'finished', 'tournament', 'tournament', 234, datetime('now', '-18 days'), datetime('now', '-18 days'), datetime('now', '-18 days')),
  (2, 1, 3, 5, 6, 6, 5, 8, 11, 'finished', 'tournament', 'tournament', 267, datetime('now', '-18 days'), datetime('now', '-18 days'), datetime('now', '-18 days')),
  (2, 1, 4, 7, 8, 7, 8, 11, 6, 'finished', 'tournament', 'tournament', 221, datetime('now', '-18 days'), datetime('now', '-18 days'), datetime('now', '-18 days')),
  -- Tournament 2: Semi-Finals
  (2, 2, 1, 1, 3, 1, 3, 11, 7, 'finished', 'tournament', 'tournament', 298, datetime('now', '-18 days'), datetime('now', '-18 days'), datetime('now', '-18 days')),
  (2, 2, 2, 6, 7, 7, 6, 9, 11, 'finished', 'tournament', 'tournament', 312, datetime('now', '-18 days'), datetime('now', '-18 days'), datetime('now', '-18 days')),
  -- Tournament 2: Final
  (2, 3, 1, 1, 7, 1, 7, 11, 8, 'finished', 'tournament', 'tournament', 345, datetime('now', '-18 days'), datetime('now', '-18 days'), datetime('now', '-18 days')),
  
  -- Tournament 3: In Progress
  (3, 1, 1, 1, 2, NULL, NULL, 0, 0, 'waiting', 'tournament', 'tournament', NULL, datetime('now', '-4 days'), NULL, NULL),
  (3, 1, 2, 3, 4, NULL, NULL, 0, 0, 'waiting', 'tournament', 'tournament', NULL, datetime('now', '-4 days'), NULL, NULL),
  
  -- Single Matches (no tournament)
  (NULL, NULL, NULL, 1, 3, 1, 3, 11, 6, 'finished', 'normal', '1v1', 234, datetime('now', '-7 days'), datetime('now', '-7 days'), datetime('now', '-7 days')),
  (NULL, NULL, NULL, 2, 4, 4, 2, 8, 11, 'finished', 'normal', '1v1', 267, datetime('now', '-6 days'), datetime('now', '-6 days'), datetime('now', '-6 days')),
  (NULL, NULL, NULL, 5, 7, 5, 7, 11, 9, 'finished', 'normal', '1v1', 289, datetime('now', '-5 days'), datetime('now', '-5 days'), datetime('now', '-5 days'));"

echo "  ✅ Created tournament and single matches"

# ==================== SUMMARY ====================
echo ""
echo "📊 Summary:"
echo "─────────────────────────────────────────"

USER_COUNT=$(run_sql "SELECT COUNT(*) FROM users;")
TOURNAMENT_COUNT=$(run_sql "SELECT COUNT(*) FROM Tournament_Singlematches;")
MATCH_COUNT=$(run_sql "SELECT COUNT(*) FROM Matches;")

echo "  Users:       $USER_COUNT"
echo "  Tournaments: $TOURNAMENT_COUNT"
echo "  Matches:     $MATCH_COUNT"

echo ""
echo "🎉 ========================================="
echo "🎉 Database seeding completed successfully!"
echo "🎉 ========================================="
echo ""
echo "📝 View data at: http://localhost:8080"
echo ""