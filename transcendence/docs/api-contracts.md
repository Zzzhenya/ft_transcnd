
# API Contracts

## Overview
All services are accessed through nginx (HTTPS) → API Gateway architecture.

**Production URLs:**
- **Frontend**: `https://localhost` (nginx serves SPA + SSL termination)
- **API Base**: `https://localhost/api` (nginx → gateway proxy)
- **WebSocket**: `wss://localhost/ws` (nginx → gateway WebSocket proxy)

**Internal Docker Network:**
- Gateway: `http://gateway:3000`
- User Service: `http://user-service:3001`
- Game Service: `http://game-service:3002`
- Log Service: `http://log-service:3003`
- Tournament Service: `http://tournament-service:3005`

## Authentication
Protected endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Architecture Overview

```
Browser (HTTPS) → nginx (SSL + Reverse Proxy) → Gateway (Route Orchestration) → Microservices (HTTP Internal)
```

---

## Gateway Routes

### GET /
Gateway root endpoint.

**Response (200 OK):**
```json
{
  "hello": "Hello from API Gateway!"
}
```

---

### GET /health
Check gateway health status.

**Response (200 OK):**
```json
{
  "service": "gateway",
  "status": "healthy",
  "timestamp": "2025-10-08T12:00:00.000Z"
}
```

---

### ✅ GET /api/user-service/health
Check user service health through the gateway.

**URL:** `https://localhost/api/user-service/health`

**Response (200 OK):**
```json
{
  "service": "user-service",
  "status": "healthy",
  "timestamp": "2025-10-28T12:00:00.000Z"
}
```

---

### ✅ GET /api/game-service/health
Check game service health through the gateway.

**URL:** `https://localhost/api/game-service/health`

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "game-service",
  "timestamp": "2025-10-28T12:00:00.000Z",
  "uptime": 1240
}
```

---

### ✅ GET /api/log-service/health
Check log service health through the gateway.

**URL:** `https://localhost/api/log-service/health`

**Response (200 OK):**
```json
{
  "service": "log-service",
  "status": "healthy",
  "timestamp": "2025-10-28T12:00:00.000Z"
}
```

---

### ✅ GET /api/tournament-service/health
Check tournament service health through the gateway.

**URL:** `https://localhost/api/tournament-service/health`

**Response (200 OK):**
```json
{
  "service": "tournament-service",
  "status": "healthy",
  "timestamp": "2025-10-28T12:00:00.000Z"
}
```

---

## WebSocket Routes

### ✅ WSS /ws/pong/game-ws/:gameId
Secure WebSocket proxy to game service for Pong game.

**URL:** `wss://localhost/ws/pong/game-ws/{gameId}`

**Architecture Flow:**
```
Frontend → wss://localhost/ws → nginx (WebSocket upgrade) → gateway → game-service WebSocket
```

**Status:** ✅ **IMPLEMENTED** - Full WebSocket proxy with SSL support

---

## User Service (Through Gateway)

**✅ Status:** All auth endpoints are proxied through nginx → gateway → user-service

### POST /api/auth/register
Create a new user account.

**URL:** `https://localhost/api/auth/register`

**Architecture Flow:**
```
Frontend → /api/auth/register → nginx → /user-service/auth/register → gateway → user-service
```

**Request Body:**
```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (201 Created):**
```json
{
  "message": "Benutzer erfolgreich registriert",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string | null"
  },
  "token": "string (JWT)"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `409 Conflict` - Username or email already exists
- `500 Internal Server Error` - Server error

---

### POST /api/auth/login
Authenticate a user and receive a JWT token.

**URL:** `https://localhost/api/auth/login`

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "access_token": "string (JWT)",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string | null"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing username or password
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Server error

---

### GET /api/auth/profile
Get the current user's profile. **Requires authentication.**

**URL:** `https://localhost/api/auth/profile`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "avatar": "string | null",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

## Game Service (Through Gateway)

### GET /api/pong/game, POST /api/pong/game, etc.
All game endpoints are accessible through the gateway with `/api/` prefix.

