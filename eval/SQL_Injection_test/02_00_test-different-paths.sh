#!/bin/bash

echo "=== Testing WITHOUT /api prefix ==="
curl -k -X POST https://localhost:8443/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test111","email":"test111@test.com","password":"Test123!"}' \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Testing WITH /api prefix ==="
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test222","email":"test222@test.com","password":"Test123!"}' \
  -w "\nHTTP Status: %{http_code}\n\n"

