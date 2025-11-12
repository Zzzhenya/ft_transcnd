#!/bin/bash

# Clear Test Data Script
# Löscht alle Testdaten aus der Datenbank

set -e  # Stop bei Fehler

echo "🧹 Clearing test data from database..."
echo ""

# Database Container Name
DB_CONTAINER="sqlite-web"
DB_PATH="/app/shared/database/transcendence.db"

# Prüfe ob Container läuft
if ! docker ps | grep -q "$DB_CONTAINER"; then
  echo "❌ Database container is not running!"
  exit 1
fi

echo "✅ Database container found"
echo ""

# Funktion: SQL ausführen
run_sql() {
  docker exec $DB_CONTAINER sqlite3 $DB_PATH "$1"
}

# Zähle Einträge VORHER
echo "📊 Current data count:"
USER_COUNT=$(run_sql "SELECT COUNT(*) FROM users;")
TOURNAMENT_COUNT=$(run_sql "SELECT COUNT(*) FROM Tournament_Singlematches;")
MATCH_COUNT=$(run_sql "SELECT COUNT(*) FROM Matches;")
PLAYER_COUNT=$(run_sql "SELECT COUNT(*) FROM Tournament_Players;")

echo "  Users:             $USER_COUNT"
echo "  Tournaments:       $TOURNAMENT_COUNT"
echo "  Tournament Players: $PLAYER_COUNT"
echo "  Matches:           $MATCH_COUNT"
echo ""

# Bestätigung
read -p "⚠️  Delete ALL data? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled by user"
  exit 0
fi

echo ""
echo "🗑️  Deleting data..."

# WICHTIG: Reihenfolge beachten (Foreign Keys!)
# 1. Child-Tabellen zuerst
echo "  - Deleting Matches..."
run_sql "DELETE FROM Matches;"

echo "  - Deleting Tournament Players..."
run_sql "DELETE FROM Tournament_Players;"

echo "  - Deleting Tournaments..."
run_sql "DELETE FROM Tournament_Singlematches;"

echo "  - Deleting Users..."
run_sql "DELETE FROM users;"

# Optional: Andere Tabellen auch clearen
echo "  - Deleting Friends..."
run_sql "DELETE FROM Friends;" 2>/dev/null || true

echo "  - Deleting Messages..."
run_sql "DELETE FROM Messages;" 2>/dev/null || true

echo "  - Deleting Channels..."
run_sql "DELETE FROM Channels;" 2>/dev/null || true

echo "  - Deleting Notifications..."
run_sql "DELETE FROM Notifications;" 2>/dev/null || true

# VACUUM (gibt Speicher frei)
echo ""
echo "♻️  Running VACUUM to reclaim space..."
run_sql "VACUUM;"

# Zähle Einträge NACHHER
echo ""
echo "📊 Data count after cleanup:"
USER_COUNT=$(run_sql "SELECT COUNT(*) FROM users;")
TOURNAMENT_COUNT=$(run_sql "SELECT COUNT(*) FROM Tournament_Singlematches;")
MATCH_COUNT=$(run_sql "SELECT COUNT(*) FROM Matches;")
PLAYER_COUNT=$(run_sql "SELECT COUNT(*) FROM Tournament_Players;")

echo "  Users:             $USER_COUNT"
echo "  Tournaments:       $TOURNAMENT_COUNT"
echo "  Tournament Players: $PLAYER_COUNT"
echo "  Matches:           $MATCH_COUNT"

echo ""
echo "✅ ========================================="
echo "✅ Database cleared successfully!"
echo "✅ ========================================="
echo ""
echo "💡 Run ./seed-test-data.sh to add fresh test data"
echo ""