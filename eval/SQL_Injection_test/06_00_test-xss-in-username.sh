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



test_username() {
    local username="$1"
    local email="$2"
    echo "Testing: $username"
    response=$(curl -k -X POST https://localhost:8443/api/auth/register \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"$username\",\"email\":\"$email\",\"password\":\"Test123!\"}" \
      -s)
    echo "Response: $response"
    echo "---"
}

# XSS Versuche - sollten ALLE abgelehnt werden
test_username "<script>alert('XSS')</script>" "test1@test.com"
test_username "<img src=x onerror=alert(1)>" "test2@test.com"
test_username "user<svg onload=alert(1)>" "test3@test.com"
test_username "user'><script>alert(1)</script>" "test4@test.com"
test_username "user&lt;script&gt;alert(1)&lt;/script&gt;" "test5@test.com"
test_username "user\"><script>alert(1)</script>" "test6@test.com"
test_username "user;DROP TABLE users;--" "test7@test.com"
test_username "user${alert(1)}" "test8@test.com"

echo "=== VALID USERNAMES - sollten funktionieren ==="
test_username "valid_user123" "valid1@test.com"
test_username "test-user-42" "valid2@test.com"
test_username "User_Name" "valid3@test.com"


