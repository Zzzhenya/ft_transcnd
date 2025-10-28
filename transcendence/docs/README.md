# 📚 Transcendence Documentation

Welcome to the complete documentation for the Transcendence project - a modern microservices-based Pong game application with HTTPS, real-time gaming, and comprehensive monitoring.

## 🏗️ Architecture Overview

```
Browser (HTTPS) → nginx (SSL + Reverse Proxy) → Gateway (Route Orchestration) → Microservices (HTTP Internal)
```

**Current Status: ✅ FULLY IMPLEMENTED HTTPS ARCHITECTURE**

## 📑 Documentation Index

### 🚀 Getting Started
- **[API Contracts](api-contracts.md)** - Complete API documentation with HTTPS endpoints
- **[HTTPS Guide](HTTPS-GUIDE.md)** - HTTPS setup and security implementation
- **[Environment Configuration](README-ENV.md)** - Environment variables and configuration guide

### 🛠️ Deployment & Operations
- **[Deployment Scripts](deployment-scripts.md)** - Shell scripts for SSL, health checks, and deployment
- **[ELK Stack Guide](elk-stack.md)** - Logging and monitoring setup
- **[Architecture Guide](architecture.md)** - System architecture and design decisions

### 📊 Monitoring & Maintenance
- **[Deployment Guide](deployment.md)** - Production deployment guidelines
- **[Remote Player Guide](remote-player.md)** - Multi-player game setup
- **[Tournament Flow](tournament_flow.md)** - Tournament system documentation
- **[Used Modules](used-modules.md)** - Third-party dependencies and modules

## 🎯 Quick Start Guide

### 1. First Time Setup
```bash
# Generate SSL certificates
./generate-ssl.sh

# Configure environment (optional - defaults work)
./env-config.sh check

# Start all services
docker compose up -d --build

# Verify everything is working
./health-check.sh
```

### 2. Access Application
- **Frontend**: https://localhost
- **API Documentation**: See [API Contracts](api-contracts.md)
- **Health Monitoring**: https://localhost/api/health

### 3. Development Workflow
```bash
# Check service health
./health-check.sh

# View logs
docker compose logs -f gateway

# Restart services
docker compose restart

# Stop all services
docker compose down
```

## ✅ Implementation Status

### 🎉 Completed Features
- **HTTPS Infrastructure**: Complete SSL termination with nginx
- **Microservices Architecture**: Gateway + User + Game + Log + Tournament services
- **Authentication System**: JWT-based auth with HTTPS endpoints
- **Real-time Gaming**: WebSocket support with WSS (secure WebSocket)
- **Health Monitoring**: Comprehensive health checks for all services
- **Local Game**: Full backend integration with persistent game logic
- **API Documentation**: Complete endpoint documentation with HTTPS URLs
- **Security Headers**: HSTS, XSS protection, content type protection
- **Environment Management**: Flexible configuration for development/production

### 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser (HTTPS)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ https://localhost
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    nginx (Port 443)                            │
│  ✅ SSL Termination  ✅ Security Headers  ✅ Reverse Proxy     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP (internal)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Gateway (Port 3000)                          │
│  ✅ Route Orchestration  ✅ WebSocket Proxy  ✅ Session Mgmt   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP (Docker network)
            ┌─────────────┼─────────────┬─────────────┐
            ▼             ▼             ▼             ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ User Service│ │ Game Service│ │ Log Service │ │ Tournament  │
    │  (Port 3001)│ │ (Port 3002) │ │ (Port 3003) │ │ (Port 3005) │
    └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### 🔐 Security Implementation

- **SSL/TLS**: TLSv1.2/1.3 with secure cipher suites
- **HTTPS Everywhere**: All endpoints use HTTPS
- **Secure WebSocket**: WSS for real-time game communication
- **Security Headers**: Comprehensive protection against common attacks
- **JWT Authentication**: Secure token-based authentication
- **CORS Configuration**: Properly configured for HTTPS frontend

### 🎮 Gaming Features

- **Real-time Gameplay**: WebSocket-based communication
- **Backend Integration**: Full game logic on server side
- **Local Games**: Two-player local gaming
- **Tournament System**: Multi-round tournament support
- **Health Monitoring**: Real-time service monitoring

## 🔧 Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `./generate-ssl.sh` | Generate SSL certificates | `./generate-ssl.sh` |
| `./health-check.sh` | Check all service health | `./health-check.sh` |
| `./env-config.sh` | Configure environment | `./env-config.sh check` |
| `./fix-elk.sh` | Configure ELK stack | `./fix-elk.sh` |

## 📊 Service Endpoints

### Frontend Access (Browser)
- **Application**: https://localhost
- **API Base**: https://localhost/api
- **WebSocket**: wss://localhost/ws

### API Endpoints
- **Authentication**: https://localhost/api/auth/{register,login,profile}
- **Game API**: https://localhost/api/pong/game
- **Health Checks**: https://localhost/api/{service}/health

### WebSocket Endpoints
- **Game WebSocket**: wss://localhost/ws/pong/game-ws/{gameId}

## 🛠️ Development Tools

### Docker Management
```bash
# Start all services
docker compose up -d --build

# View logs
docker compose logs -f [service-name]

# Restart specific service
docker compose restart [service-name]

# Stop all services
docker compose down
```

### Health Monitoring
```bash
# Check all services
./health-check.sh

# Manual health checks
curl -k https://localhost/api/health
curl -k https://localhost/api/user-service/health
curl -k https://localhost/api/game-service/health
```

### Testing
```bash
# Test user registration
curl -k -X POST https://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"testpass123"}'

# Test game creation
curl -k -X POST https://localhost/api/pong/game \
  -H "Content-Type: application/json" \
  -d '{"player1_id":1,"player1_name":"Player 1","player2_id":2,"player2_name":"Player 2"}'
```

## 📝 Contributing

When adding new features or making changes:

1. **Update Documentation**: Modify relevant documentation files
2. **Test HTTPS**: Ensure all new endpoints work with HTTPS
3. **Health Checks**: Add health checks for new services
4. **Environment Variables**: Update environment documentation
5. **API Documentation**: Update API contracts with new endpoints

## 🔗 Related Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Fastify Documentation](https://fastify.dev/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 📞 Support

For questions or issues:
1. Check the relevant documentation section
2. Run `./health-check.sh` to verify system status
3. Check service logs with `docker compose logs [service-name]`
4. Create an issue with detailed error information

---

**Status**: ✅ Production Ready HTTPS Implementation  
**Last Updated**: October 28, 2025  
**Version**: 2.0 (HTTPS)