#!/bin/bash
set -e

echo "📦 Backing up database (CORRECT WAY)..."
echo ""

DB_CONTAINER="sqlite-web"
DB_PATH="/app/shared/database/transcendence.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FINAL_FILE="/home/rkost/Project/ft_trancendense_db_backup/transcendence_${TIMESTAMP}.db"

# Zeige Dateien VORHER
echo "📋 BEFORE checkpoint:"
docker exec $DB_CONTAINER ls -lh /app/shared/database/ | grep transcendence

echo ""
echo "🔄 Running CHECKPOINT (merging WAL into main DB)..."
# TRUNCATE mode: schreibt WAL in Haupt-DB und löscht WAL
docker exec $DB_CONTAINER sqlite3 $DB_PATH "PRAGMA wal_checkpoint(TRUNCATE);"

echo ""
echo "📋 AFTER checkpoint:"
docker exec $DB_CONTAINER ls -lh /app/shared/database/ | grep transcendence

echo ""
echo "📂 Copying database..."
docker cp ${DB_CONTAINER}:${DB_PATH} "$FINAL_FILE"

echo ""
echo "✅ ========================================="
echo "✅ Backup successful!"
echo "✅ ========================================="
echo ""

# Verify
FILE_SIZE=$(ls -lh "$FINAL_FILE" | awk '{print $5}')
FILE_DATE=$(stat -c %y "$FINAL_FILE" 2>/dev/null || stat -f "%Sm" "$FINAL_FILE")

echo "📊 Backup file:"
echo "  Path: $FINAL_FILE"
echo "  Size: $FILE_SIZE"
echo "  Date: $FILE_DATE"

echo ""
echo "📊 User count comparison:"
DOCKER_COUNT=$(docker exec $DB_CONTAINER sqlite3 $DB_PATH "SELECT COUNT(*) FROM users;")
BACKUP_COUNT=$(sqlite3 "$FINAL_FILE" "SELECT COUNT(*) FROM users;")

echo "  In Docker:  $DOCKER_COUNT users"
echo "  In Backup:  $BACKUP_COUNT users"

if [ "$DOCKER_COUNT" = "$BACKUP_COUNT" ]; then
  echo "  ✅ Counts match!"
else
  echo "  ❌ MISMATCH!"
fi

echo ""