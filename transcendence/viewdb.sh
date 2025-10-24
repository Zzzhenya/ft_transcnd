#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TEMP_DB="/home/rkost/Project/temp_transcendence.db"

# Cleanup function - wird beim Exit aufgerufen
cleanup() {
    if [ -f "$TEMP_DB" ]; then
        echo ""
        echo -e "${BLUE}🧹 Cleaning up...${NC}"
        rm -f "$TEMP_DB"
        echo -e "${GREEN}✅ temp_transcendence.db deleted${NC}"
    fi
}

# Registriere cleanup bei Exit, Interrupt (Ctrl+C), oder Terminate


echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${BLUE}  Database Viewer${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"
echo ""

# Copy DB
echo -e "${BLUE}📥 Copying database from Docker...${NC}"
if  docker cp transcendence-database:/app/shared/database/transcendence.db "$TEMP_DB" 2>/dev/null; then
    echo -e "${YELLOW}Container not running, starting...${NC}"
    docker-compose up -d database
    sleep 2
    docker cp transcendence-database:/app/shared/database/transcendence.db "$TEMP_DB"
    cp 
fi

if [ ! -f "$TEMP_DB" ]; then
    echo -e "${RED}❌ Failed to copy database${NC}"
    exit 1
fi

DB_PATH="$(realpath $TEMP_DB)"
DB_SIZE=$(du -h "$TEMP_DB" | cut -f1)

echo -e "${GREEN}✅ Database copied (${DB_SIZE})${NC}"
echo -e "${BLUE}📂 Path: ${DB_PATH}${NC}"
echo ""

# Open DBeaver
echo -e "${GREEN}🚀 Opening DBeaver...${NC}"
echo ""
echo -e "${YELLOW}In DBeaver:${NC}"
echo -e "  1. File → Open File"
echo -e "  2. Navigate to: ${DB_PATH}"
echo -e "  ${BLUE}Or drag & drop the file into DBeaver${NC}"
echo ""

flatpak run io.dbeaver.DBeaverCommunity &
DBEAVER_PID=$!

echo -e "${YELLOW}Press Enter when done to clean up...${NC}"
read

echo ""
echo -e "${GREEN}🎉 Done!${NC}"

# trap cleanup EXIT INT TERM