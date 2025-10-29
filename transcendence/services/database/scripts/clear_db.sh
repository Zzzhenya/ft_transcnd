#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DB_PATH="/app/shared/database/transcendence.db"

echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🗑️  CLEARING DATABASE${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}\n"

if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}❌ Database not found!${NC}"
    exit 1
fi

sqlite3 "$DB_PATH" <<SQL
DELETE FROM Tournament_Players;
DELETE FROM Tournament_Singlematches;
DELETE FROM Matches;
DELETE FROM Friends;
DELETE FROM Users;
DELETE FROM sqlite_sequence;
SQL

echo -e "${GREEN}✓ Cleared Tournament_Players${NC}"
echo -e "${GREEN}✓ Cleared Tournament_Singlematches${NC}"
echo -e "${GREEN}✓ Cleared Matches${NC}"
echo -e "${GREEN}✓ Cleared Friends${NC}"
echo -e "${GREEN}✓ Cleared Users${NC}"
echo -e "${GREEN}✓ Reset ID counters${NC}\n"

echo -e "${GREEN}✅ Database cleared successfully!${NC}\n"
