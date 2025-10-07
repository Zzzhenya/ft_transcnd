# Migration Notes: User Service to Microservices Architecture

## Team Structure

- **You (User Service)**: Migrated and implemented user authentication service
- **Gateway Person**: Responsible for API Gateway implementation
- **Me**: Performed the migration from legacy to microservices structure

## What Was Done

I migrated the user authentication service from the `legacy` folder into the new microservices architecture in the `transcendence` folder.

## Current Status

### ✅ User Service - COMPLETED
- Migrated user authentication logic from legacy to `transcendence/services/user-service/`
- Converted from Express to Fastify (Backend Framework module requirement)
- All authentication features working: registration, login, JWT tokens, profile endpoints
- Docker container configured and working
- SQLite database integration via shared volume
- User model with all CRUD operations
- authService with bcrypt password hashing and JWT generation

**User Service can be tested independently:**
```bash
# Direct service test (bypasses gateway - temporary)
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'
```

### ⚠️ Gateway Service - NEEDS IMPLEMENTATION (Gateway Person's Responsibility)

**Current State:**
- Skeleton structure exists in `transcendence/services/gateway/`
- Has Dockerfile and package.json but NO implementation
- Listed in docker-compose.yml but doesn't route anything

**What Gateway Person Needs To Do:**

The gateway must route incoming requests to the appropriate microservices:

1. **Route `/auth/*` to user-service (port 3001)**
   - POST /auth/register
   - POST /auth/login
   - GET /auth/profile (requires JWT)

2. **Future routes when other services are ready:**
   - `/game/*` to game-service (port 3002)
   - `/logs/*` to log-service (port 3003)

3. **Technical requirements:**
   - Use Fastify (matching other services)
   - Handle service-to-service communication
   - Forward headers (especially Authorization)
   - Implement basic error handling
   - Health check endpoint at `/health`

**Environment variables already configured for Gateway:**
```yaml
USER_SERVICE_URL=http://user-service:3001
GAME_SERVICE_URL=http://game-service:3002
LOG_SERVICE_URL=http://log-service:3003
```

### Issues In User Service (For User Service Person)

1. **Error messages in German** - Need to be changed to English:
   - "Kein Token bereitgestellt" → "No token provided"
   - "Benutzer nicht gefunden" → "User not found"
   - "Token ungültig oder abgelaufen" → "Invalid or expired token"
   - etc. (search codebase for German strings)

2. **Database import path is fragile:**
   ```javascript
   // Current (brittle):
   const { dbRun, dbGet, dbAll } = require('../../../../shared/config/database');
   
   // Better: Use absolute path via environment variable
   ```

3. **Consider adding:**
   - Request validation middleware
   - Rate limiting on auth endpoints
   - Better error logging

## File Structure

```
transcendence/
├── services/
│   ├── gateway/               # Gateway Person: IMPLEMENT THIS
│   │   ├── src/
│   │   │   └── index.js      # MISSING - CREATE THIS
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── user-service/          # User Service Person: DONE, minor fixes needed
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── services/authService.js
│   │   │   └── models/User.js
│   │   ├── Dockerfile
│   │   └── package.json
│   └── [other services...]
├── shared/
│   └── config/
│       └── database.js        # Shared SQLite config
└── docker-compose.yml
```

## Integration Points

**For Gateway Person:**
- User service listens on port 3001
- Expects requests at `/auth/register`, `/auth/login`, `/auth/profile`
- Returns JWT token in `access_token` field on successful login
- Profile endpoint requires `Authorization: Bearer <token>` header

**For User Service Person:**
- Once gateway is implemented, update frontend to call gateway (port 3000) not user-service directly
- May need to add CORS configuration if not already present

## Testing Current Setup

```bash
cd transcendence
docker-compose up

# User service works directly:
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'

# Gateway routing (once implemented by Gateway Person):
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'
```

## Module Requirements

**This migration supports these modules:**
- Backend Framework (Fastify + Node.js) - 10 pts
- Database (SQLite) - 5 pts  
- Microservices Architecture - 10 pts (INCOMPLETE without gateway)

**The Microservices module will NOT count until the gateway properly routes requests between services.**

---

**Summary:**
- User Service Person: Clean up error messages, fix minor technical debt
- Gateway Person: Implement the gateway service (critical blocker for microservices module)
- Both services can be developed/tested independently, then integrated