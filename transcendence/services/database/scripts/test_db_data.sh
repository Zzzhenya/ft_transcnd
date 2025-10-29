#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DB_PATH="/app/shared/database/transcendence.db"

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}🌱 SEEDING TEST DATA${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}📍 Database: ${DB_PATH}${NC}\n"

if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}❌ Database not found!${NC}"
    exit 1
fi

SIMPLE_HASH='$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ'

# ════════════════════════════════════════════════════════
# 1. NORMAL USERS
# ════════════════════════════════════════════════════════
echo -e "${BLUE}👤 Creating normal users...${NC}"

sqlite3 "$DB_PATH" <<SQL
INSERT OR IGNORE INTO Users (username, email, password_hash, display_name, is_guest, status, created_at) VALUES
('alice', 'alice@test.com', '${SIMPLE_HASH}', 'Alice Wonder', 0, 'online', datetime('now')),
('bob', 'bob@test.com', '${SIMPLE_HASH}', 'Bob Builder', 0, 'online', datetime('now')),
('charlie', 'charlie@test.com', '${SIMPLE_HASH}', 'Charlie Brown', 0, 'online', datetime('now')),
('david', 'david@test.com', '${SIMPLE_HASH}', 'David Dev', 0, 'online', datetime('now')),
('eve', 'eve@test.com', '${SIMPLE_HASH}', 'Eve Expert', 0, 'offline', datetime('now'));
SQL

COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Users WHERE is_guest = 0")
echo -e "${GREEN}   ✓ ${COUNT} normal users${NC}"

# ════════════════════════════════════════════════════════
# 2. GUEST USERS
# ════════════════════════════════════════════════════════
echo -e "${BLUE}👻 Creating guest users...${NC}"

sqlite3 "$DB_PATH" <<SQL
INSERT OR IGNORE INTO Users (username, email, password_hash, is_guest, status, created_at) VALUES
('guest_player1', 'g1@guest.local', '${SIMPLE_HASH}', 1, 'online', datetime('now')),
('guest_player2', 'g2@guest.local', '${SIMPLE_HASH}', 1, 'online', datetime('now')),
('guest_speedrun', 'g3@guest.local', '${SIMPLE_HASH}', 1, 'offline', datetime('now')),
('guest_noob', 'g4@guest.local', '${SIMPLE_HASH}', 1, 'online', datetime('now'));
SQL

GCOUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Users WHERE is_guest = 1")
echo -e "${GREEN}   ✓ ${GCOUNT} guest users${NC}"

# ════════════════════════════════════════════════════════
# 3. MATCHES
# ════════════════════════════════════════════════════════
echo -e "${BLUE}🎮 Creating matches...${NC}"

sqlite3 "$DB_PATH" <<SQL
INSERT INTO Matches (player1_id, player2_id, winner_id, player1_score, player2_score, status, played_at)
SELECT u1.id, u2.id, winner.id, 5, 3, 'completed', datetime('now', '-1 day')
FROM Users u1, Users u2, Users winner
WHERE u1.username = 'alice' AND u2.username = 'bob' AND winner.username = 'alice';

INSERT INTO Matches (player1_id, player2_id, winner_id, player1_score, player2_score, status, played_at)
SELECT u1.id, u2.id, winner.id, 2, 5, 'completed', datetime('now', '-2 days')
FROM Users u1, Users u2, Users winner
WHERE u1.username = 'alice' AND u2.username = 'charlie' AND winner.username = 'charlie';

INSERT INTO Matches (player1_id, player2_id, winner_id, player1_score, player2_score, status, played_at)
SELECT u1.id, u2.id, winner.id, 5, 1, 'completed', datetime('now', '-3 days')
FROM Users u1, Users u2, Users winner
WHERE u1.username = 'bob' AND u2.username = 'david' AND winner.username = 'bob';

INSERT INTO Matches (player1_id, player2_id, winner_id, player1_score, player2_score, status, played_at)
SELECT u1.id, u2.id, winner.id, 5, 4, 'completed', datetime('now', '-4 days')
FROM Users u1, Users u2, Users winner
WHERE u1.username = 'charlie' AND u2.username = 'eve' AND winner.username = 'charlie';

INSERT INTO Matches (player1_id, player2_id, winner_id, player1_score, player2_score, status, played_at)
SELECT u1.id, u2.id, winner.id, 3, 5, 'completed', datetime('now', '-5 days')
FROM Users u1, Users u2, Users winner
WHERE u1.username = 'david' AND u2.username = 'eve' AND winner.username = 'eve';

