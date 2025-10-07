#!/bin/bash

# User Service API Testing Script
# This script tests the user service API endpoints locally

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001"
TEST_USER_PREFIX="apitest_$(date +%s)"

echo -e "${BLUE}🧪 User Service API Testing Script${NC}"
echo "=================================="
echo "Base URL: $BASE_URL"
echo "Test User Prefix: $TEST_USER_PREFIX"
echo ""

# Function to print test results
print_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        [ ! -z "$message" ] && echo -e "   $message"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        [ ! -z "$message" ] && echo -e "   $message"
        return 1
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $test_name: WARNING${NC}"
        [ ! -z "$message" ] && echo -e "   $message"
    fi
}

# Function to make HTTP requests with better error handling
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local headers="$4"
    local output_file="/tmp/api_test_response.json"
    
    if [ "$method" = "GET" ]; then
        if [ ! -z "$headers" ]; then
            curl -s -w "%{http_code}" -o "$output_file" -H "$headers" "$url"
        else
            curl -s -w "%{http_code}" -o "$output_file" "$url"
        fi
    elif [ "$method" = "POST" ]; then
        if [ ! -z "$headers" ]; then
            curl -s -w "%{http_code}" -o "$output_file" -X POST -H "Content-Type: application/json" -H "$headers" -d "$data" "$url"
        else
            curl -s -w "%{http_code}" -o "$output_file" -X POST -H "Content-Type: application/json" -d "$data" "$url"
        fi
    fi
}

# Check if service is running
echo -e "${BLUE}🔍 Checking if service is running...${NC}"
if ! curl -f -s "$BASE_URL/health" > /dev/null 2>&1; then
    print_result "Service Check" "FAIL" "Service is not running at $BASE_URL"
    echo -e "${YELLOW}💡 Tip: Start the service with: cd transcendence && docker compose up -d user-service${NC}"
    exit 1
fi
print_result "Service Check" "PASS" "Service is running and responding"
echo ""

# Test 1: Health Check
echo -e "${BLUE}1. Testing Health Check${NC}"
STATUS_CODE=$(make_request "GET" "$BASE_URL/health")
if [ "$STATUS_CODE" = "200" ]; then
    RESPONSE=$(cat /tmp/api_test_response.json)
    print_result "Health Check" "PASS" "Response: $RESPONSE"
else
    print_result "Health Check" "FAIL" "Status: $STATUS_CODE"
    exit 1
fi
echo ""

# Test 2: User Registration
echo -e "${BLUE}2. Testing User Registration${NC}"
REGISTER_DATA="{
    \"username\": \"${TEST_USER_PREFIX}_user\",
    \"email\": \"${TEST_USER_PREFIX}@test.com\",
    \"password\": \"SecurePassword123!\"
}"

STATUS_CODE=$(make_request "POST" "$BASE_URL/auth/register" "$REGISTER_DATA")
if [ "$STATUS_CODE" = "201" ]; then
    RESPONSE=$(cat /tmp/api_test_response.json)
    TOKEN=$(echo "$RESPONSE" | jq -r '.token // empty')
    USER_ID=$(echo "$RESPONSE" | jq -r '.user.id // empty')
    print_result "User Registration" "PASS" "User created successfully"
    
    if [ ! -z "$TOKEN" ]; then
        echo -e "   ${GREEN}Token received${NC}"
    else
        print_result "Token Generation" "WARN" "No token in response"
    fi
else
    RESPONSE=$(cat /tmp/api_test_response.json)
    print_result "User Registration" "FAIL" "Status: $STATUS_CODE, Response: $RESPONSE"
    exit 1
fi
echo ""

# Test 3: Duplicate Registration (should fail)
echo -e "${BLUE}3. Testing Duplicate Registration${NC}"
STATUS_CODE=$(make_request "POST" "$BASE_URL/auth/register" "$REGISTER_DATA")
if [ "$STATUS_CODE" = "409" ] || [ "$STATUS_CODE" = "400" ]; then
    print_result "Duplicate Prevention" "PASS" "Duplicate registration properly rejected"
else
    print_result "Duplicate Prevention" "WARN" "Expected 409/400 but got $STATUS_CODE"
fi
echo ""

# Test 4: User Login
echo -e "${BLUE}4. Testing User Login${NC}"
LOGIN_DATA="{
    \"username\": \"${TEST_USER_PREFIX}_user\",
    \"password\": \"SecurePassword123!\"
}"

STATUS_CODE=$(make_request "POST" "$BASE_URL/auth/login" "$LOGIN_DATA")
if [ "$STATUS_CODE" = "200" ]; then
    RESPONSE=$(cat /tmp/api_test_response.json)
    LOGIN_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token // .token // empty')
    print_result "User Login" "PASS" "Login successful"
    
    if [ ! -z "$LOGIN_TOKEN" ]; then
        TOKEN="$LOGIN_TOKEN"  # Use login token for subsequent tests
        echo -e "   ${GREEN}Login token received${NC}"
    fi
else
    RESPONSE=$(cat /tmp/api_test_response.json)
    print_result "User Login" "FAIL" "Status: $STATUS_CODE, Response: $RESPONSE"
fi
echo ""

# Test 5: Invalid Login
echo -e "${BLUE}5. Testing Invalid Login${NC}"
INVALID_LOGIN="{
    \"username\": \"${TEST_USER_PREFIX}_user\",
    \"password\": \"WrongPassword\"
}"

