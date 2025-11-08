```pgsql
                    ┌───────────────────────┐
                    │  Incoming Request     │
                    │  (any route)          │
                    └─────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Check for JWT in header │
                 └─────────┬──────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
   JWT exists                               JWT missing
        │                                     │
        ▼                                     ▼
 ┌───────────────┐                   ┌─────────────────────┐
 │ Decode JWT    │                   │ Check for sessionId │
 │ (verify)      │                   │ cookie              │
 └──────┬────────┘                   └─────────┬──────────┘
        │                                      │
        ▼                                      ▼
  Lookup user in DB                       sessionId exists?
        │                                      │
        │                              ┌───────┴───────┐
        │                              │               │
   User found?                     Yes → Lookup in DB  No → Create temp guest session
        │                              │               │
  ┌─────┴─────┐                        ▼               │
  │           │                   Guest exists?        │
Yes → Proceed  No → 401 Unauthorized    │               │
        │                            ┌──┴──┐           │
        │                        Yes → Use existing    │
        ▼                            │ guest record    │
    Proceed                        No → Create guest   │
                                   │ record in DB     │
                                   ▼                  │
                              Issue JWT for guest     │
                                   │                  │
                                   ▼                  │
                                Proceed               │
                                                    Return temp sessionId
```

** Service Responsibilities

| Step                                         | Service              | Responsibility                                              |
| -------------------------------------------- | -------------------- | ----------------------------------------------------------- |
| Check for JWT header                         | **API Gateway**      | Intercepts request, decides whether to forward or reject.   |
| Decode & verify JWT                          | **Auth Service**     | Stateless verification of JWT signature & payload.          |
| Lookup user by ID / UUID                     | **Database Service** | Query DB for registered or persisted guest users.           |
| Check sessionId cookie                       | **API Gateway**      | Reads lightweight session cookies before DB persistence.    |
| Create guest in DB                           | **Database Service** | Insert new guest user record with UUID and hashed password. |
| Generate JWT for guest                       | **Auth Service**     | Returns JWT for downstream requests (registered or guest).  |
| Forward request to service (game/tournament) | **API Gateway**      | After authentication, routes request to microservice.       |

✅ Notes

API Gateway:

Lightweight, fast decisions: JWT presence, session cookie, basic routing.

Can reject invalid tokens before hitting microservices.s

Auth Service:

Handles JWT signing and verification.

Does not need DB unless validating against revoked tokens or persistent guest checks (optional).

Database Service:

Only stores persistent user/guest data.

API Gateway / Auth Service call DB to resolve user existence.

```pgsql
                    ┌───────────────────────┐
                    │  Incoming Request     │
                    │  (any route)          │
                    └─────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Check for JWT in header │
                 │ (API Gateway)           │
                 └─────────┬──────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
   JWT exists                               JWT missing
        │                                     │
        ▼                                     ▼
 ┌───────────────┐                   ┌─────────────────────┐
 │ Decode JWT    │                   │ Check for sessionId │
 │ (Auth Service)│                   │ cookie              │
 └──────┬────────┘                   │ (API Gateway)       │
        │                              └─────────┬──────────┘
        ▼                                        │
  Lookup user in DB                       sessionId exists?
  (Database Service)                              │
        │                                ┌───────┴───────┐
        │                                │               │
   User found?                       Yes → Lookup in DB  No → Create temp guest session
        │                                │ (DB Service)  │
  ┌─────┴─────┐                          ▼               │
  │           │                     Guest exists?        │
Yes → Proceed  No → 401 Unauthorized    │               │
        │                              ┌──┴──┐           │
        │                          Yes → Use existing    │
        ▼                              │ guest record    │
    Proceed                            No → Create guest   │
                                      │ record in DB     │
                                      ▼                  │
                                 Issue JWT for guest     │
                                 (Auth Service)          │
                                      │                  │
                                      ▼                  │
                                   Proceed               │
                                                       Return temp sessionId

```

Low cost Guest user
```
Client                     API Gateway
  |                            |
  | GET /some-endpoint         |
  |--------------------------->|
  |                            | generate UUID (guest)
  |                            | set cookie X-Guest-Id/ x-user-id
  |                            | return response
  |<---------------------------|
  | store guest UUID in cookie  |

```

Expensive /pong/game Guest user

```
Client                     API Gateway                     Auth Service                     Game Service
  |                            |                                |                                |
  | GET /game                  |                                |                                |
  |--------------------------->|                                |                                |
  |                            | no JWT?                        |                                |
  |                            |------------------------------->|                                |
  |                            |                                | create placeholder user         |
  |                            |                                | generate JWT                    |
  |<---------------------------| receives JWT + user info       |                                |
  |                            |                                |                                |
  |                            | forward request to Game Service with user info + payload    |
  |                            |-------------------------------------------------------------->|
  |                            |                                | process request using user info|
  |                            |                                | execute expensive logic        |
  |                            |<--------------------------------------------------------------|
  |<---------------------------| return processed data + JWT (if issued)                      |

```

1. Guest users (first-time visitors, no login)

They do not have a JWT yet, only a sessionId cookie or UUID issued by the gateway.

They can still make requests to routes that don’t require authentication (like browsing metadata or public resources).

Once they reach an "expensive" or sensitive route, the gateway can either:

Require them to upgrade to a registered user (issue JWT via auth service), or

Allow limited guest access tied to their sessionId.

2. Registered users (JWT issued by Auth Service)

Every request that requires access to protected or expensive routes should carry a valid JWT.

JWT allows the gateway to validate the user without querying a database every time.

JWT can be passed via cookie (httpOnly) or Authorization header (Bearer <token>).

3. API Gateway strategy

Public routes: do not require JWT, maybe only a guest sessionId.

Expensive or sensitive routes: always require JWT or validated guest session.

JWT verification at the gateway ensures downstream services (game-service, auth-service) can trust the request.

4. Why not all requests need JWT

Requiring JWT for every request increases friction for new users or lightweight operations.

For APIs with mixed public and private endpoints, it’s common to check JWT only where needed.

The gateway can automatically upgrade guest users to JWT when they first log in or register.

✅ Rule of thumb:

Use JWT for all sensitive/expensive routes.

Allow guest sessions for public or lightweight routes.

```csharp
[Client / Browser] 
       |
       | 1) Guest visit → no JWT yet
       |    (sessionId cookie set by API Gateway)
       v
[API Gateway]
       |
       | 2) Checks cookies:
       |    - jwt cookie → missing
       |    - sessionId cookie → present
       | Sets request.user = { id: <uuid>, role: 'guest', jwt: null }
       v
[Expensive Route at API Gateway]
       |
       | 3) Detects user.jwt === null → calls Auth Service
       v
[Auth Service]
       |
       | 4) Registers guest in database (optional username placeholder)
       | 5) Issues JWT:
       |    payload = {
       |       id: <dbUserId>,
       |       username: <generatedName>,
       |       role: 'registered'
       |    }
       |    signs with secret or private key
       | 6) Returns JWT to API Gateway
       v
[API Gateway]
       |
       | 7) Stores JWT in request.user.jwt
       | 8) Optionally sets JWT cookie in client
       | 9) Calls Game Service with verified user info:
       |    Headers:
       |      X-User-Id: <dbUserId>
       |      X-User-Role: registered
       |      Authorization: Bearer <JWT> (optional)
       v
[Game Service]
       |
       | 10) Reads headers / JWT
       | 11) Trusts request.user info because API Gateway already verified JWT
       | 12) Executes expensive operation and returns data
       v
[API Gateway → Client]
       |
       | 13) Returns result + updated JWT (if needed)
```
