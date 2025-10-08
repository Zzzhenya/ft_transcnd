
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

### GET /user-service/health
Check user service health through the gateway.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "user-service"
}
```

**Error Response (404):**
Service unavailable or unreachable.

---

### GET /game-service/health
Check game service health through the gateway.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "game-service"
}
```

**Error Response (404):**
Service unavailable or unreachable.

---

### GET /log-service/health
Check log service health through the gateway.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "log-service"
}
```

**Error Response (404):**
Service unavailable or unreachable.

---

## WebSocket Routes

### WS /ws/pong
WebSocket proxy to game service for Pong game.

**Connection URL:** `ws://localhost:3000/ws/pong`

**Behavior:**
- Client connects to gateway at `/ws/pong`
- Gateway proxies connection to game service at `ws://game-service:3002/ws/pong`
- All messages are bidirectionally forwarded between client and game service
- Connection closes when either side closes

**Message Format:** TODO - Define game service WebSocket message protocol

---

## User Service (via /auth)

**Note:** These endpoints need to be added to the gateway as proxy routes.

### POST /auth/register
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

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `409 Conflict` - Username or email already exists
- `500 Internal Server Error` - Server error

---

### POST /auth/login
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

### GET /auth/profile
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

## Game Service

### Direct WebSocket (not through gateway)
`ws://game-service:3002/ws/pong` (internal only)

TODO: Document game service HTTP endpoints if any exist.

---

## Tournament Service

TODO: Define tournament service endpoints

---

## Implementation Status

### ✅ Currently Implemented
- Gateway health check (`/health`)
- Service health checks (`/user-service/health`, `/game-service/health`, `/log-service/health`)
- WebSocket proxy for Pong game (`/ws/pong`)
- User service endpoints (direct access at `http://user-service:3001/auth/*`)

### 🚧 Needs Implementation
- Gateway proxy for `/auth/*` routes (currently user service is accessed directly)
- Game service HTTP endpoints documentation
- Tournament service endpoints
- WebSocket message protocol documentation

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

## Environment Variables

### Gateway
- `NODE_ENV` - Environment mode (development/production)
- `USER_SERVICE_URL` - User service URL (default: `http://user-service:3001`)
- `GAME_SERVICE_URL` - Game service URL (default: `http://game-service:3002`)
- `LOG_SERVICE_URL` - Log service URL (default: `http://log-service:3003`)

### User Service
- `PORT` - Service port (default: `3001`)
- `JWT_SECRET` - Secret key for JWT signing (default: `your-secret-key-change-in-production`)
- `DATABASE_URL` - SQLite database path (default: `sqlite:/app/shared/database/transcendence.db`)

### Frontend
- `NODE_ENV` - Environment mode (development/production)
- `REACT_APP_API_URL` - API Gateway URL (default: `http://localhost:3000`)

---

## Service Architecture

```
Frontend (3004) 
    ↓
Gateway (3000)
    ↓
    ├── User Service (3001) - /auth/*
    ├── Game Service (3002) - /ws/pong
    ├── Log Service (3003)
    └── Tournament Service (TBD)
```

---

## Notes

- All timestamps are in ISO 8601 format
- CORS is enabled on all services for development
- WebSocket connections are proxied through the gateway
- In production: update `JWT_SECRET` and restrict CORS origins
- Health check endpoints forward Authorization headers if provided