**Base URL:** `https://localhost/api/`

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "game-service",
  "timestamp": "2025-10-08T12:00:00.000Z",
  "uptime": 12345
}
```

---

### GET /stats
Get game statistics and counters.

**Response (200 OK):**
```json
{
  "totalGames": 5,
  "activeGames": 2,
  "gameTypes": {
    "demo": 1,
    "registered": 2,
    "tournament": 0,
    "normal": 2
  },
  "counters": {
    "nextGameId": 6,
    "nextPlayerId": 10
  },
  "timestamp": "2025-10-08T12:00:00.000Z"
}
```

---

## Single Games (Registered Users)

### POST /api/pong/game
Create a single game for registered users (3 rounds, score limit 5).

**URL:** `https://localhost/api/pong/game`

**Request Body:**
```json
{
  "player1_id": 123,
  "player1_name": "Alice",
  "player2_id": 456,
  "player2_name": "Bob"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "player1_id": 123,
  "player2_id": 456,
  "player1_name": "Alice",
  "player2_name": "Bob",
  "status": "ready",
  "isRegistered": true,
  "maxRounds": 3,
  "scoreLimit": 5,
  "websocketUrl": "wss://localhost/ws/pong/game-ws/1",
  "message": "Single game created successfully (3 rounds, score limit: 5)"
}
```

---

### POST /pong/game/:gameId/join
Join an existing game as player2.

**Request Body:**
```json
{
  "player2_id": 456,
  "player2_name": "Bob"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "player1_id": 123,
  "player2_id": 456,
  "player1_name": "Alice",
  "player2_name": "Bob",
  "status": "ready",
  "message": "Successfully joined the game",
    "websocketUrl": "wss://localhost/ws/pong/game-ws/1"
}
```

---

### GET /pong/game
Get all single games.

**Response (200 OK):**
```json
{
  "games": [
    {
      "id": 1,
      "player1_id": 123,
      "player2_id": 456,
      "player1_name": "Alice",
      "player2_name": "Bob",
      "status": "active",
      "clientCount": 2,
      "createdAt": "2025-10-08T12:00:00.000Z",
      "currentRound": 1,
      "maxRounds": 3,
      "scoreLimit": 5
    }
  ],
  "total": 1,
  "message": "Found 1 single games"
}
```

---

### GET /pong/game/:gameId
Get specific single game details.

**Response (200 OK):**
```json
{
  "id": 1,
  "player1_id": 123,
  "player2_id": 456,
  "player1_name": "Alice",
  "player2_name": "Bob",
  "status": "active",
  "clientCount": 2,
  "maxRounds": 3,
  "scoreLimit": 5,
  "gameState": {
    "score": { "player1": 2, "player2": 1 },
    "ball": { "x": 300, "y": 200 },
    "paddles": { "player1": 200, "player2": 180 }
  }
}
```

---

### POST /pong/game/:gameId/move
Move paddle in single game.

**Request Body:**
```json
{
  "player": "player1",
  "direction": "up"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Moved player1 paddle up",
  "paddlePosition": 190,
  "gameState": {
    "ball": { "x": 300, "y": 200 },
    "paddles": { "player1": 190, "player2": 180 },
    "score": { "player1": 2, "player2": 1 }
  }
}
```

---

### PUT /pong/game/:gameId/result
Update game result when completed.

**Request Body:**
```json
{
  "winner": "player1",
  "finalScore": { "player1": 5, "player2": 3 },
  "roundsWon": { "player1": 3, "player2": 0 }
}
```

**Response (200 OK):**
```json
{
  "message": "Game result recorded",
  "result": {
    "gameId": 1,
    "winner": "player1",
    "timestamp": 1696774800000
  }
}
```

---

## Demo Games (Temporary Players)

### POST /pong/demo
Create a demo game with auto-generated temporary players.

**Response (201 Created):**
```json
{
  "id": 2,
  "player1_id": 1001,
  "player2_id": 1002,
  "player1_name": "d1001",
  "player2_name": "d1002",
  "status": "demo",
  "isDemo": true,
  "message": "Demo game created with temporary players",
  "websocketUrl": "wss://localhost/ws/pong/demo-ws/2"
}
```

---

### GET /pong/demo
Get all demo games.