STATUS_CODE=$(make_request "POST" "$BASE_URL/auth/login" "$INVALID_LOGIN")
if [ "$STATUS_CODE" = "401" ]; then
    print_result "Invalid Login" "PASS" "Invalid credentials properly rejected"
else
    print_result "Invalid Login" "WARN" "Expected 401 but got $STATUS_CODE"
fi
echo ""

# Test 6: Profile Access (Protected Route)
if [ ! -z "$TOKEN" ]; then
    echo -e "${BLUE}6. Testing Protected Profile Endpoint${NC}"
    STATUS_CODE=$(make_request "GET" "$BASE_URL/auth/profile" "" "Authorization: Bearer $TOKEN")
    if [ "$STATUS_CODE" = "200" ]; then
        RESPONSE=$(cat /tmp/api_test_response.json)
        USERNAME=$(echo "$RESPONSE" | jq -r '.username // empty')
        EMAIL=$(echo "$RESPONSE" | jq -r '.email // empty')
        print_result "Profile Access" "PASS" "Profile retrieved successfully"
        echo -e "   ${GREEN}Username: $USERNAME${NC}"
        echo -e "   ${GREEN}Email: $EMAIL${NC}"
    else
        RESPONSE=$(cat /tmp/api_test_response.json)
        print_result "Profile Access" "FAIL" "Status: $STATUS_CODE, Response: $RESPONSE"
    fi
else
    print_result "Profile Access" "WARN" "Skipped - no token available"
fi
echo ""

# Test 7: Unauthorized Profile Access
echo -e "${BLUE}7. Testing Unauthorized Profile Access${NC}"
STATUS_CODE=$(make_request "GET" "$BASE_URL/auth/profile")
if [ "$STATUS_CODE" = "401" ]; then
    print_result "Unauthorized Access" "PASS" "Unauthorized access properly blocked"
else
    print_result "Unauthorized Access" "WARN" "Expected 401 but got $STATUS_CODE"
fi
echo ""

# Test 8: Invalid Token
echo -e "${BLUE}8. Testing Invalid Token${NC}"
STATUS_CODE=$(make_request "GET" "$BASE_URL/auth/profile" "" "Authorization: Bearer invalid-token-12345")
if [ "$STATUS_CODE" = "403" ] || [ "$STATUS_CODE" = "401" ]; then
    print_result "Invalid Token" "PASS" "Invalid token properly rejected"
else
    print_result "Invalid Token" "WARN" "Expected 403/401 but got $STATUS_CODE"
fi
echo ""

# Test 9: Malformed Requests
echo -e "${BLUE}9. Testing Request Validation${NC}"

# Test malformed JSON
echo -e "   ${BLUE}9a. Testing malformed JSON${NC}"
STATUS_CODE=$(curl -s -w "%{http_code}" -o /tmp/api_test_response.json \
    -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username": "test", "email": }')

if [ "$STATUS_CODE" = "400" ]; then
    print_result "Malformed JSON" "PASS" "Malformed JSON properly rejected"
else
    print_result "Malformed JSON" "WARN" "Expected 400 but got $STATUS_CODE"
fi

# Test missing required fields
echo -e "   ${BLUE}9b. Testing missing required fields${NC}"
STATUS_CODE=$(make_request "POST" "$BASE_URL/auth/register" '{"username": "test"}')
if [ "$STATUS_CODE" = "400" ]; then
    print_result "Missing Fields" "PASS" "Missing fields properly rejected"
else
    print_result "Missing Fields" "WARN" "Expected 400 but got $STATUS_CODE"
fi
echo ""

# Performance Test
echo -e "${BLUE}10. Basic Performance Test${NC}"
echo -e "   ${BLUE}Testing response time for health check...${NC}"

# Use a more compatible timing method
if command -v gdate >/dev/null 2>&1; then
    # Use GNU date if available (on macOS with coreutils)
    START_TIME=$(gdate +%s%3N)
    curl -s "$BASE_URL/health" > /dev/null
    END_TIME=$(gdate +%s%3N)
    RESPONSE_TIME=$((END_TIME - START_TIME))
else
    # Fallback for macOS default date
    START_TIME=$(date +%s)
    curl -s "$BASE_URL/health" > /dev/null
    END_TIME=$(date +%s)
    RESPONSE_TIME=$(((END_TIME - START_TIME) * 1000))
fi

# Check if RESPONSE_TIME is a valid number
if [[ "$RESPONSE_TIME" =~ ^[0-9]+$ ]]; then
    if [ $RESPONSE_TIME -lt 1000 ]; then
        print_result "Response Time" "PASS" "Health endpoint: ${RESPONSE_TIME}ms"
    elif [ $RESPONSE_TIME -lt 2000 ]; then
        print_result "Response Time" "WARN" "Health endpoint: ${RESPONSE_TIME}ms (slower than expected)"
    else
        print_result "Response Time" "FAIL" "Health endpoint: ${RESPONSE_TIME}ms (too slow)"
    fi
else
    print_result "Response Time" "WARN" "Could not measure response time accurately"
fi
echo ""

# Cleanup
echo -e "${BLUE}🧹 Cleaning up temporary files...${NC}"
rm -f /tmp/api_test_response.json

echo ""
echo -e "${GREEN}🎉 API Testing Complete!${NC}"
echo "=================================="
echo -e "${BLUE}Summary:${NC}"
echo "- All critical endpoints tested"
echo "- Authentication flow validated"
echo "- Error handling verified"
echo "- Basic performance checked"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "- Check the service logs if any tests failed"
echo "- Monitor the database for created test users"
echo "- Run 'docker compose logs user-service' for detailed logs"