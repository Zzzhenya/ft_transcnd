# Environment Configuration Guide

This guide explains how to configure environment variables for the Transcendence project.

## 🚀 Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Use the configuration helper:**
   ```bash
   ./env-config.sh
   ```

3. **Start the application:**
   ```bash
   docker-compose up
   ```

## 📋 Environment Variables

### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | ✅ |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key-change-in-production` | ✅ |

### Frontend URLs (Browser-accessible - HTTPS Enabled)

| Variable | Description | Current Value | Required |
|----------|-------------|---------------|----------|
| `VITE_API_BASE` | API endpoints through nginx | `https://localhost/api` | ✅ |
| `VITE_GATEWAY_BASE` | Gateway through nginx | `https://localhost/api` | ✅ |
| `VITE_WS_BASE` | Secure WebSocket endpoint | `wss://localhost/ws` | ✅ |
| `FRONT_END_URL` | Frontend URL for CORS | `https://localhost` | ✅ |

### Service URLs (Internal Docker network)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `USER_SERVICE_URL` | User service internal URL | `http://user-service:3001` | ✅ |
| `GAME_SERVICE_URL` | Game service internal URL | `http://game-service:3002` | ✅ |
| `LOG_SERVICE_URL` | Log service internal URL | `http://log-service:3003` | ✅ |
| `TOURNAMENT_SERVICE_URL` | Tournament service internal URL | `http://tournament-service:3005` | ❌ |
| `GATEWAY_URL` | Gateway internal URL | `http://gateway:3000` | ❌ |

### Ports

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GATEWAY_PORT` | Gateway service port | `3000` | ❌ |
| `USER_SERVICE_PORT` | User service port | `3001` | ❌ |
| `GAME_SERVICE_PORT` | Game service port | `3002` | ❌ |
| `LOG_SERVICE_PORT` | Log service port | `3003` | ❌ |
| `FRONTEND_PORT` | Frontend port | `3004` | ❌ |
| `TOURNAMENT_SERVICE_PORT` | Tournament service port | `3005` | ❌ |

### Service Hosts (External access)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GAME_SERVICE_HOST` | Game service external host | `localhost` | ❌ |
| `USER_SERVICE_HOST` | User service external host | `localhost` | ❌ |
| `LOG_SERVICE_HOST` | Log service external host | `localhost` | ❌ |

### Database

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | SQLite database path | `sqlite:/app/shared/database/transcendence.db` | ✅ |

### Monitoring & Logging

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOGSTASH_URL` | Logstash endpoint | `http://logstash:5000` | ❌ |
| `ELASTICSEARCH_URL` | Elasticsearch endpoint | `http://elasticsearch:9200` | ❌ |
| `KIBANA_URL` | Kibana web interface | `http://localhost:5601` | ❌ |
| `ES_JAVA_OPTS` | Elasticsearch JVM options | `-Xms512m -Xmx512m` | ❌ |
| `LS_JAVA_OPTS` | Logstash JVM options | `-Xms256m -Xmx256m` | ❌ |

### Development Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DEBUG` | Enable debug logging | `false` | ❌ |
| `CORS_ALLOW_ALL` | Allow CORS for all origins (dev only) | `true` | ❌ |

## 🔧 Configuration Modes

### ✅ Current HTTPS Development Mode (IMPLEMENTED)
```bash
NODE_ENV=development

# Frontend URLs (Browser → nginx → gateway)
VITE_API_BASE=https://localhost/api
VITE_GATEWAY_BASE=https://localhost/api
VITE_WS_BASE=wss://localhost/ws
FRONT_END_URL=https://localhost

# Backend URLs (Docker internal network)
USER_SERVICE_URL=http://user-service:3001
GAME_SERVICE_URL=http://game-service:3002
LOG_SERVICE_URL=http://log-service:3003
GATEWAY_URL=http://gateway:3000
```

### Production Mode (Template)
```bash
NODE_ENV=production
VITE_API_BASE=https://yourdomain.com/api
VITE_GATEWAY_BASE=https://yourdomain.com/api
VITE_WS_BASE=wss://yourdomain.com/ws
FRONT_END_URL=https://yourdomain.com
JWT_SECRET=your-secure-random-secret-key
```