**Response (200 OK):**
```json
{
  "demoGames": [
    {
      "id": 2,
      "player1_id": 1001,
      "player2_id": 1002,
      "player1_name": "d1001",
      "player2_name": "d1002",
      "status": "demo",
      "clientCount": 1,
      "createdAt": "2025-10-08T12:00:00.000Z"
    }
  ],
  "total": 1,
  "message": "Found 1 demo games"
}
```

---

### DELETE /pong/demo/:gameId
Delete a specific demo game.

**Response (200 OK):**
```json
{
  "message": "Demo game 2 deleted successfully",
  "deletedGame": {
    "id": 2,
    "player1_name": "d1001",
    "player2_name": "d1002"
  }
}
```

---

### DELETE /pong/demo
Delete all demo games.

**Response (200 OK):**
```json
{
  "message": "2 demo games deleted successfully",
  "deletedGames": [
    {
      "id": 2,
      "player1_name": "d1001",
      "player2_name": "d1002"
    },
    {
      "id": 3,
      "player1_name": "d1003",
      "player2_name": "d1004"
    }
  ]
}
```

---

### POST /pong/demo/:gameId/move
Move paddle in demo game.

**Request Body:**
```json
{
  "player": "player1",
  "direction": "down"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Moved player1 paddle down",
  "paddlePosition": 210,
  "gameState": {
    "ball": { "x": 300, "y": 200 },
    "paddles": { "player1": 210, "player2": 180 },
    "score": { "player1": 0, "player2": 0 }
  }
}
```

---

## WebSocket Game Communication

### WS /ws/pong/game-ws/:gameId
Real-time game communication for all game types (single, demo, tournament).

**Connection URL:** `wss://localhost/ws/pong/game-ws/{gameId}`

### WebSocket Message Types

#### Client → Server Messages

**Move Paddle:**
```json
{
  "type": "MOVE_PADDLE",
  "player": "player1",
  "direction": "up"
}
```

**Player Ready:**
```json
{
  "type": "PLAYER_READY",
  "player_id": 123
}
```

**Start Game:**
```json
{
  "type": "START_GAME"
}
```

**Restart Game:**
```json
{
  "type": "RESTART_GAME"
}
```

**Pause/Unpause:**
```json
{
  "type": "pause_game"
}
```
```json
{
  "type": "unpause_game"
}
```

#### Server → Client Messages

**Initial State:**
```json
{
  "type": "STATE_UPDATE",
  "gameId": 1,
  "player1_id": 123,
  "player2_id": 456,
  "player1_name": "Alice",
  "player2_name": "Bob",
  "status": "active",
  "playersReady": { "player1": true, "player2": true },
  "gameType": "normal",
  "isDemo": false,
  "isRegistered": true,
  "gameState": {
    "score": { "player1": 2, "player2": 1 },
    "ball": { "x": 300, "y": 200 },
    "paddles": { "player1": 200, "player2": 180 },
    "tournament": {
      "currentRound": 1,
      "maxRounds": 3,
      "scoreLimit": 5,
      "roundsWon": { "player1": 0, "player2": 0 },
      "gameStatus": "active"
    }
  }
}
```

**Player Joined:**
```json
{
  "type": "PLAYER_JOINED",
  "gameId": 1,
  "player2_name": "Bob",
  "status": "ready",
  "message": "Bob joined the game! Both players can now ready up."
}
```

**Player Ready Update:**
```json
{
  "type": "PLAYER_READY_UPDATE",
  "gameId": 1,
  "playerSlot": "player1",
  "playersReady": { "player1": true, "player2": false },
  "message": "Alice is ready!"
}
```

**Game Start Countdown:**
```json
{
  "type": "GAME_START_COUNTDOWN",
  "gameId": 1,
  "countdown": 3,
  "message": "Game starting in 3..."
}
```

**Game Started:**
```json
{
  "type": "GAME_STARTED",
  "gameId": 1,
  "message": "Game has started! Good luck!"
}
```

**Error:**
```json
{
  "type": "ERROR",
  "message": "Invalid message format"
}
```

---

### WS /ws/pong/demo-ws/:gameId
Alternative WebSocket endpoint specifically for demo games.

**Connection URL:** `wss://localhost/ws/pong/demo-ws/{gameId}`

**Note:** This redirects to the main WebSocket handler, so message format is identical.

---

## Tournament Service

TODO: Define tournament service endpoints

---

## Implementation Status

