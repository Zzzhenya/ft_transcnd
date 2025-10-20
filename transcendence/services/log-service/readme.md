# Log Service

Centralized logging service for ft_transcendence microservices architecture.

## 🎯 Overview

The Log Service is a **centralized log aggregator** that:

1. ✅ **Receives** logs from all microservices via HTTP API
2. ✅ **Validates** required fields (level, message, service)
3. ✅ **Enriches** logs with timestamps and metadata
4. ✅ **Forwards** to Logstash for processing and storage

### Why Use Log Service?

Instead of services sending logs directly to Logstash, log-service provides:

- **Abstraction**: Services don't need to know about ELK stack
- **Validation**: Ensures all logs have required fields
- **Single endpoint**: One URL for all services (`http://log-service:3003`)
- **Fallback logging**: Console output if Logstash is down
- **Future extensibility**: Easy to add features (filtering, sampling, etc.)

## 🏗️ Architecture
```
┌─────────────┐
│  Services   │ (user-service, game-service, tournament-service, gateway)
└──────┬──────┘
       │ HTTP POST to :3003
       │ {
       │   "level": "info",
       │   "message": "User logged in",
       │   "service": "user-service",
       │   "metadata": {"userId": 123}
       │ }
       ▼
┌──────────────────┐
│   Log Service    │ Port 3003
│   (Fastify)      │
│                  │ • Validates logs
│                  │ • Adds timestamps
│                  │ • Enriches metadata
│                  │ • Logs to console (debug)
└────────┬─────────┘
         │ HTTP POST to :5000
         │
         ▼
┌──────────────────┐
│    Logstash      │ Port 5000 (internal) / 5044 (external)
│                  │
│                  │ • Parses timestamps
│                  │ • Adds service tags
│                  │ • Enriches with environment
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Elasticsearch   │ Port 9200
│                  │
│  Index Pattern:  │
│  transcendence-  │
│  logs-*          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Kibana       │ Port 5601
│                  │
│  • Search logs   │
│  • Dashboards    │
│  • Visualizations│
└──────────────────┘
```

## 📡 API Endpoints

### POST `/api/logs`

Send a single log entry.

**Request:**
```json
{
  "level": "info",           // Required: info, warn, error, debug
  "message": "Log message",  // Required: string
  "service": "service-name", // Required: string
  "metadata": {              // Optional: any JSON object
    "userId": 123,
    "action": "login",
    "ip": "192.168.1.1"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Log recorded"
}
```

**Response (Error):**
```json
{
  "error": "Missing required fields: level, message, service"
}
```

**Example:**
```bash
curl -X POST http://log-service:3003/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "User logged in successfully",
    "service": "user-service",
    "metadata": {
      "userId": "123",
      "username": "john_doe"
    }
  }'
```

### POST `/api/logs/batch`

Send multiple log entries in a single request.

**Request:**
```json
{
  "logs": [
    {
      "level": "info",
      "message": "First log",
      "service": "game-service"
    },
    {
      "level": "error",
      "message": "Second log",
      "service": "user-service"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "count": 2
}
```

**Example:**
```bash
curl -X POST http://log-service:3003/api/logs/batch \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "level": "info",
        "message": "Game started",
        "service": "game-service",
        "metadata": {"gameId": 456}
      },
      {
        "level": "info",
        "message": "Player joined",
        "service": "game-service",
        "metadata": {"playerId": 789}
      }
    ]
  }'
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "service": "log-service",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "logstash": "http://logstash:5000"
}
```

**Example:**
```bash
curl http://log-service:3003/health
```

## ⚙️ Configuration

### Environment Variables
```bash
# Logstash connection (REQUIRED)
LOGSTASH_URL=http://logstash:5000

# Node environment
NODE_ENV=development
```

### Port Configuration

