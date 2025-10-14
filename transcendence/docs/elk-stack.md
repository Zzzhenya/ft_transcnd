## Log Management (ELK Stack)

This project uses the ELK stack for centralized log management.

### Quick Start

1. **Start all services**:
```bash
   docker-compose up -d
```

2. **Wait for initialization** (~30-60 seconds):
```bash
   # Watch the logs
   docker-compose logs -f kibana-setup
   
   # You should see: "✅ Successfully imported Kibana dashboards!"
```

3. **Access Kibana**:
```
   http://localhost:5601
```

4. **View logs**:
   - Go to **Analytics** → **Discover**
   - Select **logs-*** data view
   - Explore your logs!

### Architecture
```
Services → Logstash (5044→5000) → Elasticsearch (9200) → Kibana (5601)
```

- **Logstash**: Receives and processes logs (external: 5044, internal: 5000)
- **Elasticsearch**: Stores and indexes logs
- **Kibana**: Visualizes and searches logs

### Sending Logs from Services

**Internal services** send logs to: `http://logstash:5000`
**External testing** send logs to: `http://localhost:5044`

```javascript
// Example from inside Docker network
await axios.post('http://logstash:5000', {
  level: 'INFO',
  message: 'User logged in',
  service: 'user-service',
  userId: 123,
  timestamp: new Date().toISOString()
});
```

**Recommended: Use Winston**
```bash
npm install winston winston-logstash
```
```javascript
const winston = require('winston');
const LogstashTransport = require('winston-logstash/lib/winston-logstash-latest');

const logger = winston.createLogger({
  transports: [
    new LogstashTransport({
      host: 'logstash',
      port: 5000
    })
  ]
});

logger.info('User logged in', { userId: 123, service: 'user-service' });
```

### Pre-configured Dashboards

1. **Service Health**: Overview of all services
2. **Error Tracking**: Error monitoring and analysis
3. **Performance Metrics**: Response times and performance

Access at: http://localhost:5601 → **Analytics** → **Dashboard**

### Creating Custom Dashboards

See detailed guide: [`monitoring/kibana/saved-objects/README.md`](monitoring/kibana/saved-objects/README.md)

### Exporting Dashboards

After creating/modifying dashboards:
```bash
cd monitoring/kibana
./export-dashboards.sh
git add saved-objects/kibana-export.ndjson
git commit -m "Update Kibana dashboards"
```

### Troubleshooting

**No logs appearing?**
```bash
# Check Elasticsearch indices
curl http://localhost:9200/_cat/indices?v | grep logs

# Send test log (external port)
curl -X POST http://localhost:5044 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "message": "Test log",
    "service": "test"
  }'

# Check Logstash logs
docker logs logstash
```

**Kibana not loading?**
```bash
# Check Kibana status
curl http://localhost:5601/api/status

# Restart Kibana
docker-compose restart kibana
```

### Port Reference

| Service        | Internal Port | External Port | Purpose                    | Exposed? |
|---------------|---------------|---------------|----------------------------|----------|
| Elasticsearch | 9200          | -             | Search API                 | No       |
| Logstash      | 5000          | 5044          | Log ingestion              | Yes      |
| Kibana        | 5601          | 5601          | Web UI                     | Yes      |
| Log Service   | 3003          | -             | Log aggregator             | No       |

**Note**: External port 5044 is used because macOS uses port 5000 for AirPlay Receiver.

### Data Persistence

Logs are stored in the `elasticsearch-data` Docker volume.

**Keep logs:**
```bash
docker-compose down  # Keeps volumes
```

**Delete logs:**
```bash
docker-compose down -v  # Removes volumes
```

### For Evaluators

When you clone this repository and run `docker-compose up -d`:

1. ✅ ELK stack starts automatically
2. ✅ Dashboards are imported automatically
3. ✅ Ready to view logs at http://localhost:5601

No additional configuration needed!