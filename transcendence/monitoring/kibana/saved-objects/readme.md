# Kibana Saved Objects

This directory contains exported Kibana configurations for the ft_transcendence logging system.

## What's Included

- **Index Patterns**: `logs-*` pattern for searching log data
- **Dashboards**: Pre-configured monitoring dashboards
- **Visualizations**: Charts, graphs, and metrics
- **Saved Searches**: Common log queries

## File Structure
```
saved-objects/
├── kibana-export.ndjson    # Exported Kibana objects (auto-imported on startup)
└── README.md               # This file
```

## Automatic Import

When you start the services with `docker-compose up`, the `kibana-setup` service automatically imports these saved objects into Kibana.

## Dashboards Overview

### 1. Service Health Dashboard

**Purpose**: Monitor the overall health of all microservices

**Visualizations**:
- Total logs per service (last 24h)
- Log level distribution (pie chart)
- Error rate trends (line chart)
- Active services (metric)
- Recent errors (data table)

**Use Cases**:
- Quick health check of all services
- Identify which services are logging errors
- Monitor log volume per service

### 2. Error Tracking Dashboard

**Purpose**: Deep dive into errors and issues

**Visualizations**:
- Error count over time
- Top error messages
- Errors by service (bar chart)
- Error severity distribution
- Stack traces (data table)

**Use Cases**:
- Debug production issues
- Track error patterns
- Identify recurring problems

### 3. Performance Metrics Dashboard

**Purpose**: Monitor application performance

**Visualizations**:
- Average response times
- Request count per endpoint
- Slow queries (>1s)
- Database connection metrics
- Memory usage trends

**Use Cases**:
- Identify performance bottlenecks
- Monitor resource usage
- Track response time trends

## Creating Dashboards Manually

If the automatic import fails or you want to create custom dashboards:

### Step 1: Create Index Pattern

1. Open Kibana: http://localhost:5601
2. Go to: **Stack Management** → **Data Views**
3. Click **Create data view**
4. Enter:
   - Name: `logs-*`
   - Index pattern: `logs-*`
   - Timestamp field: `@timestamp`
5. Click **Save data view**

### Step 2: Explore Your Logs

1. Go to: **Analytics** → **Discover**
2. Select your `logs-*` data view
3. You should see your logs!

### Step 3: Create Visualizations

1. Go to: **Analytics** → **Dashboard**
2. Click **Create dashboard**
3. Click **Create visualization**
4. Choose visualization type:
   - **Bar chart**: Logs by service
   - **Line chart**: Logs over time
   - **Pie chart**: Log level distribution
   - **Data table**: Recent errors
   - **Metric**: Total log count

### Step 4: Save Dashboard

1. Click **Save** in the top right
2. Give it a name (e.g., "Service Health")
3. Add description
4. Click **Save**

## Common Queries

### Find All Errors
```
level: "ERROR"
```

### Find Logs from Specific Service
```
service: "game-service"
```

### Find Errors from Specific Service
```
service: "user-service" AND level: "ERROR"
```

### Find Slow Requests (>1 second)
```
duration: >1000
```

### Find Logs with Specific Message
```
message: *"database connection"*
```

## Exporting Your Changes

After creating or modifying dashboards:
```bash
cd monitoring/kibana
./export-dashboards.sh
```

This will export all your Kibana objects to `kibana-export.ndjson`.

**Don't forget to commit:**
```bash
git add saved-objects/kibana-export.ndjson
git commit -m "Update Kibana dashboards"
git push
```

## Troubleshooting

### Dashboards not importing
```bash
# Check if Kibana is running
docker ps | grep kibana

# Check Kibana logs
docker logs kibana

# Manually import
curl -X POST "http://localhost:5601/api/saved_objects/_import?overwrite=true" \
  -H "kbn-xsrf: true" \
  --form file=@saved-objects/kibana-export.ndjson
```

### No data in Kibana
```bash
# Check if logs are being sent to Logstash
docker logs logstash

# Check if Elasticsearch has data
curl http://localhost:9200/_cat/indices?v

# Send a test log
curl -X POST http://localhost:5000 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "message": "Test log",
    "service": "test",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'
```

### Index pattern not found

1. Go to: **Stack Management** → **Data Views**
2. Check if `logs-*` exists
3. If not, create it manually (see above)

## Tips

1. **Use filters**: Add filters to narrow down your search
2. **Save searches**: Save commonly used queries
3. **Set time range**: Adjust time range in top right
4. **Auto-refresh**: Enable auto-refresh for real-time monitoring
5. **Export data**: Export search results as CSV if needed

## Resources

- [Kibana Guide](https://www.elastic.co/guide/en/kibana/current/index.html)
- [KQL (Kibana Query Language)](https://www.elastic.co/guide/en/kibana/current/kuery-query.html)
- [Dashboard Best Practices](https://www.elastic.co/guide/en/kibana/current/dashboard.html)