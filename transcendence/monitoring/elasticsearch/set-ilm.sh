#!/bin/bash

echo "⏳ Waiting for Elasticsearch to be ready..."
sleep 30

echo "📋 Applying ILM policy for transcendence logs..."

# Create ILM policy for log retention
curl -X PUT "http://elasticsearch:9200/_ilm/policy/transcendence-logs-policy" \
  -H 'Content-Type: application/json' \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_size": "50gb",
              "max_age": "7d"
            }
          }
        },
        "delete": {
          "min_age": "30d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'

echo ""
echo "✅ ILM policy created successfully!"
echo "   - Logs will be deleted after 30 days"
echo "   - Indices roll over every 7 days or 50GB"