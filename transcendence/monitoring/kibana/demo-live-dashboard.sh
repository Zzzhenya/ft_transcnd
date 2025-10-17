#!/bin/bash

echo "🎬 Demonstrating Live Dashboard Updates"
echo "========================================"
echo ""
echo "📊 Open Kibana: http://localhost:5601/app/dashboards"
echo "🔄 Enable auto-refresh: 10 seconds"
echo ""
echo "Watch the dashboard while this script sends logs..."
echo ""
read -p "Press ENTER when dashboard is open and refreshing..."

echo ""
echo "Sending logs continuously for 2 minutes..."

END_TIME=$(($(date +%s) + 120))  # 2 minutes from now

COUNTER=1
while [ $(date +%s) -lt $END_TIME ]; do
    # Random data
    SERVICES=("user-service" "game-service" "tournament-service")
    LEVELS=("info" "info" "warn" "error")
    SERVICE=${SERVICES[$RANDOM % ${#SERVICES[@]}]}
    LEVEL=${LEVELS[$RANDOM % ${#LEVELS[@]}]}
    
    # Send log
    curl -s -X POST http://localhost:5044 \
      -H "Content-Type: application/json" \
      -d '{
        "level": "'$LEVEL'",
        "message": "Live demo log #'$COUNTER'",
        "service": "'$SERVICE'",
        "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
      }' > /dev/null
    
    echo "📤 Sent log #$COUNTER ($LEVEL from $SERVICE)"
    COUNTER=$((COUNTER + 1))
    
    # Random delay (1-3 seconds)
    sleep $(($RANDOM % 3 + 1))
done

echo ""
echo "✅ Demo complete!"
echo "📊 Check your dashboard - you should see all new logs!"
echo "📈 Charts should show the recent activity spike!"