#!/bin/bash

# Health Check Script for ft_transcendence
# Checks all services and their health endpoints

echo "=============================================="
echo "🏥 TRANSCENDENCE HEALTH CHECK"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URLs
HTTPS_BASE="https://localhost:8443/api"
HTTP_BASE="http://localhost:8000/api"

# Track overall health
ALL_HEALTHY=true

echo "📊 CONTAINER STATUS:"
echo "----------------------------------------------"
docker compose ps
echo ""

echo "🔍 DETAILED HEALTH CHECKS:"
echo "----------------------------------------------"

# Function to check health endpoint
check_health() {
    local service_name=$1
    local url=$2
    local use_https=${3:-true}
    
    if [ "$use_https" = true ]; then
        CURL_FLAGS="-k"
    else
        CURL_FLAGS=""
    fi
    
    printf "%-25s " "$service_name:"
    
    # Try to fetch health endpoint
    response=$(curl $CURL_FLAGS -s -w "%{http_code}" -o /tmp/health_check_$service_name.json --connect-timeout 5 --max-time 10 "$url" 2>&1)
    http_code=$(echo "$response" | tail -c 4)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ HEALTHY${NC} (HTTP $http_code)"
        # Show response if it's JSON
        if command -v jq &> /dev/null; then
            cat /tmp/health_check_$service_name.json | jq -c . 2>/dev/null
        else
            cat /tmp/health_check_$service_name.json 2>/dev/null
        fi
    elif [ "$http_code" = "000" ]; then
        echo -e "${RED}❌ UNREACHABLE${NC} (Connection failed)"
        ALL_HEALTHY=false
    else
        echo -e "${YELLOW}⚠️  UNHEALTHY${NC} (HTTP $http_code)"
        cat /tmp/health_check_$service_name.json 2>/dev/null
        ALL_HEALTHY=false
    fi
    
    # Clean up temp file
    rm -f /tmp/health_check_$service_name.json
}

echo ""
echo "1️⃣  PUBLIC ENDPOINTS (via nginx → gateway):"
echo "----------------------------------------------"
check_health "Gateway" "$HTTPS_BASE/health" true
check_health "User Service" "$HTTPS_BASE/user-service/health" true
check_health "Game Service" "$HTTPS_BASE/game-service/health" true
check_health "Log Service" "$HTTPS_BASE/log-service/health" true

echo ""
echo "2️⃣  INTERNAL SERVICE HEALTH (Docker network):"
echo "----------------------------------------------"

# Check internal health using docker exec
check_internal_health() {
    local service_name=$1
    local container_name=$2
    local internal_url=$3
    
    printf "%-25s " "$service_name (internal):"
    
    # Try to curl from inside the container
    if docker compose exec -T "$container_name" wget -qO- --timeout=5 "$internal_url" > /tmp/internal_$service_name.json 2>/dev/null; then
        echo -e "${GREEN}✅ HEALTHY${NC}"
        if command -v jq &> /dev/null; then
            cat /tmp/internal_$service_name.json | jq -c . 2>/dev/null || cat /tmp/internal_$service_name.json
        else
            cat /tmp/internal_$service_name.json
        fi
    else
        echo -e "${RED}❌ UNREACHABLE${NC}"
        ALL_HEALTHY=false
    fi
    
    rm -f /tmp/internal_$service_name.json
}

check_internal_health "Gateway" "gateway" "http://localhost:3000/health"
check_internal_health "User Service" "user-service" "http://localhost:3001/health"
check_internal_health "Game Service" "game-service" "http://localhost:3002/health"
check_internal_health "Log Service" "log-service" "http://localhost:3003/health"
check_internal_health "Tournament Service" "tournament-service" "http://localhost:3005/health"

echo ""
echo "3️⃣  INTER-SERVICE COMMUNICATION:"
echo "----------------------------------------------"

# Test if services can reach each other
check_inter_service() {
    local from_service=$1
    local to_service=$2
    local to_url=$3
    
    printf "%-40s " "$from_service → $to_service:"
    
    if docker compose exec -T "$from_service" wget -qO- --timeout=5 "$to_url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
        ALL_HEALTHY=false
    fi
}

check_inter_service "gateway" "user-service" "http://user-service:3001/health"
check_inter_service "gateway" "game-service" "http://game-service:3002/health"
check_inter_service "gateway" "log-service" "http://log-service:3003/health"
check_inter_service "gateway" "tournament-service" "http://tournament-service:3005/health"

echo ""
echo "4️⃣  DATABASE CONNECTIVITY:"
echo "----------------------------------------------"

# Check if services can connect to database
printf "%-25s " "Database Service:"
if docker compose exec -T database-service node -e "console.log('OK')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ RUNNING${NC}"
else
    echo -e "${RED}❌ NOT RUNNING${NC}"
    ALL_HEALTHY=false
fi

printf "%-25s " "Database (PostgreSQL):"
if docker compose exec -T database pg_isready -U transcendence > /dev/null 2>&1; then
    echo -e "${GREEN}✅ READY${NC}"
else
    echo -e "${YELLOW}⚠️  NOT READY${NC}"
    ALL_HEALTHY=false
fi

echo ""
echo "5️⃣  MONITORING SERVICES:"
echo "----------------------------------------------"

printf "%-25s " "Elasticsearch:"
if docker compose ps elasticsearch | grep -q "healthy"; then
    echo -e "${GREEN}✅ HEALTHY${NC}"
else
    echo -e "${YELLOW}⚠️  UNHEALTHY${NC}"
fi

printf "%-25s " "Kibana:"
if docker compose ps kibana | grep -q "healthy"; then
    echo -e "${GREEN}✅ HEALTHY${NC}"
    echo "   → http://localhost:5601"
else
    echo -e "${YELLOW}⚠️  UNHEALTHY${NC}"
fi

echo ""
echo "6️⃣  FRONTEND:"
echo "----------------------------------------------"

printf "%-25s " "Frontend (dev):"
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:3004 | grep -q "200"; then
    echo -e "${GREEN}✅ ACCESSIBLE${NC}"
    echo "   → http://localhost:3004"
else
    echo -e "${RED}❌ NOT ACCESSIBLE${NC}"
    ALL_HEALTHY=false
fi

printf "%-25s " "Frontend (production):"
if curl -k -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://localhost:8443 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ ACCESSIBLE${NC}"
    echo "   → https://localhost:8443"
else
    echo -e "${RED}❌ NOT ACCESSIBLE${NC}"
    ALL_HEALTHY=false
fi

echo ""
echo "=============================================="
if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}🎉 ALL SYSTEMS HEALTHY!${NC}"
    echo ""
    echo "🚀 Quick Links:"
    echo "   • Frontend (dev):     http://localhost:3004"
    echo "   • Frontend (prod):    https://localhost:8443"
    echo "   • API (HTTPS):        https://localhost:8443/api"
    echo "   • Kibana:             http://localhost:5601"
    echo "   • SQLite Web:         http://localhost:8080"
else
    echo -e "${RED}⚠️  SOME SERVICES ARE UNHEALTHY${NC}"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Check logs: docker compose logs <service-name>"
    echo "   2. Restart unhealthy services: docker compose restart <service-name>"
    echo "   3. Rebuild if needed: docker compose up -d --build <service-name>"
    echo "   4. Check nginx config: docker compose exec nginx nginx -t"
    exit 1
fi
echo "=============================================="
