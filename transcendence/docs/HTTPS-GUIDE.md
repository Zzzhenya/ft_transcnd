# 🔐 HTTPS Configuration Guide

## Overview
This guide explains how to use the HTTPS configuration in the ft_transcendence project.

## 🚀 Quick Start

```bash
# Generate SSL certificates (first time only)
./generate-ssl.sh

# Start all services with HTTPS
docker compose up -d --build

# Verify all services are healthy
./health-check.sh
```

Access your application at: **https://localhost**

## ✅ Current Implementation Status

**🎉 HTTPS is FULLY IMPLEMENTED and WORKING!**

- ✅ **nginx SSL termination** with valid certificates (expires 2026)
- ✅ **HTTP → HTTPS redirect** (automatic)
- ✅ **All API endpoints** working through HTTPS
- ✅ **WebSocket support** with WSS (secure WebSocket)
- ✅ **Security headers** implemented
- ✅ **Local game** working with backend integration
- ✅ **User registration/login** working through HTTPS
- ✅ **Health checks** for all services

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `./generate-ssl.sh` | Generate new SSL certificates |
| `./health-check.sh` | Check all service health via HTTPS |
| `./env-config.sh check` | Validate HTTPS environment configuration |
| `docker compose up -d --build` | Start all services with HTTPS |
| `curl -k https://localhost/api/health` | Test HTTPS API connection |

## 🔧 Configuration Details

### Nginx Configuration
- **HTTP → HTTPS redirect**: All HTTP traffic redirected to HTTPS
- **SSL Termination**: Nginx handles SSL/TLS encryption
- **Security Headers**: HSTS, X-Frame-Options, etc.
- **WebSocket Support**: WSS (secure WebSocket) enabled

### Services Architecture
```
Browser (HTTPS) → Nginx (SSL Termination) → Internal Services (HTTP)
```

### ✅ Working HTTPS URLs
- **Frontend**: https://localhost (nginx serves SPA)
- **API Gateway**: https://localhost/api/ (nginx → gateway proxy)
- **Auth Endpoints**: https://localhost/api/auth/register, /login, /profile
- **Game API**: https://localhost/api/pong/game (backend integration)
- **WebSockets**: wss://localhost/ws/pong/game-ws/{gameId}
- **Health Checks**: 
  - https://localhost/api/health (gateway)
  - https://localhost/api/user-service/health
  - https://localhost/api/game-service/health
  - https://localhost/api/log-service/health
  - https://localhost/api/tournament-service/health

## 🛡️ Security Features

### SSL/TLS Configuration
- **Protocols**: TLSv1.2, TLSv1.3
- **Ciphers**: High-security cipher suites
- **HSTS**: Enabled with 1-year max-age
- **Session Caching**: 10-minute sessions

### Security Headers
```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

## 🔑 Certificate Management

### Current Certificates
- **Location**: `nginx/ssl/`
- **Certificate**: `certificate.crt`
- **Private Key**: `private.key`
- **Validity**: 1 year from generation

### Generate New Certificates
```bash
# Using the provided script
./generate-ssl.sh

# Or manually with openssl
openssl genrsa -out nginx/ssl/private.key 2048
openssl req -new -x509 -key nginx/ssl/private.key \
    -out nginx/ssl/certificate.crt -days 365 \
    -subj "/CN=localhost"
```

## 🌐 Browser Setup

### Accept Self-Signed Certificate
1. Navigate to https://localhost
2. Click "Advanced" on the security warning
3. Click "Proceed to localhost (unsafe)"
4. Certificate will be remembered for the session

### Chrome/Chromium Flags (Development)
```bash
# Start Chrome with relaxed security for local development
google-chrome --ignore-certificate-errors --ignore-ssl-errors --allow-running-insecure-content
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Certificate Errors
```bash
# Check certificate validity
make ssl-verify

# Regenerate if expired
make ssl-cert
```

#### 2. Service Not Starting
```bash
# Check nginx configuration syntax
docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t

# Check ports are not in use
lsof -i :80,443
```

#### 3. WebSocket Connection Issues
- Ensure WSS URLs are used in frontend
- Check browser developer tools for mixed content warnings
- Verify WebSocket proxy configuration in nginx

### Debug Commands
```bash
# Test HTTPS connection
curl -k https://localhost/health

# Check certificate from browser perspective
openssl s_client -connect localhost:443 -servername localhost

# Monitor nginx logs
docker compose logs -f nginx
```

## 🧪 Testing HTTPS

### Manual Tests
```bash
# Test HTTP redirect
curl -v http://localhost

# Test HTTPS endpoint
curl -k https://localhost/api/health

# Test WebSocket (requires wscat)
wscat -c wss://localhost/ws --no-check
```

### Frontend Integration
The frontend configuration automatically uses HTTPS URLs when `NODE_ENV=production` or when HTTPS is detected.

## 📝 Production Considerations

### For Production Deployment:
1. **Real Certificates**: Use Let's Encrypt or purchased certificates
2. **Environment Variables**: Update all URLs to use your domain
3. **Security Headers**: Consider additional headers like CSP
4. **Certificate Renewal**: Set up automatic renewal process

### Environment Variables for Production:
```bash
VITE_API_BASE=https://yourdomain.com/api
VITE_GATEWAY_BASE=https://yourdomain.com/api
VITE_WS_BASE=wss://yourdomain.com/ws
FRONT_END_URL=https://yourdomain.com
```

## 🔗 Related Files
- `nginx/nginx.conf` - Main nginx configuration
- `docker-compose.yml` - Container orchestration
- `.env` - Environment variables
- `generate-ssl.sh` - Certificate generation script