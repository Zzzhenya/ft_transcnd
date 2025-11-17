# #!/bin/bash
# echo "=== PHASE 2: CREATE ACCOUNT ==="

# # Registriere einen User
# curl -k -X POST https://localhost:8443/api/auth/register \
#   -H "Content-Type: application/json" \
#   -d '{
#     "alias": "attacker",
#     "email": "attacker@test.com",
#     "password": "Hacker123!"
#   }' \
#   -c cookies.txt \
#   -v

# echo "\n\n=== LOGIN ==="
# # Login
# curl -k -X POST https://localhost:8443/api/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{
#     "email": "attacker@test.com",
#     "password": "Hacker123!"
#   }' \
#   -c cookies.txt \
#   -v

# echo "\n\nSession Cookie saved in cookies.txt"

# echo "=== PHASE 2: CORRECTED REGISTRATION ==="

# # Registrierung (ohne /api prefix!)
# echo "1️⃣ Registering attacker account..."
# curl -k -X POST https://localhost:8443/auth/register \
#   -H "Content-Type: application/json" \
#   -d '{
#     "username": "attacker",
#     "email": "attacker@test.com",
#     "password": "Hacker123!"
#   }' \
#   -c cookies.txt \
#   -s | jq .

# echo "\n2️⃣ Logging in..."
# curl -k -X POST https://localhost:8443/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{
#     "email": "attacker@test.com",
#     "password": "Hacker123!"
#   }' \
#   -c cookies.txt \
#   -s | jq .

# echo "\n3️⃣ Getting my user info..."
# curl -k -X GET https://localhost:8443/users/me \
#   -b cookies.txt \
#   -s | jq .

echo "=== PHASE 2: DEBUG VERSION ==="

echo ""
echo "1️⃣ Registering attacker account..."
RESPONSE=$(curl -k -X POST https://localhost:8443/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "attacker",
    "email": "attacker@test.com",
    "password": "Hacker123!"
  }' \
  -c cookies.txt \
  -s)

echo "Raw Response:"
echo "$RESPONSE"
echo ""
echo "Parsed with jq (if valid JSON):"
echo "$RESPONSE" | jq . 2>/dev/null || echo "Not valid JSON!"

echo ""
echo "2️⃣ Logging in..."
RESPONSE=$(curl -k -X POST https://localhost:8443/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attacker@test.com",
    "password": "Hacker123!"
  }' \
  -c cookies.txt \
  -s)

echo "Raw Response:"
echo "$RESPONSE"
echo ""
echo "Parsed with jq (if valid JSON):"
echo "$RESPONSE" | jq . 2>/dev/null || echo "Not valid JSON!"

echo ""
echo "3️⃣ Getting my user info..."
RESPONSE=$(curl -k -X GET https://localhost:8443/users/me \
  -b cookies.txt \
  -s)

echo "Raw Response:"
echo "$RESPONSE"
echo ""
echo "Parsed with jq (if valid JSON):"
echo "$RESPONSE" | jq . 2>/dev/null || echo "Not valid JSON!"

echo ""
echo "4️⃣ Cookie file content:"
cat cookies.txt
