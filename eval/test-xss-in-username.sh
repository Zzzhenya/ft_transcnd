#!/bin/bash
echo "=== TESTING XSS IN USERNAME ==="

echo "1️⃣ Registering user with XSS in username..."
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"<img src=x onerror=alert(1)>","email":"xsstest@test.com","password":"Test123!"}' \
  -s | jq .

echo ""
echo "2️⃣ Registering user with XSS in display name (via username)..."
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"<svg onload=alert(1)>","email":"xsstest2@test.com","password":"Test123!"}' \
  -s | jq .

echo ""
echo "3️⃣ Now login and check if the username appears in the response..."
curl -k -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"xsstest@test.com","password":"Test123!"}' \
  -s | jq .

