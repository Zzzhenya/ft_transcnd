#!/bin/bash

echo "🎯 Setting up Kibana Data View"
echo "================================"
echo ""

# Send 5 test logs with different levels
echo "📤 Sending test logs..."

for i in {1..5}; do
    LEVEL=("info" "warn" "error" "debug" "info")
    SERVICE=("user-service" "game-service" "log-service" "gateway" "tournament-service")
    
    curl -s -X POST http://localhost:5044 \
      -H "Content-Type: application/json" \
      -d '{
        "level": "'${LEVEL[$i-1]}'",
        "message": "Test log #'$i' - '"${LEVEL[$i-1]}"'",
        "service": "'${SERVICE[$i-1]}'",
        "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
      }' > /dev/null
    
    echo "  ✓ Sent log $i/${#LEVEL[@]}"
    sleep 1
done

echo ""
echo "✅ Test logs sent!"
echo ""
echo "================================"
echo "Now open Kibana and create data view:"
echo ""
echo "1. Open: http://localhost:5601"
echo "2. Go to: Stack Management → Data Views"
echo "3. Click: Create data view"
echo "4. Fill in:"
echo "   Name: Transcendence Logs"
echo "   Pattern: transcendence-logs-*"
echo "   Timestamp: @timestamp"
echo "5. Click: Save"
echo "6. Go to: Analytics → Discover"
echo "7. You should see 5 test logs!"
echo "================================"