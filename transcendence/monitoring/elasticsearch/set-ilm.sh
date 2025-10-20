#!/bin/bash

echo "Setting up Index Lifecycle Management..."

# Wait for Elasticsearch
sleep 30

# Create ILM policy
curl -X PUT "http://localhost:9200/_ilm/policy/transcendence-logs-policy" \
  -H 'Content-Type: application/json' \
  -d @/usr/share/elasticsearch/config/ilm-policy.json

echo "✅ ILM policy created - logs will be deleted after 30 days"