### ✅ Currently Implemented
- **HTTPS Infrastructure**: nginx SSL termination with valid certificates
- **Gateway health checks**: All services monitored (`/api/health`, `/api/user-service/health`, etc.)
- **Auth system**: Complete auth flow through nginx → gateway → user-service
- **Game service**: HTTP endpoints and WebSocket communication
- **WebSocket proxy**: Secure WSS connections through nginx → gateway
- **Local game**: Backend integration with real game logic
- **Route alignment**: Consistent with teammate API documentation

### ✅ HTTPS Architecture Fully Implemented
- **nginx**: SSL termination, reverse proxy, security headers
- **Gateway**: Route orchestration with service prefixes
- **Auth routes**: `/api/auth/*` → `/user-service/auth/*` mapping
- **WebSocket**: Secure `wss://` connections with automatic HTTP→HTTPS URL conversion
- **Health monitoring**: Complete service health check system
- **CORS**: Properly configured for HTTPS frontend

### 🚧 Remaining Tasks
1. **Tournament Service**: Complete tournament management endpoints
2. **Log Service**: Expand beyond health checks
3. **API Documentation**: Add missing endpoint details
4. **Production Deployment**: Environment-specific configurations

---

## Common Error Response Format

All services return errors in this format:

```json
{
  "message": "string (human-readable error message)",
  "error": "string (optional technical details)"
}
```

---

## Data Models

### User
```typescript
{
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

### JWT Token Payload
```typescript
{
  userId: string;
  username: string;
  iat: number; // issued at
  exp: number; // expiration
}
```

---

## Configuration

### 🔧 Key Environment Variables
| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `JWT_SECRET` | User Service | `your-secret-key-change-this` | **🔒 CHANGE IN PRODUCTION** |
| `DATABASE_URL` | All Services | `sqlite:/app/shared/database/transcendence.db` | Shared database path |
| `NODE_ENV` | All Services | `development` | Environment mode |

---

## 🚀 Production Deployment TODO

### SSL Certificate Management for Production

When deploying to production with a real domain, follow these steps:

#### 1. Domain Setup
- [ ] **Purchase/Configure Domain**: Get a domain name (e.g., `transcendence.yourdomain.com`)
- [ ] **DNS Configuration**: Point A/AAAA records to your server IP
- [ ] **Update Environment Variables**: Change all `localhost` references to your domain

#### 2. SSL Certificate Options

**Option A: Let's Encrypt (Recommended - Free)**
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate for your domain
sudo certbot --nginx -d transcendence.yourdomain.com

# Certificates auto-renew, but test renewal:
sudo certbot renew --dry-run
```

**Option B: Commercial SSL Certificate**
- Purchase from Certificate Authority (CA)
- Download certificate files
- Install according to CA instructions

#### 3. nginx Configuration Updates
```bash
# Update nginx/nginx.conf
server_name transcendence.yourdomain.com; # Change from localhost

# SSL certificate paths (Let's Encrypt example)
ssl_certificate /etc/letsencrypt/live/transcendence.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/transcendence.yourdomain.com/privkey.pem;
```

#### 4. Environment Variables Update
Update `.env` file:
```bash
# Frontend URLs
VITE_API_BASE=https://transcendence.yourdomain.com/api
VITE_GATEWAY_BASE=https://transcendence.yourdomain.com/api
VITE_WS_BASE=wss://transcendence.yourdomain.com/ws
FRONT_END_URL=https://transcendence.yourdomain.com

# Update JWT secret for production
JWT_SECRET=your-very-secure-production-secret-key
```

#### 5. Security Enhancements
- [ ] **Strong JWT Secret**: Generate cryptographically secure JWT secret
- [ ] **CORS Configuration**: Restrict CORS origins to your domain only
- [ ] **Firewall Rules**: Configure UFW/iptables to allow only necessary ports
- [ ] **Security Headers**: Review and enhance nginx security headers
- [ ] **Certificate Monitoring**: Set up alerts for certificate expiration