### 🏗️ Architecture Overview
```
Browser (HTTPS) → nginx (SSL Termination) → Gateway (Route Orchestration) → Microservices (HTTP Internal)

nginx:443 → gateway:3000 → user-service:3001
          → gateway:3000 → game-service:3002
          → gateway:3000 → log-service:3003
```

## 🛠️ Configuration Helper Script

The `env-config.sh` script provides an interactive way to manage your environment:

```bash
./env-config.sh
```

Features:
- Show current environment status
- Validate environment configuration
- Switch between development/docker/production modes
- Generate secure JWT secrets
- Check for common configuration issues

## 🔒 Security Notes

### Development
- Default JWT secret is fine for development
- CORS is enabled for all origins
- Debug logging may be enabled

### Production
- **MUST** change `JWT_SECRET` to a secure random value
- Use HTTPS/WSS protocols
- Disable debug logging
- Restrict CORS origins
- Use environment-specific database URLs

### Generating Secure JWT Secret

```bash
# Using OpenSSL (recommended)
openssl rand -hex 32

# Using the configuration script
./env-config.sh
# Choose option 4: "Generate new JWT secret"
```

## 🐳 Docker Integration

The environment variables are automatically loaded in docker-compose.yml:

```yaml
services:
  gateway:
    env_file:
      - .env
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - USER_SERVICE_URL=${USER_SERVICE_URL:-http://user-service:3001}
      # ... other variables
```

## 🧪 Testing Configuration

Verify your configuration works:

```bash
# Start services
docker-compose up

# Check health endpoints
curl http://localhost:3000/health
curl http://localhost:3000/user-service/health
curl http://localhost:3000/game-service/health
curl http://localhost:3000/log-service/health

# Test frontend
curl http://localhost:3004
```

## 🔍 Troubleshooting

### Common Issues

1. **Services can't connect to each other**
   - Check internal service URLs use Docker service names
   - Verify ports match between services

2. **Frontend can't reach API**
   - Check `VITE_*` variables point to gateway
   - Ensure gateway is accessible from browser

3. **WebSocket connections fail**
   - Verify `VITE_WS_BASE` uses correct protocol (ws/wss)
   - Check proxy configuration in gateway

4. **JWT authentication fails**
   - Ensure all services use the same `JWT_SECRET`
   - Check secret doesn't contain special characters that need escaping

### Debug Commands

```bash
# Check environment variables are loaded
docker compose exec gateway env | grep -E "(USER_SERVICE_URL|GAME_SERVICE_URL)"

# Test service connectivity (internal)
docker compose exec gateway curl http://user-service:3001/health

# Test HTTPS endpoints (external)
curl -k https://localhost/api/health
curl -k https://localhost/api/user-service/health
curl -k https://localhost/api/auth/register -X POST -H "Content-Type: application/json" -d '{"username":"test","email":"test@test.com","password":"test123"}'

# Check logs
docker compose logs nginx
docker compose logs gateway
docker compose logs user-service

# Verify health of all services
./health-check.sh
```

## 📁 File Structure

```
transcendence/
├── .env                 # Your local environment (git-ignored)
├── .env.example         # Template with default values
├── .gitignore          # Excludes .env files
├── env-config.sh       # Interactive configuration helper
├── docker-compose.yml  # Uses environment variables
└── README-ENV.md       # This guide
```

## 🔄 Migration from Hardcoded Values

If you're migrating from hardcoded values:

1. **Check current hardcoded values:**
   ```bash
   grep -r "localhost:" services/
   grep -r "http://.*:3" services/
   ```

2. **Update service code to use environment variables:**
   ```javascript
   // Before
   const API_URL = 'http://user-service:3001';
   
   // After
   const API_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
   ```

3. **Test thoroughly** with different environment configurations

## 📚 Additional Resources

- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js process.env](https://nodejs.org/api/process.html#process_process_env)