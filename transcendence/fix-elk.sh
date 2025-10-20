#!/bin/bash
cd transcendence

echo "🔧 Fixing ELK Stack..."

# 1. Verificar Elasticsearch
echo "Checking Elasticsearch..."
ES_HEALTH=$(curl -s http://localhost:9200/_cluster/health | jq -r '.status')
if [ "$ES_HEALTH" != "green" ] && [ "$ES_HEALTH" != "yellow" ]; then
  echo "❌ Elasticsearch unhealthy, restarting..."
  docker compose restart elasticsearch
  sleep 30
fi

# 2. Verificar Logstash
echo "Checking Logstash..."
if ! docker compose exec -T logstash curl -f http://localhost:9600/ > /dev/null 2>&1; then
  echo "❌ Logstash not responding, restarting..."
  docker compose restart logstash
  sleep 30
fi

# 3. Restart log-service
echo "Restarting log-service..."
docker compose restart log-service
sleep 10

# 4. Enviar log de prueba
echo "Sending test log..."
curl -X POST http://localhost:5044 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test log after restart",
    "service": "test",
    "timestamp": "'$(date -Iseconds)'"
  }'

# 5. Verificar que llegó
echo "Waiting 10 seconds for log to process..."
sleep 10

LOG_COUNT=$(curl -s "http://localhost:9200/transcendence-logs-*/_count" | jq '.count')
echo "✅ Total logs in Elasticsearch: $LOG_COUNT"

echo ""
echo "🎉 Done! Check Kibana at http://localhost:5601"
echo "   Go to: Analytics → Discover → Select 'transcendence-logs-*'"