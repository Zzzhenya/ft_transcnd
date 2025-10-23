# ELK Stack - Log Management Guide

Complete guide for the Elasticsearch, Logstash, and Kibana (ELK) monitoring stack.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [For Evaluators](#for-evaluators)

## 🚀 Quick Start

### Start ELK Stack
```bash
# Start with monitoring profile
docker-compose --profile monitoring up -d

# Wait for initialization (~90 seconds)
docker-compose logs -f kibana-setup

# You should see:
# ✅ Successfully imported Kibana dashboards!
# ✅ Data retention policy set to 30 days
```

### Access Kibana
```
http://localhost:5601
```

### Send Test Log
```bash
curl -X POST http://localhost:5044 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "message": "Hello ELK!",
    "service": "test",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'
```

### View Logs

1. Open: http://localhost:5601
2. Go to: **Analytics** → **Discover**
3. Select data view: `logstash-transcendence-*` or `transcendence-logs-*`
4. Search for your test message!

## 🏗️ Architecture

### Complete Data Flow
```
┌─────────────┐
│  Services   │ (user-service, game-service, etc.)
│             │
└──────┬──────┘
       │ HTTP POST to :3003
       │ {level, message, service, metadata}
       ▼
┌──────────────────┐
│   Log Service    │ Port 3003
│   (Aggregator)   │
└────┬──────────┬──┘
     │          │
     │          └─────────────────┐
     │ Winston                    │ HTTP POST to :5000
     │ ElasticsearchTransport     │
     ▼                            ▼
┌────────────┐            ┌──────────────┐
│Elasticsearch│◄───────────│  Logstash    │
│  :9200     │            │  :5044→:5000 │
│            │            └──────────────┘
│ Indices:   │                   │
│ • transcendence-logs-*  │      │ Enriches with:
│ • logstash-transcendence-*│    │ • Tags
│            │                   │ • Environment
└─────┬──────┘                   │ • Project name
      │                          │
      │ Query                    │
      ▼                          │
┌─────────────┐                  │
│   Kibana    │                  │
│   :5601     │                  │
│             │                  │
│ • Discover  │◄─────────────────┘
│ • Dashboards│
│ • Visualize │
└─────────────┘
```

### Dual-Path Logging

The log-service sends logs to **TWO destinations simultaneously**:

#### Path 1: Direct to Elasticsearch (Winston)
- **Speed**: Immediate (~100ms)
- **Index**: `transcendence-logs-YYYY.MM.DD`
- **Use case**: Fast log storage
- **Fields**: Basic log data only

#### Path 2: Through Logstash
- **Speed**: Near real-time (~1-2s)
- **Index**: `logstash-transcendence-YYYY.MM.dd`
- **Use case**: Enriched logs with tags
- **Fields**: Original + tags + environment + project

**Why both?**
- ✅ **Redundancy**: If Logstash is down, Winston still works
- ✅ **Speed**: Immediate logging via Winston
- ✅ **Enrichment**: Tags and metadata via Logstash
- ✅ **Flexibility**: Choose index pattern based on needs

## ⚙️ Configuration

### Ports

| Service | Internal Port | External Port | Purpose | Accessible? |
|---------|---------------|---------------|---------|-------------|
| Log Service | 3003 | - | HTTP API | No (internal) |
| Logstash | 5000 | 5044 | HTTP input | ✅ Yes |
| Elasticsearch | 9200 | - | REST API | No (internal) |
| Kibana | 5601 | 5601 | Web UI | ✅ Yes |

**Note**: Logstash port mapping `5044:5000` avoids conflict with macOS AirPlay (port 5000).

### Environment Variables
```bash
# Log Service
ELASTICSEARCH_URL=http://elasticsearch:9200
LOGSTASH_URL=http://logstash:5000

# Elasticsearch
ES_JAVA_OPTS=-Xms512m -Xmx512m

# Logstash
LS_JAVA_OPTS=-Xms256m -Xmx256m
```

### Index Patterns

Two index patterns are created automatically:

1. **transcendence-logs-*** - Winston direct path
2. **logstash-transcendence-*** - Logstash enriched path

### ILM Policy (Auto-configured)

The `elasticsearch-setup` container automatically applies:
```json
{
  "policy": {
    "phases": {
      "hot": {
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
}
```

**What this means:**
- Logs are kept for **30 days**
- Indices roll over every 7 days or 50GB
- Old indices are automatically deleted

**Verify ILM is active:**
```bash
curl http://localhost:9200/_ilm/policy/transcendence-logs-policy
```

## 📖 Usage

### Sending Logs from Services

All services use the log-service API:
```javascript
// Example from any service
const axios = require('axios');

async function logEvent(level, message, metadata = {}) {
  try {
    await axios.post('http://log-service:3003/api/logs', {
      level,    // 'info', 'warn', 'error', 'debug'
      message,
      service: 'my-service',
      metadata
    });
  } catch (error) {
    console.error('Log failed:', error.message);
  }
}

// Usage
await logEvent('info', 'User logged in', { userId: 123 });
await logEvent('error', 'Database error', { error: err.message });
```

### Batch Logging
```javascript
await axios.post('http://log-service:3003/api/logs/batch', {
  logs: [
    { level: 'info', message: 'Event 1', service: 'my-service' },
    { level: 'warn', message: 'Event 2', service: 'my-service' }
  ]
});
```

### Direct Logstash Testing (External)
```bash
# From your host machine (not inside Docker)
curl -X POST http://localhost:5044 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "message": "Direct to Logstash",
    "service": "external-test",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'
```

### Viewing Logs in Kibana

#### Step 1: Access Kibana
```
http://localhost:5601
```

#### Step 2: Navigate to Discover
**Analytics** → **Discover**

#### Step 3: Select Data View
Choose one of:
- `transcendence-logs-*` (Winston path - simpler)
- `logstash-transcendence-*` (Logstash path - with tags) **← Recommended**

#### Step 4: Search and Filter

**Basic search:**
```
service: "game-service"
level: "error"
message: *database*
```

**KQL (Kibana Query Language) examples:**
```
# All errors from user-service
service: "user-service" AND level: "error"

# Logs with specific metadata
metadata.userId: "123"

# Time-based
@timestamp > "2024-01-01"

# Combine conditions
service: "game-service" AND (level: "error" OR level: "warn")
```

### Pre-configured Dashboards

Access at: http://localhost:5601 → **Analytics** → **Dashboard**

**1. Service Health Dashboard**
- Total logs per service (last 24h)
- Log level distribution (pie chart)
- Error rate trends
- Active services count

**2. Error Tracking Dashboard**
- Error count timeline
- Top error messages
- Errors by service (bar chart)
- Recent error details

**3. Performance Metrics Dashboard**
- Response time trends
- Request volumes
- Slow queries (>1s)

### Creating Custom Visualizations

1. Go to: **Analytics** → **Visualize Library**
2. Click **Create visualization**
3. Choose type:
   - **Line chart** - Trends over time
   - **Bar chart** - Compare categories
   - **Pie chart** - Distributions
   - **Data table** - Raw data
   - **Metric** - Single number
4. Select data view: `logstash-transcendence-*`
5. Configure:
   - Y-axis: Count, Sum, Average, etc.
   - X-axis: Time, Service, Level, etc.
6. Save to a dashboard

## 🐛 Troubleshooting

### No logs appearing in Kibana

**Step 1: Check Elasticsearch indices**
```bash
curl http://localhost:9200/_cat/indices?v

# You should see:
# transcendence-logs-*
# logstash-transcendence-*
```

**Step 2: Check Logstash is processing**
```bash
docker-compose logs logstash | tail -30

# Look for:
# "Pipeline running"
# "Successfully started Logstash API endpoint"
```

**Step 3: Send test log**
```bash
curl -X POST http://localhost:5044 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "message": "Troubleshooting test",
    "service": "debug",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'
```

**Step 4: Query Elasticsearch directly**
```bash
# Check if log arrived
curl -s "http://localhost:9200/logstash-transcendence-*/_search?q=Troubleshooting" | grep -A 5 "message"
```

**Step 5: Check Kibana data view**
1. Go to: **Stack Management** → **Data Views**
2. Verify data views exist
3. If missing, create manually:
   - Name: `Transcendence Logs`
   - Index pattern: `logstash-transcendence-*`
   - Timestamp field: `@timestamp`

### Kibana not starting

**Check health:**
```bash
curl http://localhost:5601/api/status

# or

docker-compose logs kibana | tail -50
```

**Common issues:**
- **"Kibana server is not ready yet"** - Wait 60-90 seconds
- **Memory error** - Increase Docker memory to 4GB+
- **Connection refused** - Check Elasticsearch is healthy

**Restart Kibana:**
```bash
docker-compose restart kibana
docker-compose logs -f kibana
```

### Elasticsearch health issues

**Check cluster health:**
```bash
curl http://localhost:9200/_cluster/health?pretty
```

**Expected response:**
```json
{
  "status": "yellow",  // Yellow is OK for single-node
  "number_of_nodes": 1,
  "active_primary_shards": 5
}
```

**If status is RED:**
```bash
# Check logs
docker-compose logs elasticsearch | tail -50

# Restart
docker-compose restart elasticsearch
```

### Logstash not processing logs

**Check pipeline status:**
```bash
curl http://localhost:9600/_node/stats/pipelines?pretty
```

**Check logs:**
```bash
docker-compose logs logstash | grep -i error
```

**Restart Logstash:**
```bash
docker-compose restart logstash
docker-compose logs -f logstash
```

### Dashboards not imported

**Check kibana-setup logs:**
```bash
docker-compose logs kibana-setup
```

**Manually import:**
```bash
curl -X POST "http://localhost:5601/api/saved_objects/_import?overwrite=true" \
  -H "kbn-xsrf: true" \
  --form file=@monitoring/kibana/saved-objects/kibana-export.ndjson
```

### "Connection refused" errors

**Check Docker network:**
```bash
docker-compose ps

# All services should be "Up" or "healthy"
```

**Test connectivity between containers:**
```bash
docker exec transcendence-logstash ping elasticsearch
docker exec log-service ping logstash
```

## 🎓 For Evaluators

### Quick Validation Checklist

**1. Start services (2 minutes)**
```bash
docker-compose --profile monitoring up -d
sleep 90  # Wait for initialization
```

**2. Verify containers (30 seconds)**
```bash
docker-compose ps

# Expected: All "Up" or "healthy"
# Should see:
# - transcendence-elasticsearch
# - transcendence-logstash
# - transcendence-kibana
# - kibana-setup (Exited 0)
# - elasticsearch-setup (Exited 0)
```

**3. Check Kibana (1 minute)**
```bash
open http://localhost:5601

# Navigate to: Analytics → Dashboard
# Should see 3 pre-configured dashboards
```

**4. Send test log (30 seconds)**
```bash
curl -X POST http://localhost:5044 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "message": "Evaluation test log",
    "service": "evaluation",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'

# Wait 10 seconds
sleep 10
```

**5. Verify in Kibana (1 minute)**