INSERT INTO Matches (player1_id, player2_id, winner_id, player1_score, player2_score, status, played_at)
SELECT u1.id, u2.id, winner.id, 5, 0, 'completed', datetime('now', '-6 days')
FROM Users u1, Users u2, Users winner
WHERE u1.username = 'alice' AND u2.username = 'guest_player1' AND winner.username = 'alice';

INSERT INTO Matches (player1_id, player2_id, winner_id, player1_score, player2_score, status, played_at)
SELECT u1.id, u2.id, winner.id, 5, 3, 'completed', datetime('now', '-7 days')
FROM Users u1, Users u2, Users winner
WHERE u1.username = 'guest_player1' AND u2.username = 'guest_player2' AND winner.username = 'guest_player1';

INSERT INTO Matches (player1_id, player2_id, winner_id, player1_score, player2_score, status, played_at)
SELECT u1.id, u2.id, winner.id, 5, 0, 'completed', datetime('now', '-8 days')
FROM Users u1, Users u2, Users winner
WHERE u1.username = 'bob' AND u2.username = 'guest_noob' AND winner.username = 'bob';
SQL

MCOUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Matches")
echo -e "${GREEN}   ✓ ${MCOUNT} matches${NC}"

# ════════════════════════════════════════════════════════
# 4. FRIENDSHIPS
# ════════════════════════════════════════════════════════
echo -e "${BLUE}👥 Creating friendships...${NC}"

sqlite3 "$DB_PATH" <<SQL
INSERT OR IGNORE INTO Friends (user_id, friend_id, status, created_at)
SELECT u1.id, u2.id, 'accepted', datetime('now')
FROM Users u1, Users u2
WHERE u1.username = 'alice' AND u2.username = 'bob';

INSERT OR IGNORE INTO Friends (user_id, friend_id, status, created_at)
SELECT u1.id, u2.id, 'accepted', datetime('now')
FROM Users u1, Users u2
WHERE u1.username = 'alice' AND u2.username = 'charlie';

INSERT OR IGNORE INTO Friends (user_id, friend_id, status, created_at)
SELECT u1.id, u2.id, 'accepted', datetime('now')
FROM Users u1, Users u2
WHERE u1.username = 'bob' AND u2.username = 'david';

INSERT OR IGNORE INTO Friends (user_id, friend_id, status, created_at)
SELECT u1.id, u2.id, 'pending', datetime('now')
FROM Users u1, Users u2
WHERE u1.username = 'david' AND u2.username = 'eve';
SQL

FCOUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Friends")
echo -e "${GREEN}   ✓ ${FCOUNT} friendships${NC}"

# ════════════════════════════════════════════════════════
# 5. TOURNAMENT
# ════════════════════════════════════════════════════════
echo -e "${BLUE}🏆 Creating tournament...${NC}"

sqlite3 "$DB_PATH" <<SQL
INSERT INTO Tournament_Singlematches (name, start_date, end_date, status, max_players, created_at)
VALUES ('Winter Championship 2025', datetime('now', '-5 days'), datetime('now', '+2 days'), 'in_progress', 8, datetime('now'));

INSERT INTO Tournament_Players (tournament_id, user_id, joined_at)
SELECT 1, id, datetime('now')
FROM Users
WHERE username IN ('alice', 'bob', 'charlie', 'david');
SQL

TCOUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Tournament_Players")
echo -e "${GREEN}   ✓ 1 tournament with ${TCOUNT} players${NC}\n"

# ════════════════════════════════════════════════════════
# STATISTICS
# ════════════════════════════════════════════════════════
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📊 DATABASE STATISTICS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"

sqlite3 "$DB_PATH" <<SQL
.mode column
.headers on
SELECT 
    (SELECT COUNT(*) FROM Users) as 'Total_Users',
    (SELECT COUNT(*) FROM Users WHERE is_guest = 0) as 'Normal',
    (SELECT COUNT(*) FROM Users WHERE is_guest = 1) as 'Guests',
    (SELECT COUNT(*) FROM Matches) as 'Matches',
    (SELECT COUNT(*) FROM Friends) as 'Friends',
    (SELECT COUNT(*) FROM Tournament_Singlematches) as 'Tournaments';
SQL

echo -e "${YELLOW}═══════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}📝 TEST LOGIN CREDENTIALS:${NC}"
echo -e "   ${BLUE}Username:${NC} alice, bob, charlie, david, eve"
echo -e "   ${BLUE}Password:${NC} password123"
echo -e "   ${BLUE}Guests:${NC}   guest_player1, guest_player2, etc.\n"

echo -e "${GREEN}🎉 Test data seeded successfully!${NC}\n"
