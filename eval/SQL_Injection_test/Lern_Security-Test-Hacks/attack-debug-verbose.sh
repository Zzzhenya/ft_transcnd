#!/bin/bash
echo "=== VERBOSE DEBUG ==="

echo ""
echo "1️⃣ REGISTER with status code:"
curl -k -X POST https://localhost:8443/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"attacker88","email":"attacker88@test.com","password":"Test123!"}' \
  -c cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "HTTP|< |>"

echo ""
echo ""
echo "2️⃣ LOGIN with status code:"
curl -k -X POST https://localhost:8443/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"attacker88@test.com","password":"Test123!"}' \
  -c cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "HTTP|< |>"

echo ""
echo ""
echo "3️⃣ GET USER INFO - verschiedene Pfade:"

echo "  Testing: /users/me"
curl -k -s https://localhost:8443/users/me \
  -b cookies.txt \
  -w "HTTP Status: %{http_code}\n" | head -5

echo ""
echo "  Testing: /api/users/me"
curl -k -s https://localhost:8443/api/users/me \
  -b cookies.txt \
  -w "HTTP Status: %{http_code}\n" | head -5

echo ""
echo "  Testing: /user"
curl -k -s https://localhost:8443/user \
  -b cookies.txt \
  -w "HTTP Status: %{http_code}\n" | head -5

echo ""
echo "  Testing: /api/user"
curl -k -s https://localhost:8443/api/user \
  -b cookies.txt \
  -w "HTTP Status: %{http_code}\n" | head -5

