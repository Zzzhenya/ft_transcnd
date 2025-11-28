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

# ' OR '1'='1
# ' OR '1'='1' --
# " OR "1"="1
# '; DROP TABLE users; --
# ' UNION SELECT null, null, null --
# admin'--
