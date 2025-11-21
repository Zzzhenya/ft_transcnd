#!/bin/bash
echo "=== PHASE 1: DISCOVERY ==="

# Test verschiedene Pfade
for path in \
  /api/auth/login \
  /api/auth/register \
  /api/user/profile \
  /api/users \
  /api/game \
  /api/tournament \
  /health \
  /api/stats \
  /api/upload \
  /api/avatar
do
  echo "\nTesting: $path"
  curl -k -s -o /dev/null -w "%{http_code}" https://localhost:8443$path
done
