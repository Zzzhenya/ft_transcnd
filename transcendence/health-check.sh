#!/bin/sh

set -e

#http://frontend:3004/health
#http://gateway:3000/health

SERVICES="
http://user-service:3001/health
http://game-service:3002/health
http://log-service:3003/health
http://tournament-service:3005/health
http://database-service:3006/health
"

for url in $SERVICES; do
  echo "Checking $url..."
  if curl --fail --silent "$url"; then
    echo "✅ $url is healthy"
  else
    echo "❌ $url is NOT healthy"
    exit 1
  fi
done