| Service | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------|
| Log Service | 3003 | Not exposed | Internal API |
| Logstash | 5000 | 5044 | HTTP input |
| Elasticsearch | 9200 | Not exposed | Storage |
| Kibana | 5601 | 5601 | Web UI |

**Important:** 
- Log service connects to Logstash on **internal port 5000**
- External testing uses **port 5044** (mapped to 5000)
- Port 5044 used instead of 5000 to avoid macOS AirPlay conflict

### Log Levels

- `info` - General informational messages (default)
- `warn` - Warning messages about potential issues
- `error` - Error messages requiring attention
- `debug` - Detailed debugging information

### Dependencies
```json
{
  "dependencies": {
    "fastify": "^4.15.0",  // Web framework
    "winston": "^3.11.0",   // Logging library
    "axios": "^1.12.2"      // HTTP client for Logstash
  }
}
```

## 💻 Usage Examples

### Example 1: Simple Logger Module

Create `your-service/src/utils/logger.js`:
```javascript
const axios = require('axios');

const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://log-service:3003';
const SERVICE_NAME = 'your-service-name';

class Logger {
  async log(level, message, metadata = {}) {
    try {
      await axios.post(`${LOG_SERVICE_URL}/api/logs`, {
        level,
        message,
        service: SERVICE_NAME,
        metadata
      }, {
        timeout: 2000,
        validateStatus: () => true
      });
    } catch (error) {
      // Fallback to console if log-service is unavailable
      console.log(`[${level.toUpperCase()}] ${message}`, metadata);
    }
  }

  info(message, metadata) {
    return this.log('info', message, metadata);
  }

  warn(message, metadata) {
    return this.log('warn', message, metadata);
  }

  error(message, metadata) {
    return this.log('error', message, metadata);
  }

  debug(message, metadata) {
    return this.log('debug', message, metadata);
  }
}

module.exports = new Logger();
```

**Usage in your service:**
```javascript
const logger = require('./utils/logger');

// Log user action
logger.info('User logged in', {
  userId: user.id,
  username: user.username,
  ip: req.ip
});

// Log error
try {
  await dangerousOperation();
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack
  });
}

// Log warning
if (memoryUsage > 0.8) {
  logger.warn('High memory usage detected', {
    usage: memoryUsage,
    threshold: 0.8
  });
}
```

### Example 2: Batch Logging for Performance
```javascript
// utils/batchLogger.js
const axios = require('axios');

class BatchLogger {
  constructor(flushInterval = 5000, maxSize = 100) {
    this.buffer = [];
    this.flushInterval = flushInterval;
    this.maxSize = maxSize;
    
    // Auto-flush every interval
    setInterval(() => this.flush(), this.flushInterval);
  }

  log(level, message, service, metadata = {}) {
    this.buffer.push({ level, message, service, metadata });
    
    // Flush if buffer is full
    if (this.buffer.length >= this.maxSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    
    const logs = [...this.buffer];
    this.buffer = [];
    
    try {
      await axios.post('http://log-service:3003/api/logs/batch', {
        logs
      }, { timeout: 5000 });
    } catch (error) {
      console.error('Batch log failed:', error.message);
      // Log to console as fallback
      logs.forEach(log => console.log(log));
    }
  }
}

module.exports = new BatchLogger();
```

## 🧪 Testing

### Test 1: Health Check
```bash
curl http://log-service:3003/health

# Expected response:
# {
#   "service": "log-service",
#   "status": "healthy",
#   "timestamp": "2024-01-15T10:30:00.000Z",
#   "logstash": "http://logstash:5000"
# }
```

### Test 2: Send Single Log
```bash
curl -X POST http://log-service:3003/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test log from curl",
    "service": "test-service",
    "metadata": {
      "test": true
    }
  }'

# Expected response:
# {"success":true,"message":"Log recorded"}
```

