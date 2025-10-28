
# API Contracts

## Overview
All services are accessed through the API Gateway at `http://localhost:3000` (development).

Base URL: `http://localhost:3000`

## Authentication
Protected endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
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

### ❌ GET /user-service/health (NOT IMPLEMENTED)
Check user service health through the gateway.

**Status:** Gateway proxy not implemented yet. Access directly at `http://localhost:3001/health`

---

### ❌ GET /game-service/health (NOT IMPLEMENTED)
Check game service health through the gateway.

**Status:** Gateway proxy not implemented yet. Access directly at `http://localhost:3002/health`

---

### ❌ GET /log-service/health (NOT IMPLEMENTED)
Check log service health through the gateway.

**Status:** Gateway proxy not implemented yet. Access directly at `http://localhost:3003/health`

---

## WebSocket Routes

### ❌ WS /ws/pong (NOT IMPLEMENTED)
WebSocket proxy to game service for Pong game.

**Status:** Gateway WebSocket proxy not implemented yet. Connect directly to game service at `ws://localhost:3002/ws/pong/game-ws/{gameId}`

**Current Implementation:** Direct connection to game service required

---

## User Service (Direct Access Only)

**⚠️ Status:** These endpoints are NOT proxied through the gateway yet. Access directly at `http://localhost:3001/auth/*`

### POST /auth/register (Direct: http://localhost:3001/auth/register)
Create a new user account.

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

**Note:** Response messages are currently in German.

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `409 Conflict` - Username or email already exists
- `500 Internal Server Error` - Server error

---

### POST /auth/login (Direct: http://localhost:3001/auth/login)
Authenticate a user and receive a JWT token.

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

### GET /auth/profile (Direct: http://localhost:3001/auth/profile)
Get the current user's profile. **Requires authentication.**

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

## Game Service (Direct Access: http://localhost:3002)

### GET /health
Game service health check.

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

### POST /pong/game
Create a single game for registered users (3 rounds, score limit 5).

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
  "websocketUrl": "ws://localhost:3002/ws/pong/game-ws/1",
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
  "websocketUrl": "ws://localhost:3002/ws/pong/game-ws/1"
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
  "websocketUrl": "ws://localhost:3002/ws/pong/game-ws/2"
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

**Connection URL:** `ws://localhost:3002/ws/pong/game-ws/{gameId}`

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

**Connection URL:** `ws://localhost:3002/ws/pong/demo-ws/{gameId}`

**Note:** This redirects to the main WebSocket handler, so message format is identical.

---

## Tournament Service

TODO: Define tournament service endpoints

---

## Implementation Status

### ✅ Currently Implemented
- Gateway health check (`/health`)
- User service endpoints (direct access at `http://localhost:3001/auth/*`)
- Game service HTTP endpoints for single games, demos, and stats
- Game service WebSocket communication (`/ws/pong/game-ws/:gameId`)
- Complete WebSocket message protocol for real-time gameplay

### ❌ NOT Implemented
- Gateway proxy for service health checks (`/user-service/health`, `/game-service/health`, `/log-service/health`)
- Gateway WebSocket proxy (`/ws/pong`)
- Gateway proxy for `/auth/*` routes
- Tournament service endpoints
- Log service endpoints (beyond health check)

### 🚧 Needs Implementation (HIGH PRIORITY)
1. **Gateway Service Proxying**: Implement proxy routes for all services
2. **Gateway WebSocket Proxy**: Proxy WebSocket connections to game service
3. **Tournament Service**: Complete tournament management endpoints
4. **API Gateway Request Routing**: Central routing and authentication middleware
5. **Service Discovery**: Dynamic service registration and health monitoring

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

### 🌐 Service URLs (Development)
- Gateway: `http://localhost:3000`
- User Service: `http://localhost:3001` 
- Game Service: `http://localhost:3002`
- Log Service: `http://localhost:3003`
- Tournament Service: `http://localhost:3005`

---

## Service Architecture

### Current Implementation (Direct Access)
```
Frontend (3004) 
    ↓
Gateway (3000) - Basic health only
    
Direct Service Access:
├── User Service (3001) - /auth/* 
├── Game Service (3002) - /ws/pong/*, /stats, demos
├── Log Service (3003) - /health only
└── Tournament Service (3005) - Not documented yet
```

### Target Architecture (To Be Implemented)
```
Frontend (3004) 
    ↓
Gateway (3000) - Full proxy & routing
    ├── /auth/* → User Service (3001)
    ├── /game/* → Game Service (3002) 
    ├── /ws/pong → Game Service WebSocket
    ├── /logs/* → Log Service (3003)
    └── /tournaments/* → Tournament Service (3005)
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