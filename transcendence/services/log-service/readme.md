# Log Service

Centralized logging service for ft_transcendence microservices architecture.

## Architecture
```
Other Services → Log Service (3003) → Logstash (5000) → Elasticsearch → Kibana (5601)
                       ↓
                   Winston Logger
                       ↓
                 Elasticsearch
```

## Purpose

This service:
1. **Receives logs** from all microservices via HTTP
2. **Processes and enriches** log data with metadata
3. **Forwards to two destinations**:
   - **Elasticsearch** (via Winston) - for direct indexing
   - **Logstash** (via HTTP) - for additional processing and tagging

## How It Works

### 1. Log Collection

Services send logs to: `http://log-service:3003/api/logs`
```json
POST /api/logs
Content-Type: application/json

{
  "level": "info",
  "message": "User logged in successfully",
  "service": "user-service",
  "metadata": {
    "userId": "123",
    "ip": "192.168.1.1"
  }
}
```

### 2. Log Processing

The service:
- Validates required fields (level, message, service)
- Adds timestamp if not present
- Enriches with environment metadata
- Logs locally via Winston
- Forwards to Logstash for centralized processing

### 3. Log Storage

Logs are stored in Elasticsearch with index pattern:
```
transcendence-logs-YYYY.MM.DD
```

## API Endpoints

### POST /api/logs

Single log entry.

**Request:**
```json
{
  "level": "info|warn|error|debug",
  "message": "Log message",
  "service": "service-name",
  "metadata": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Log recorded"
}
```

### POST /api/logs/batch

Multiple log entries at once.

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

### GET /health

Health check endpoint.

**Response:**
```json
{
  "service": "log-service",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "elasticsearch": "connected",
  "logstash": "http://logstash:5000"
}
```

## Environment Variables
```bash
NODE_ENV=development                              # Environment
DATABASE_URL=sqlite:/app/shared/database/...      # Database URL
ELASTICSEARCH_URL=http://elasticsearch:9200       # Elasticsearch
LOGSTASH_URL=http://logstash:5000                 # Logstash URL
```

## Log Levels

- **error**: Critical errors that need immediate attention
- **warn**: Warning messages about potential issues
- **info**: General informational messages (default)
- **debug**: Detailed debug information

## Usage in Other Services

### Option 1: Direct HTTP Call (Simple)
```javascript
const axios = require('axios');

async function logToService(level, message, metadata = {}) {
  try {
    await axios.post('http://log-service:3003/api/logs', {
      level,
      message,
      service: 'your-service-name',
      metadata
    });
  } catch (error) {
    console.error('Failed to send log:', error.message);
  }
}

// Usage
await logToService('info', 'User registered', { userId: 123 });
await logToService('error', 'Database error', { error: err.message });
```

### Option 2: Create a Logger Module (Recommended)

**`your-service/src/logger.js`:**
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
      }, { timeout: 2000 });
    } catch (error) {
      // Fallback to console
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

**Usage:**
```javascript
const logger = require('./logger');

// In your code
logger.info('Server started', { port: 3001 });
logger.error('Failed to connect', { error: err.message });
logger.warn('High memory usage', { usage: '85%' });
```

## Port Configuration

| Service | Internal Port | External Port | Description | Exposed? |
|---------|---------------|---------------|-------------|----------|
| Log Service | 3003 | - | Log service API | ❌ No (internal only) |
| Logstash | 5000 | 5044 | HTTP input | ✅ Yes (external testing) |
| Kibana | 5601 | 5601 | Web UI | ✅ Yes |
| Elasticsearch | 9200 | - | Search API | ❌ No (internal only) |

**Note**: Port 5044→5000 mapping used because macOS reserves port 5000 for AirPlay.

## Data Flow

1. **Service → Log Service (3003)**
```
   POST http://log-service:3003/api/logs
```

2. **Log Service → Elasticsearch (9200)**
```
   Via Winston Transport
   Index: transcendence-logs-YYYY.MM.DD
```

3. **Log Service → Logstash (5000)**
```
   HTTP POST with additional metadata
```

4. **Logstash → Elasticsearch (9200)**
```
   Processed and tagged logs
   Index: logstash-transcendence-YYYY.MM.DD
```

5. **Kibana → Elasticsearch (9200)**
```
   Query and visualize logs
```

## Viewing Logs

### Option 1: Kibana (Recommended)

1. Open: http://localhost:5601
2. Go to: **Analytics** → **Discover**
3. Create data view: `transcendence-logs-*` or `logstash-*`
4. Search and filter your logs

### Option 2: Direct Elasticsearch Query
```bash
# Get all logs from today
curl http://localhost:9200/transcendence-logs-*/_search?pretty

# Search for errors
curl -X POST http://localhost:9200/transcendence-logs-*/_search?pretty \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "match": { "level": "error" }
    }
  }'
```

### Option 3: Docker Logs
```bash
# View log-service output
docker logs log-service

# View Logstash processing
docker logs transcendence-logstash

# Follow in real-time
docker logs -f log-service
```

## Testing

### Send Test Log

**Option 1: Via Log Service (if port exposed)**
```bash
curl -X POST http://localhost:3003/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test log from curl",
    "service": "test-service",
    "metadata": {
      "test": true
    }
  }'
```

**Option 2: Direct to Logstash**
```bash
curl -X POST http://localhost:5044 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Direct test to Logstash",
    "service": "test-service"
  }'
```

### Check if Log Arrived
```bash
# Check Elasticsearch
curl http://localhost:9200/transcendence-logs-*/_search?q=test

# Check in Kibana
# Open http://localhost:5601 and search for "test"
```

## Troubleshooting

### Logs not appearing in Kibana
```bash
# 1. Check log-service is running
docker ps | grep log-service

# 2. Check Elasticsearch has data
curl http://localhost:9200/_cat/indices?v | grep transcendence

# 3. Check Logstash is processing
docker logs transcendence-logstash

# 4. Send a test log and check each step
curl -X POST http://log-service:3003/api/logs -d '...'
```

### Connection Errors
```bash
# Check service is healthy
curl http://log-service:3003/health

# Check network connectivity
docker exec user-service ping log-service
docker exec log-service ping logstash
docker exec log-service ping elasticsearch
```

## Development
```bash
# Install dependencies
npm install

# Run locally (requires Elasticsearch)
export ELASTICSEARCH_URL=http://localhost:9200
export LOGSTASH_URL=http://localhost:5000
npm start

# Run tests
npm test
```

## Dependencies

- **fastify**: Fast web framework
- **winston**: Logging library
- **winston-elasticsearch**: Elasticsearch transport for Winston
- **axios**: HTTP client for Logstash communication

## Notes

- Log service runs on port 3003 (internal Docker network)
- All communication is within Docker network
- No ports need to be exposed except Kibana (5601) for viewing logs
- Logs are automatically cleaned up after 30 days (configurable in Elasticsearch)