# Remote Player Implementation Guide

## Overview

This document explains how the remote player feature works in ft_transcendence and the architectural changes made to support cross-computer gameplay over HTTPS with WebSockets.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Components](#key-components)
3. [Changes Made](#changes-made)
4. [How It Works](#how-it-works)
5. [Network Flow](#network-flow)
6. [Configuration](#configuration)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The remote player feature allows two players on different computers to play Pong together in real-time over the network. The architecture follows a client-server model with WebSocket communication for real-time gameplay.

```
┌─────────────────┐                    ┌─────────────────┐
│   Computer A    │                    │   Computer B    │
│   (Player 1)    │                    │   (Player 2)    ��
│                 │                    │                 │
│  Firefox        │                    │  Firefox        │
│  Browser        │                    │  Browser        │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │ https://192.168.0.155:8443          │
         │ wss://192.168.0.155:8443/ws/remote  │
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Nginx (Port 443)│
              │  SSL Termination │
              │  Reverse Proxy   │
              └────────┬─────────┘
                       │
                       ├─── Serve SPA (index.html, JS, CSS)
                       ├─── Proxy /api/* → gateway:3000
                       └─── Proxy /ws/* → gateway:3000 (WebSocket)
                       │
                       ▼
              ┌──────────────��──┐
              │  Gateway Service │
              │  (Port 3000)     │
              └────────┬─────────┘
                       │
                       ├─── Route REST API calls
                       ├─── Handle WebSocket connections
                       └─── Coordinate game state
                       │
                       ▼
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
┌─────────────────┐          ┌─────────────────┐
│  Game Service   │          │  User Service   │
│  (Port 3002)    │          │  (Port 3001)    │
│                 │          │                 │
│ - Game logic    │          │ - Auth          │
│ - Room mgmt     │          │ - User data     │
│ - State sync    │          │ - Notifications │
└─────────────────┘          └─────────────────┘
```

---

## Key Components

### 1. Frontend (Browser)

**Location**: `transcendence/frontend/src/pages/remote-room.ts`

**Responsibilities**:
- Create and join game rooms
- Establish WebSocket connection to server
- Send player input (paddle movements)
- Receive and render game state updates
- Handle connection errors and reconnection

**Key Features**:
- Same-origin WebSocket URLs (derived from `window.location`)
- Automatic protocol detection (wss:// for https://, ws:// for http://)
- Connection state management
- Player ready state synchronization

### 2. Nginx Reverse Proxy

**Location**: `transcendence/nginx/nginx.conf`

**Responsibilities**:
- SSL/TLS termination (HTTPS)
- Serve static frontend files (SPA)
- Proxy API requests to gateway
- Proxy WebSocket connections to gateway
- Handle CORS and security headers

**Key Configuration**:
```nginx
# Serve SPA
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}

# Proxy WebSocket for remote games
location /ws/ {
    proxy_pass http://gateway:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    # ... other headers
}

# Proxy API requests
location /api/ {
    rewrite ^/api/(.*) /$1 break;
    proxy_pass http://gateway:3000;
    # ... headers
}
```

### 3. Gateway Service

**Location**: `transcendence/services/gateway/`

**Responsibilities**:
- Route HTTP requests to appropriate microservices
- Handle WebSocket connections
- Maintain active game rooms
- Broadcast game state to connected players
- Handle player disconnections

### 4. Game Service

**Location**: `transcendence/services/game-service/`

**Responsibilities**:
- Game logic and physics
- Room creation and management
- Player matchmaking
- Score tracking
- Game state persistence

---

## Changes Made

### 1. Nginx Configuration Changes

**File**: `transcendence/nginx/nginx.conf`

**Before**:
```nginx
location / {
    proxy_pass http://frontend:3004;  # Proxied to frontend container
}
```

**After**:
```nginx
location / {
    root /usr/share/nginx/html;       # Serve static files directly
    try_files $uri $uri/ /index.html; # SPA routing support
}
```

**Why**: 
- Simpler deployment (no separate frontend container needed for production)
- Better performance (nginx serves static files directly)
- Proper SPA routing (all routes fall back to index.html)

### 2. Frontend WebSocket Configuration

**File**: `transcendence/frontend/src/app/config.ts`

**Before**:
```typescript
export const WS_BASE = (() => {
  const env = required("VITE_WS_BASE");
  // Complex logic to parse env variable
  try {
    const u = new URL(env, window.location.origin);
    // ... lots of URL manipulation
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch (_e) {
    // ... fallback logic
  }
})();
```

**After**:
```typescript
export const WS_BASE = (() => {
  // Derive protocol from current page: https -> wss, http -> ws
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // Always use /ws path for WebSocket connections through nginx
  return `${wsProtocol}//${host}/ws`;
})();
```

**Why**:
- **Same-origin URLs**: Works on any computer accessing the server
- **No hardcoded hosts**: No localhost or gateway:3000 in browser code
- **Automatic protocol**: Uses wss:// for HTTPS pages, ws:// for HTTP
- **Cross-computer compatible**: Works from host computer and remote computers

### 3. Notification WebSocket

**File**: `transcendence/frontend/src/ui/notification-websocket.ts`

**Before**:
```typescript
const isHTTPS = GATEWAY_BASE.includes('https');
const wsProtocol = isHTTPS ? 'wss' : 'ws';
let baseUrl = GATEWAY_BASE;
if (baseUrl.includes('/api')) {
  baseUrl = baseUrl.replace('/api', '');
}
const wsUrl = `${baseUrl.replace(/^https?/, wsProtocol)}/api/user-service/ws/notifications?token=${token}`;
```

**After**:
```typescript
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;

// Use same-origin URL through nginx proxy
const wsUrl = `${wsProtocol}//${host}/api/user-service/ws/notifications?token=${token}`;
```

**Why**:
- Same-origin approach for consistency
- Works across different computers
- Simpler and more maintainable

### 4. Environment Configuration

**File**: `transcendence/.env`

**Before**:
```bash
VITE_API_BASE=https://localhost:8443/api
VITE_GATEWAY_BASE=https://localhost:8443/api
VITE_WS_BASE=wss://localhost:8443/ws
```

**After**:
```bash
VITE_API_BASE=/api
VITE_GATEWAY_BASE=/api
VITE_WS_BASE=/ws
```

**Why**:
- **Relative paths**: Browser resolves to current origin
- **Works everywhere**: Host computer, remote computers, production
- **No IP hardcoding**: Adapts to any network configuration

### 5. Vite Configuration

**File**: `transcendence/frontend/vite.config.ts`

**Added**:
```typescript
import { defineConfig, loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  
  return {
    envDir: path.resolve(__dirname, '..'), // Look for .env in parent directory
    // ... rest of config
  };
});
```

**Why**:
- Single `.env` file in root directory
- No duplicate environment files
- Easier maintenance

### 6. Docker Compose

**File**: `transcendence/docker-compose.yml`

**Added to nginx service**:
```yaml
volumes:
  - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
  - ./nginx/ssl:/etc/nginx/ssl:ro
  - ./frontend/dist:/usr/share/nginx/html:ro  # ← Added this
```

**Why**:
- Nginx serves built frontend directly
- No need for separate frontend container in production
- Simpler deployment

---

## How It Works

### 1. Room Creation Flow

```
Player A (Computer A)
  │
  ├─ 1. Navigate to /remote
  │
  ├─ 2. Click "Create Room"
  │
  ├─ 3. POST /api/game/rooms
  │      └─> Gateway → Game Service
  │          └─> Creates room, returns roomId: "ABC123"
  │
  ├─ 4. Navigate to /remote/room/ABC123
  │
  ├─ 5. Open WebSocket: wss://192.168.0.155:8443/ws/remote?roomId=ABC123&playerId=...
  │      └─> Nginx → Gateway
  │          └─> Gateway stores connection
  │
  ├─ 6. Receive 'init' message
  │      { type: 'init', playerNumber: 1, roomInfo: {...} }
  │
  └─ 7. Wait for Player 2...
```

### 2. Room Joining Flow

```
Player B (Computer B)
  │
  ├─ 1. Navigate to /remote
  │
  ├─ 2. Click "Join Room"
  │
  ├─ 3. Enter room code: "ABC123"
  │
  ├─ 4. Navigate to /remote/room/ABC123
  │
  ├─ 5. Open WebSocket: wss://192.168.0.155:8443/ws/remote?roomId=ABC123&playerId=...
  │      └─> Nginx → Gateway
  │          └─> Gateway stores connection
  │
  ├─ 6. Receive 'init' message
  │      { type: 'init', playerNumber: 2, roomInfo: {...} }
  │
  └─ 7. Both players see each other in the room
```

### 3. Game Start Flow

```
Both Players
  │
  ├─ 1. Click "Ready" button
  │      └─> Send: { type: 'ready' }
  │
  ├─ 2. Gateway checks if both players ready
  │
  ├─ 3. Receive countdown
  │      { type: 'countdown', count: 3 }
  │      { type: 'countdown', count: 2 }
  │      { type: 'countdown', count: 1 }
  │      { type: 'countdown', count: 0 }
  │
  ├─ 4. Receive game start
  │      { type: 'gameStart', gameState: {...} }
  │
  └─ 5. Game loop begins
```

### 4. Game Loop

```
Player Input → WebSocket → Gateway → Game Service → Game State Update
                                                            │
                                                            ▼
                                    Broadcast to all players in room
                                                            │
                                                            ▼
                                    Players render updated state
```

**Detailed Flow**:

```
Player A presses 'W' (move up)
  │
  ├─ 1. Frontend detects keydown
  │
  ├─ 2. Send: { type: 'paddleMove', direction: 'up' }
  │      └─> wss://192.168.0.155:8443/ws/remote?roomId=ABC123
  │
  ├─ 3. Gateway receives message
  │      └─> Forwards to Game Service
  │
  ├─ 4. Game Service updates paddle position
  │      └─> Calculates new game state
  │
  ├─ 5. Game Service sends state to Gateway
  │
  ├─ 6. Gateway broadcasts to all players:
  │      { type: 'gameState', state: {
  │          ball: { x: 10, y: 20 },
  │          paddles: { player1: 150, player2: 200 },
  │          score: { player1: 0, player2: 0 }
  │      }}
  │
  └─ 7. Both players render the new state
         └─> Babylon.js updates 3D scene
```

---

## Network Flow

### HTTP Request Flow

```
Browser                 Nginx                   Gateway                Service
   │                      │                        │                      │
   │  GET /api/users/me   │                        │                      │
   ├─────────────────────>│                        │                      │
   │                      ���  GET /users/me         │                      │
   │                      ├───────────────────────>│                      │
   │                      ��                        │  GET /users/me       │
   │                      │                        ├─────────────────────>│
   │                      │                        │                      │
   │                      │                        │  { user: {...} }     │
   │                      │                        │<─────────────────────┤
   │                      │  { user: {...} }       │                      │
   │                      │<───────────────────────┤                      │
   │  { user: {...} }     │                        │                      │
   │<─────────────────────┤                        │                      │
   │                      │                        │                      │
```

### WebSocket Connection Flow

```
Browser                 Nginx                   Gateway
   │                      │                        │
   │  GET /ws/remote      │                        │
   │  Upgrade: websocket  │                        │
   ├─────────────────────>│                        ��
   │                      │  GET /ws/remote        │
   │                      │  Upgrade: websocket    │
   │                      ├───────────────────────>│
   │                      │                        │
   │                      │  101 Switching         │
   │                      │<───────────────────────┤
   │  101 Switching       │                        │
   │<─────────────────────┤                        │
   │                      │                        │
   │ ════════════════════════════════════════════> │
   │           WebSocket Connection                │
   │ <════════════════════════════════════════════ │
   │                      │                        │
```

### Cross-Computer Communication

```
Computer A (192.168.0.100)          Server (192.168.0.155)          Computer B (192.168.0.101)
      │                                      │                                │
      │  wss://192.168.0.155:8443/ws/remote │                                │
      ├─────────────────────────────────────>│                                │
      │                                      │  wss://192.168.0.155:8443/ws/remote
      │                                      │<───────────────────────────────┤
      │                                      │                                │
      │  { type: 'paddleMove', dir: 'up' }  │                                │
      ├─────────────────────────────────────>│                                │
      │                                      │                                │
      │                                      │  { type: 'gameState', ... }    │
      │<─────────────────────────────────────┤                                │
      │                                      ├───────────────────────────────>│
      │                                      │                                │
```

---

## Configuration

### Environment Variables

**Location**: `transcendence/.env`

```bash
# ================================
# Frontend Variables (Browser-Side)
# ================================
# These are baked into the frontend build at compile time
# Use relative paths for cross-computer compatibility

VITE_API_BASE=/api           # API endpoint
VITE_GATEWAY_BASE=/api       # Gateway endpoint
VITE_WS_BASE=/ws             # WebSocket endpoint (ignored, derived at runtime)

# ================================
# Backend Variables (Docker Network)
# ================================
# These are used for service-to-service communication

USER_SERVICE_URL=http://user-service:3001
GAME_SERVICE_URL=http://game-service:3002
GATEWAY_URL=http://gateway:3000

# ================================
# Security
# ================================
JWT_SECRET=your-secret-key-change-in-production

# ================================
# Ports
# ================================
GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
GAME_SERVICE_PORT=3002
```

### Nginx Configuration

**Location**: `transcendence/nginx/nginx.conf`

**Key Settings**:

```nginx
# HTTPS Server
server {
    listen 443 ssl http2;
    server_name localhost;

    # SSL Certificates
    ssl_certificate /etc/nginx/ssl/certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;

    # Serve SPA
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # WebSocket for remote games
    location /ws/ {
        proxy_pass http://gateway:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;  # 24 hours
        proxy_send_timeout 86400s;
    }

    # API proxy
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://gateway:3000;
    }
}
```

### Docker Compose

**Location**: `transcendence/docker-compose.yml`

**Nginx Service**:
```yaml
nginx:
  image: nginx:alpine
  ports:
    - "8000:80"
    - "8443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
    - ./frontend/dist:/usr/share/nginx/html:ro
```

---

## Testing Guide

### Prerequisites

1. Two computers on the same network
2. Firefox browser on both computers
3. Docker and Docker Compose installed on host
4. SSL certificates generated

### Step 1: Build and Deploy

```bash
# On the host computer (192.168.0.155)

# 1. Build frontend
cd transcendence/frontend
npm run build

# 2. Start Docker containers
cd ..
docker compose down
docker compose up -d

# 3. Verify containers are running
docker compose ps
# All services should show "Up"
```

### Step 2: Find Your IP Address

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Output: inet 192.168.0.155 ...
```

### Step 3: Test from Host Computer

1. Open Firefox
2. Navigate to: `https://192.168.0.155:8443`
3. Accept certificate warning (Advanced → Accept Risk)
4. Login or use guest mode
5. Go to "Remote" page
6. Click "Create Room"
7. Note the room code (e.g., "ABC123")

### Step 4: Test from Remote Computer

1. On another computer, open Firefox
2. Navigate to: `https://192.168.0.155:8443`
3. Accept certificate warning
4. Login or use guest mode (different username!)
5. Go to "Remote" page
6. Click "Join Room"
7. Enter the room code from Step 3
8. Click "Join"

### Step 5: Verify Connection

**On both computers, check DevTools (F12)**:

1. **Console Tab**: Should show:
   ```
   ✅ Connected to room!
   🔌 Connecting: wss://192.168.0.155:8443/ws/remote?roomId=ABC123...
   ✅ Connected
   ```

2. **Network Tab** (filter by WS):
   - Status: `101 Switching Protocols`
   - Protocol: `wss`
   - URL: `wss://192.168.0.155:8443/ws/remote?roomId=ABC123...`

### Step 6: Play the Game

1. Both players click "Ready"
2. Countdown appears: 3... 2... 1... GO!
3. Game starts
4. Player 1 uses W/S keys
5. Player 2 uses W/S keys
6. Verify both paddles move
7. Verify ball moves and bounces
8. Verify score updates

### Expected Behavior

✅ **Both players see each other in the waiting room**
✅ **Ready button enables when both players connected**
✅ **Countdown synchronizes on both screens**
✅ **Game starts simultaneously**
✅ **Paddle movements are smooth and responsive**
✅ **Ball physics are consistent**
✅ **Score updates in real-time**
✅ **No lag or disconnections**

---

## Troubleshooting

### Issue: "Connection refused" from remote computer

**Symptoms**:
- Host computer can access the site
- Remote computer gets "Connection refused"

**Possible Causes**:
1. Firewall blocking port 8443
2. Docker not binding to 0.0.0.0
3. Wrong IP address

**Solutions**:

```bash
# 1. Check firewall (macOS)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# 2. Temporarily disable for testing
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off

# 3. Verify Docker port binding
docker compose ps
# Should show: 0.0.0.0:8443->443/tcp

# 4. Verify IP address
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Issue: WebSocket connection fails

**Symptoms**:
- Console shows: `WebSocket connection failed`
- Network tab shows: `Failed to establish connection`

**Possible Causes**:
1. Not using HTTPS (using http:// instead of https://)
2. Mixed content (page is https but WS is ws://)
3. Nginx not proxying WebSocket correctly

**Solutions**:

```bash
# 1. Ensure accessing via HTTPS
# Use: https://192.168.0.155:8443
# NOT: http://192.168.0.155:8000

# 2. Check nginx logs
docker compose logs nginx -f

# 3. Check gateway logs
docker compose logs gateway -f

# 4. Verify WebSocket URL in browser console
# Should be: wss://192.168.0.155:8443/ws/remote...
# NOT: ws://... or localhost
```

### Issue: "Missing VITE_API_BASE" error

**Symptoms**:
- Browser console shows: `[config] Missing VITE_API_BASE`
- Page doesn't load

**Cause**:
Environment variables not baked into frontend build

**Solution**:

```bash
# 1. Verify .env file exists
cat transcendence/.env | grep VITE

# Should show:
# VITE_API_BASE=/api
# VITE_GATEWAY_BASE=/api
# VITE_WS_BASE=/ws

# 2. Rebuild frontend
cd transcendence/frontend
npm run build

# 3. Verify variables in build
cd dist/assets
grep -o 'VITE_API_BASE:"/api"' *.js

# 4. Restart nginx
cd ../..
docker compose restart nginx
```

### Issue: Players can't see each other

**Symptoms**:
- Both players connected
- Waiting room shows only one player

**Possible Causes**:
1. Using same playerId
2. Room code mismatch
3. Gateway not broadcasting correctly

**Solutions**:

```bash
# 1. Check gateway logs
docker compose logs gateway -f

# Look for:
# - "Player joined room"
# - "Broadcasting to X players"

# 2. Verify different playerIds in browser console
# Each player should have unique playerId

# 3. Verify room code matches
# Both players should see same room code in URL
```

### Issue: Game lags or stutters

**Symptoms**:
- Paddle movements are delayed
- Ball jumps or teleports
- Score updates slowly

**Possible Causes**:
1. High network latency
2. Slow computer
3. Too many browser tabs open

**Solutions**:

```bash
# 1. Check network latency
ping 192.168.0.155
# Should be < 50ms for good gameplay

# 2. Use wired connection instead of WiFi

# 3. Close unnecessary browser tabs

# 4. Check CPU usage
docker stats
# No container should use > 80% CPU
```

### Issue: Certificate warnings on every computer

**Symptoms**:
- Every computer shows certificate warning
- Must accept risk each time

**Cause**:
Using self-signed certificates (expected behavior)

**Solutions**:

**For Development/Testing**:
- Accept the warning once per browser
- This is normal for self-signed certificates

**For Production**:
```bash
# Use Let's Encrypt for real certificates
# Or distribute your CA certificate to all computers
```

---

## Subject Compliance

This implementation satisfies the ft_transcendence subject requirements:

### ✅ HTTPS for all aspects (Page 11)
- All traffic uses HTTPS (port 8443)
- Nginx handles SSL termination
- WebSockets use wss:// protocol

### ✅ Remote players module (Page 18)
- Two players on separate computers can play
- Real-time gameplay over network
- Network issues handled gracefully (reconnection, timeouts)

### ✅ Single-page application (Page 7)
- Browser back/forward buttons work
- No page reloads during navigation
- Nginx `try_files` ensures SPA routing

### ✅ Firefox compatibility (Page 7)
- Tested in latest Firefox
- Same-origin WebSockets work correctly
- No browser-specific errors

### ✅ Docker deployment (Page 7)
- Single command to start: `docker compose up -d`
- All services in containers
- Isolated network

---

## Additional Resources

### Related Documentation

- [DEPLOYMENT-STEPS.md](../DEPLOYMENT-STEPS.md) - Step-by-step deployment guide
- [ENV-CONFIGURATION-EXPLAINED.md](../ENV-CONFIGURATION-EXPLAINED.md) - Environment variables explained
- [FINAL-DEPLOYMENT-CHECKLIST.md](../FINAL-DEPLOYMENT-CHECKLIST.md) - Complete testing checklist
- [SINGLE-ENV-FILE-SOLUTION.md](../SINGLE-ENV-FILE-SOLUTION.md) - Single .env file setup

### Key Files

- `nginx/nginx.conf` - Nginx reverse proxy configuration
- `frontend/src/app/config.ts` - Frontend configuration
- `frontend/src/pages/remote-room.ts` - Remote game room implementation
- `services/gateway/` - Gateway service (WebSocket handling)
- `services/game-service/` - Game logic and room management

### Useful Commands

```bash
# View logs
docker compose logs -f gateway game-service

# Restart specific service
docker compose restart nginx

# Rebuild frontend
cd frontend && npm run build && cd ..

# Check container status
docker compose ps

# View WebSocket connections
docker compose exec gateway sh -c "netstat -an | grep 3000"
```

---

## Summary

The remote player feature enables cross-computer gameplay through:

1. **Same-origin WebSocket URLs** - Works on any computer accessing the server
2. **HTTPS everywhere** - Secure communication (subject requirement)
3. **Nginx reverse proxy** - Handles SSL, serves SPA, proxies WebSockets
4. **Real-time synchronization** - WebSocket-based game state updates
5. **Relative path configuration** - No hardcoded IPs or hostnames

This architecture is:
- ✅ **Scalable** - Can handle multiple concurrent games
- ✅ **Secure** - HTTPS and wss:// for all communication
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Cross-platform** - Works on any computer on the network
- ✅ **Subject-compliant** - Meets all ft_transcendence requirements

---

**Last Updated**: November 18, 2024
**Version**: 1.0
**Author**: ft_transcendence team