### Test 3: Send Batch Logs
```bash
curl -X POST http://log-service:3003/api/logs/batch \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {"level":"info","message":"Batch log 1","service":"test"},
      {"level":"warn","message":"Batch log 2","service":"test"},
      {"level":"error","message":"Batch log 3","service":"test"}
    ]
  }'

# Expected response:
# {"success":true,"count":3}
```

### Test 4: Verify Logs in Elasticsearch
```bash
# Wait 10 seconds for indexing
sleep 10

# Search for test logs
curl -s "http://elasticsearch:9200/transcendence-logs-*/_search?q=test-service&size=5&pretty"

# Should show your test logs
```

### Test 5: Verify Logs in Kibana

1. Open: http://localhost:5601
2. Go to: **Analytics** → **Discover**
3. Select data view: `transcendence-logs-*`
4. Search: `service: "test-service"`
5. You should see your test logs!

## 🐛 Troubleshooting

### Issue: Logs not appearing in Kibana

**Step 1: Check log-service is running**
```bash
docker ps | grep log-service
# Should show "Up" status

docker logs log-service | tail -20
# Check for errors
```

**Step 2: Check Logstash connection**
```bash
docker exec log-service wget -O- http://logstash:5000 2>&1
# Should connect (may return 404, that's OK)
```

**Step 3: Send test log and trace it**
```bash
# Send log
curl -X POST http://log-service:3003/api/logs \
  -H "Content-Type: application/json" \
  -d '{"level":"info","message":"TRACE_TEST","service":"debug"}'

# Check log-service logs
docker logs log-service | grep "TRACE_TEST"

# Check Logstash logs
docker logs transcendence-logstash | grep "TRACE_TEST"

# Check Elasticsearch
curl "http://elasticsearch:9200/transcendence-logs-*/_search?q=TRACE_TEST&pretty"
```

### Issue: "Connection refused" to Logstash

**Check Logstash is running:**
```bash
docker ps | grep logstash
docker logs transcendence-logstash | tail -30

# Look for: "Successfully started Logstash API endpoint"
```

**Verify environment variable:**
```bash
docker exec log-service env | grep LOGSTASH_URL
# Should show: LOGSTASH_URL=http://logstash:5000
```

**Test connection:**
```bash
docker exec log-service wget -O- http://logstash:5000 2>&1
```

### Issue: High memory usage

Log service uses minimal memory (~50MB). If you see high usage:
```bash
# Check actual memory usage
docker stats log-service --no-stream

# Restart if needed
docker-compose restart log-service
```

### Issue: Logs appearing in console but not Elasticsearch

This means Logstash isn't forwarding to Elasticsearch:
```bash
# Check Logstash to Elasticsearch connection
docker logs transcendence-logstash | grep -i "elasticsearch"

# Check Elasticsearch is healthy
curl http://elasticsearch:9200/_cluster/health?pretty

# Restart Logstash
docker-compose restart logstash
```

## 📊 Data Flow Summary
```
1. Service → log-service:3003/api/logs
   POST {level, message, service, metadata}

2. log-service validates and enriches:
   - Checks required fields
   - Adds timestamp if missing
   - Logs to console (for debugging)

3. log-service → logstash:5000
   HTTP POST with enriched data

4. Logstash processes:
   - Parses timestamps
   - Adds tags based on service
   - Enriches with environment/project

5. Logstash → elasticsearch:9200
   Indexed as: transcendence-logs-YYYY.MM.DD

6. Kibana:5601 queries Elasticsearch
   - Discover: Search logs
   - Dashboard: Visualize metrics
```

## 🔗 Related Documentation

- [ELK Stack Guide](../../docs/elk-stack.md) - Complete ELK setup
- [Kibana Dashboards](../../monitoring/kibana/saved-objects/readme.md) - Dashboard guide
- [Logstash Configuration](../../monitoring/logstash/logstash.conf) - Pipeline config
- [Architecture Overview](../../docs/architecture.md) - System design

---

**📝 Note**: This service is designed for internal Docker network use only. Port 3003 is not exposed externally for security.