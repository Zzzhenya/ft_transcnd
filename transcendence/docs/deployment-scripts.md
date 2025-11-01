# Deployment Scripts Documentation

This document describes the shell scripts available in the root directory for managing the Transcendence application deployment.

## 📜 Available Scripts

### 🔐 generate-ssl.sh
**Purpose:** Generate self-signed SSL certificates for HTTPS development.

**Usage:**
```bash
./generate-ssl.sh
```

**What it does:**
- Creates `nginx/ssl/` directory if it doesn't exist
- Generates a private key (`private.key`) using RSA 2048-bit encryption
- Creates a self-signed certificate (`certificate.crt`) valid for 365 days
- Sets appropriate file permissions for security
- Configures certificate for `localhost` and common variations

**Output Files:**
- `nginx/ssl/private.key` - Private key file
- `nginx/ssl/certificate.crt` - Public certificate file

**Certificate Details:**
- **Validity:** 365 days from creation
- **Algorithm:** RSA 2048-bit
- **Subject:** `/C=US/ST=State/L=City/O=Organization/CN=localhost`
- **DNS Names:** localhost, *.localhost

**Security Notes:**
- ⚠️ **Development Only** - Self-signed certificates are not trusted by browsers
- 🔒 Private key is protected with 600 permissions
- 📅 Remember to regenerate before expiration

---

### 🏥 health-check.sh
**Purpose:** Comprehensive health check for all microservices through the API gateway.

**Usage:**
```bash
./health-check.sh
```

**What it checks:**
1. **Gateway Health** - `https://localhost/api/health`
2. **User Service** - `https://localhost/api/user-service/health`
3. **Game Service** - `https://localhost/api/game-service/health`
4. **Log Service** - `https://localhost/api/log-service/health`
5. **Tournament Service** - `https://localhost/api/tournament-service/health`

**Features:**
- ✅ Color-coded output (green = healthy, red = error)
- 🕐 Timestamp for each check
- 📊 Overall system status summary
- 🔍 Detailed error messages when services are down
- 🔐 HTTPS/SSL support with `-k` (allow self-signed certificates)

**Sample Output:**
```
[2025-10-28 15:46:13] ✅ Gateway: healthy
[2025-10-28 15:46:14] ✅ User Service: healthy
[2025-10-28 15:46:15] ✅ Game Service: healthy (uptime: 1240s)
[2025-10-28 15:46:16] ✅ Log Service: healthy
[2025-10-28 15:46:17] ✅ Tournament Service: healthy

🎉 All services are healthy!
```

**Exit Codes:**
- `0` - All services healthy
- `1` - One or more services unhealthy

---

### ⚙️ env-config.sh
**Purpose:** Environment configuration and validation script.

**Usage:**
```bash
./env-config.sh [check|setup|validate]
```

**Commands:**
- `check` - Validate current environment configuration
- `setup` - Interactive setup of environment variables
- `validate` - Check all required environment variables are set

**Environment Variables Checked:**
- `NODE_ENV` - Application environment (development/production)
- `VITE_API_BASE` - Frontend API base URL
- `VITE_GATEWAY_BASE` - Gateway base URL
- `VITE_WS_BASE` - WebSocket base URL
- `JWT_SECRET` - JWT signing secret
- `DATABASE_URL` - Database connection string
- Service URLs for all microservices

**Features:**
- 🔍 Comprehensive environment validation
- 🛠️ Interactive setup wizard
- 📋 Environment variable documentation
- ⚠️ Security warnings for default values
- 💾 Backup and restore of `.env` files

---

### 🔧 fix-elk.sh
**Purpose:** Fix and configure ELK stack (Elasticsearch, Logstash, Kibana) for logging.

**Usage:**
```bash
./fix-elk.sh
```

**What it does:**
- Configures Elasticsearch heap size and settings
- Sets up Logstash pipelines and patterns
- Configures Kibana dashboards and index patterns
- Fixes common ELK stack permission issues
- Optimizes ELK performance for development

**ELK Configuration:**
- **Elasticsearch:** Single node cluster, development settings
- **Logstash:** Application log parsing and indexing
- **Kibana:** Dashboard setup for log visualization

**Fixed Issues:**
- Memory allocation problems
- Index template conflicts
- Permission issues with log directories
- Network connectivity between ELK components

---

## 🚀 Deployment Workflow

### Initial Setup
```bash
# 1. Generate SSL certificates for HTTPS
./generate-ssl.sh

# 2. Configure environment
./env-config.sh setup

# 3. Fix ELK stack (if using logging)
./fix-elk.sh

# 4. Start services
docker compose up -d --build

# 5. Verify deployment
./health-check.sh
```

### Regular Operations
```bash
# Check system health
./health-check.sh

# Validate configuration
./env-config.sh validate

# Restart services
docker compose restart

# View logs
docker compose logs -f gateway
```

### Troubleshooting
```bash
# Check individual service health
curl -k https://localhost/api/user-service/health

# Verify SSL certificates
openssl x509 -in nginx/ssl/certificate.crt -text -noout

# Test environment configuration
./env-config.sh check

# Rebuild specific service
docker compose up -d --build gateway
```

---

## 🔒 Security Considerations

### SSL Certificates
- 🚨 **Never use self-signed certificates in production**
- 🔄 Rotate certificates before expiration
- 🔐 Protect private keys with appropriate permissions
- 📅 Monitor certificate expiry dates

### Environment Variables
- 🔑 Change default JWT secrets in production
- 🌐 Restrict CORS origins for production
- 🔒 Use secure database passwords
- 📝 Document all environment variables

### Docker Security
- 🛡️ Run containers as non-root users
- 🔒 Use secrets management for sensitive data
- 🌐 Restrict network access between containers
- 📊 Monitor container resource usage

---

## 📝 Script Maintenance

### Adding New Scripts
1. Place script in root directory
2. Make executable: `chmod +x script-name.sh`
3. Add documentation to this file
4. Test with different environments
5. Add error handling and logging

### Script Standards
- ✅ Use bash shebang: `#!/bin/bash`
- 🛡️ Enable strict mode: `set -euo pipefail`
- 📝 Include help/usage information
- 🎨 Use color-coded output for clarity
- ⚠️ Validate prerequisites before execution

---

## 🤝 Contributing

When modifying deployment scripts:
1. Test in development environment first
2. Document all changes in this file
3. Update version comments in scripts
4. Ensure backward compatibility
5. Add appropriate error handling

For questions or issues with deployment scripts, please create an issue or contact the development team.