#### 6. Production Checklist
- [ ] **SSL Certificate**: Real certificate installed and working
- [ ] **Domain Resolution**: Domain points to correct server
- [ ] **HTTPS Redirect**: All HTTP traffic redirects to HTTPS
- [ ] **WebSocket SSL**: WSS connections working properly
- [ ] **API Endpoints**: All endpoints accessible via HTTPS
- [ ] **Database Security**: SQLite replaced with PostgreSQL/MySQL for production
- [ ] **Logging**: Centralized logging configured
- [ ] **Monitoring**: Health checks and uptime monitoring
- [ ] **Backup Strategy**: Database and configuration backups
- [ ] **Load Testing**: Performance testing under production load

### Development vs Production Summary

| Aspect | Development (Current) | Production (TODO) |
|--------|----------------------|-------------------|
| **Domain** | `localhost` | `transcendence.yourdomain.com` |
| **SSL Certificate** | Self-signed | Let's Encrypt / Commercial CA |
| **Database** | SQLite | PostgreSQL / MySQL |
| **JWT Secret** | `your-secret-key-change-this` | Cryptographically secure key |
| **CORS** | `*` (all origins) | Specific domain only |
| **Logs** | Console output | Centralized logging system |
| **Monitoring** | Manual health checks | Automated monitoring/alerts |

### Quick Production Deploy Script (Future)
```bash
#!/bin/bash
# production-deploy.sh (TODO: Create this script)

# 1. Update environment variables
# 2. Generate/install SSL certificates
# 3. Update nginx configuration
# 4. Deploy with production settings
# 5. Run health checks
# 6. Set up monitoring

echo "🚀 Production deployment script - TODO"
```

### 🌐 Service URLs (Production HTTPS)
- **Frontend**: `https://localhost` (nginx SPA + SSL)
- **API**: `https://localhost/api` (nginx → gateway proxy)
- **WebSocket**: `wss://localhost/ws` (nginx → gateway WebSocket proxy)

### 🐳 Internal Docker Network
- Gateway: `http://gateway:3000`
- User Service: `http://user-service:3001` 
- Game Service: `http://game-service:3002`
- Log Service: `http://log-service:3003`
- Tournament Service: `http://tournament-service:3005`

---

## Service Architecture

### ✅ Current Architecture (HTTPS Production Ready)
```
Browser (HTTPS) → nginx (SSL + Reverse Proxy) → Gateway (Route Orchestration) → Microservices (HTTP Internal)

Frontend (https://localhost) 
    ↓
nginx (443) - SSL termination, security headers
    ├── /api/auth/* → Gateway /user-service/auth/* → User Service (3001)
    ├── /api/pong/* → Gateway /pong/* → Game Service (3002) 
    ├── /api/health → Gateway /health → Gateway Health
    ├── /api/user-service/health → Gateway /user-service/health → User Service
    ├── /api/game-service/health → Gateway /game-service/health → Game Service
    ├── /ws/* → Gateway WebSocket Proxy → Game Service WebSocket
    └── /* → Frontend SPA (3004)
```

### 🔐 Security Implementation
```
SSL/TLS: nginx handles certificate, TLSv1.2+, secure ciphers
Headers: HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
Auth Flow: JWT tokens, session cookies, CORS for HTTPS
WebSocket: WSS (secure WebSocket) with automatic URL conversion
```

---

## Notes & Current Limitations

### ✅ What Works
- All timestamps are in ISO 8601 format
- CORS is enabled on all services for development
- Direct service access works perfectly
- WebSocket real-time communication is stable
- Complete game lifecycle management (create, join, play, complete)

### ⚠️ Current Limitations  
- **Gateway is minimal**: Only basic health check implemented
- **No service proxying**: All services must be accessed directly
- **No centralized authentication**: Each service handles auth independently
- **WebSocket connections bypass gateway**: Direct connection to game service required
- **Mixed languages**: API responses mix German and English

### 🔧 Development Notes
- User service JWT secret: `your-secret-key-change-this` (change in production)
- Game service supports both demo and registered user games
- WebSocket connections handle multiple game types (demo, single, tournament)
- Health check endpoints are service-specific (no standardized format yet)

### 🎯 Production Checklist
- [ ] Implement gateway service proxying
- [ ] Standardize response languages (English)
- [ ] Update JWT secrets and restrict CORS origins
- [ ] Implement centralized authentication middleware
- [ ] Add request/response logging and monitoring
- [ ] Implement service discovery and load balancing