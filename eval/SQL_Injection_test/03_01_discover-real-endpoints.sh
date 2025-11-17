#!/bin/bash
echo "=== DISCOVERING REAL ENDPOINTS ==="

# Login mit unserem User
echo "1️⃣ Logging in as test222..."
RESPONSE=$(curl -k -s -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test222@test.com","password":"Test123!"}' \
  -c cookies.txt)

echo "$RESPONSE" | jq .

TOKEN=$(echo "$RESPONSE" | jq -r '.token // empty')
USER_ID=$(echo "$RESPONSE" | jq -r '.user.id // .userId // empty')

if [ -z "$USER_ID" ]; then
  USER_ID=2
fi

echo ""
echo "User ID: $USER_ID"
echo "Token: ${TOKEN:0:50}..."

echo ""
echo "2️⃣ Testing various endpoint patterns..."

# Test verschiedene Muster
for endpoint in \
  "/api/user" \
  "/api/users/$USER_ID" \
  "/api/profile" \
  "/api/me" \
  "/api/user/profile" \
  "/api/user/me" \
  "/api/stats" \
  "/api/game" \
  "/api/games" \
  "/api/pong" \
  "/api/tournament" \
  "/api/tournaments"
do
  echo -n "  Testing GET $endpoint → "
  STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" \
    "https://localhost:8443$endpoint" \
    -b cookies.txt \
    -H "Authorization: Bearer $TOKEN")
  
  if [ "$STATUS" != "404" ]; then
    echo "$STATUS ✓"
    curl -k -s "https://localhost:8443$endpoint" \
      -b cookies.txt \
      -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || echo ""
  else
    echo "404"
  fi
done

