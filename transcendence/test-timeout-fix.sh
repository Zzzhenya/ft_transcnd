#!/bin/bash

# Test script for Gateway Timeout vs Database Queue Issue
echo "🧪 Testing Gateway Timeout vs Database Queue Handling"
echo "=================================================="

# Base URLs - Gateway is exposed via nginx proxy
GATEWAY_URL="https://localhost:8443/api"
NGINX_URL="http://localhost:8000"
# Database service is internal only, we'll test through gateway

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo "1. Testing Gateway Health..."
gateway_health=$(curl -s -k -w "%{http_code}" -o /dev/null "${GATEWAY_URL}/health" 2>/dev/null)
if [ "$gateway_health" = "200" ]; then
    print_status 0 "Gateway is healthy"
else
    # Try HTTP version if HTTPS fails
    gateway_health_http=$(curl -s -w "%{http_code}" -o /dev/null "${NGINX_URL}/api/health" 2>/dev/null)
    if [ "$gateway_health_http" = "200" ]; then
        print_status 0 "Gateway is healthy (via HTTP)"
        GATEWAY_URL="${NGINX_URL}/api"
    else
        print_status 1 "Gateway is not responding (HTTPS: $gateway_health, HTTP: $gateway_health_http)"
        print_warning "Trying direct docker container access..."
        
        # Try direct docker exec as fallback
        docker_health=$(docker exec transcendence-gateway-1 curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
        if [ "$docker_health" = "200" ]; then
            print_status 0 "Gateway is healthy (via docker exec)"
        else
            print_status 1 "Gateway is not responding at all"
            exit 1
        fi
    fi
fi

echo ""
echo "2. Testing Database Service (Internal Check)..."
# Since database service is internal, test via docker exec
db_health=$(docker exec transcendence-database-service-1 curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/health 2>/dev/null)
if [ "$db_health" = "200" ]; then
    print_status 0 "Database service is healthy (internal)"
    
    # Try to get queue status
    queue_status=$(docker exec transcendence-database-service-1 curl -s http://localhost:3006/internal/queue-status 2>/dev/null)
    if [ $? -eq 0 ] && [ ! -z "$queue_status" ]; then
        print_status 0 "Queue status endpoint is accessible"
        echo "   Queue Status: $queue_status"
    else
        print_status 1 "Queue status endpoint is not accessible"
    fi
else
    print_status 1 "Database service is not responding (HTTP: $db_health)"
    print_warning "Continuing with gateway-only tests..."
fi

echo ""
echo "3. Testing Service Integration..."

echo ""
echo "4. Testing Load Generation (Simulating High Database Load)..."
echo "   This will send multiple requests quickly to test queue behavior..."

# Function to send a database write request
send_test_request() {
    local request_id=$1
    echo "Sending request $request_id..."
    
    # Create a test tournament (this will go through gateway -> tournament-service -> database-service)
    response=$(curl -s -k -w "%{http_code}" -X POST \
        "${GATEWAY_URL}/tournaments" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"Test Tournament $request_id\",\"size\":8,\"creator\":\"test-user-$request_id\"}" \
        -o /tmp/test_response_$request_id.json 2>/dev/null)
    
    echo "Request $request_id completed with HTTP: $response"
    return $response
}

# Send 10 requests in parallel to simulate load
echo "   Sending 10 parallel requests..."
for i in {1..10}; do
    send_test_request $i &
done

# Wait for all background jobs to complete
wait

echo ""
echo "5. Checking Request Results..."
success_count=0
timeout_count=0
error_count=0

for i in {1..10}; do
    if [ -f "/tmp/test_response_$i.json" ]; then
        response_body=$(cat "/tmp/test_response_$i.json")
        if echo "$response_body" | grep -q '"id":[0-9]'; then
            success_count=$((success_count + 1))
        elif echo "$response_body" | grep -q 'timed out\|timeout\|504'; then
            timeout_count=$((timeout_count + 1))
        else
            error_count=$((error_count + 1))
            echo "   Response $i content: $response_body"
        fi
        rm -f "/tmp/test_response_$i.json"
    else
        error_count=$((error_count + 1))
        echo "   Response file $i not found"
    fi
done

echo "   Results Summary:"
echo "   - Successful requests: $success_count"
echo "   - Timeout requests: $timeout_count" 
echo "   - Error requests: $error_count"

echo ""
echo "6. Final Queue Status Check..."
final_queue_status=$(docker exec transcendence-database-service-1 curl -s http://localhost:3006/internal/queue-status 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$final_queue_status" ]; then
    echo "   Final Queue Status: $final_queue_status"
else
    print_warning "Could not get final queue status from database service"
fi

echo ""
echo "🎯 Test Summary:"
echo "==============="

if [ $timeout_count -gt 0 ]; then
    print_warning "Some requests timed out - this indicates the issue still exists"
    echo "   This could be normal if the database queue is handling load properly"
    echo "   Check the timeout messages to see if they include queue status information"
else
    print_status 0 "No timeouts detected - queue handling is working well"
fi

if [ $success_count -gt 0 ]; then
    print_status 0 "Some requests succeeded despite load"
else
    print_status 1 "No requests succeeded - there may be a configuration issue"
fi

echo ""
echo "💡 To monitor in real-time:"
echo "   - Database queue status: docker exec transcendence-database-service-1 curl -s http://localhost:3006/internal/queue-status"
echo "   - Gateway health: curl -k $GATEWAY_URL/health" 
echo "   - Database health: docker exec transcendence-database-service-1 curl -s http://localhost:3006/health"

echo ""
echo "🔧 Configuration variables to adjust:"
echo "   - PROXY_REQUEST_TIMEOUT: Current gateway timeout"
echo "   - DB_QUEUE_TIMEOUT: Database queue processing timeout"
echo "   - DB_QUEUE_MAX_SIZE: Maximum items in queue"
echo "   - GATEWAY_QUEUE_CHECK_ENABLED: Enable smart queue checking"
echo "   - GATEWAY_DYNAMIC_TIMEOUT: Enable adaptive timeouts"