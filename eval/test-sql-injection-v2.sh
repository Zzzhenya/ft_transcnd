#!/bin/bash

echo "=== Test 1: Valid email mit SQL-Injection ==="
curl -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\'' OR '\''1'\''='\''1", "password":"egal"}' \
  -k -s | jq .

echo "\n=== Test 2: SQL Comment Injection ==="
curl -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\''--", "password":"egal"}' \
  -k -s | jq .

echo "\n=== Test 3: UNION SELECT ==="
curl -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com'\'' UNION SELECT NULL--", "password":"egal"}' \
  -k -s | jq .

echo "\n=== Test 4: Im Register-Formular ==="
curl -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"alias":"admin'\''--", "email":"test@hack.com", "password":"test123"}' \
  -k -s | jq .

cho "=== Testing internal database access ==="

# Test 1: Von user-service aus (sollte funktionieren)
echo "\n1️⃣ Testing from user-service container:"
docker exec $(docker compose ps -q user-service) \
  curl -s http://database-service:3006/internal/list?table=Users | jq .

# Test 2: Prüfe Health Endpoint
echo "\n2️⃣ Database service health:"
docker exec $(docker compose ps -q user-service) \
  curl -s http://database-service:3006/health | jq .

# Test 3: Prüfe Schema
echo "\n3️⃣ Database schema:"
docker exec $(docker compose ps -q user-service) \
  curl -s http://database-service:3006/internal/schema | jq .
