<div align="center">

```
  .'|.   .   _   .                                                                 '||                                  
.||.   .||.    .||.  ... ..   ....   .. ...    ....    ....    ....  .. ...      .. ||    ....  .. ...     ....    .... 
 ||     ||      ||    ||' '' '' .||   ||  ||  ||. '  .|   '' .|...||  ||  ||   .'  '||  .|...||  ||  ||  .|   '' .|...||
 ||     ||      ||    ||     .|' ||   ||  ||  . '|.. ||      ||       ||  ||   |.   ||  ||       ||  ||  ||      ||     
.||.    '|.'    '|.' .||.    '|..'|' .||. ||. |'..|'  '|...'  '|...' .||. ||.  '|..'||.  '|...' .||. ||.  '|...'  '|...'
```

### 🏓 A full-stack multiplayer Pong platform — built from scratch as a 42 Berlin final project

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![BabylonJS](https://img.shields.io/badge/Babylon.js-BB464B?style=for-the-badge&logo=babylon.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![ELK](https://img.shields.io/badge/ELK_Stack-005571?style=for-the-badge&logo=elastic&logoColor=white)

</div>

---

## What is this?

ft_transcendence is the **final project of the 42 Berlin software engineering curriculum** — a multiplayer Pong platform built entirely from scratch, featuring 3D graphics, real-time WebSocket communication, a full microservices backend, JWT authentication, tournament brackets, and a production-grade monitoring stack.

Six services designed, built, and deployed as a team of five engineers in roughly two months.

The project is intentionally a "surprise" — the subject is revealed without forewarning, deliberately using technologies students haven't seen before. The point isn't to build Pong. The point is to demonstrate that you can adapt, make architectural decisions under uncertainty, and deliver something real.

> **Note on Fastify**: The 42 subject v17.0 explicitly mandates Fastify with Node.js as the required backend framework (Major Module: Web). It was an unfamiliar technology we had to learn from scratch under project time pressure. Every backend service in this repo uses Fastify.

---

## Architecture

Every service runs in its own container. Nothing is exposed to the outside world except through Nginx and the Gateway — services communicate exclusively over an internal Docker network.

```
                         ┌─────────────────────────────┐
                         │   NGINX  (ports 80 / 8443)  │
                         │   SSL/TLS · HTTP/2          │
                         │   Static SPA serving        │
                         │   HTTP → HTTPS redirect     │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │   GATEWAY  :3000            │
                         │   Fastify v5 (TypeScript)   │
                         │   JWT verification          │
                         │   Request routing           │
                         │   WebSocket proxying        │
                         └──┬──────┬──────┬──────┬─────┘
                            │      │      │      │
            ┌───────────────┘      │      │      └────────────────┐
            │                      │      │                       │
 ┌──────────▼──────────┐  ┌────────▼───┐ ┌▼──────────────────┐  ┌─▼──────────────────┐
 │  USER SERVICE :3001 │  │    GAME    │ │ TOURNAMENT SERVICE│  │   LOG SERVICE      │
 │  Fastify v5 · JS    │  │  SERVICE   │ │ :3005  Fastify v4 │  │   :3003 Fastify v4 │
 │  bcrypt · JWT       │  │   :3002    │ │ Bracket generation│  │   Winston · JS     │
 │  Profiles · Avatars │  │ Fastify v4 │ │ WebSocket rooms   │  │   → Logstash       │
 │  Friends · 2FA      │  │     JS     │ └───────────────────┘  └────────────────────┘
 └─────────────────────┘  │ Pong logic │
                          │ WS rooms   │   ┌────────────────────┐
                          └────────────┘   │  DATABASE SERVICE  │
                                           │  :3006  Fastify v5 │
                                           │  better-sqlite3    │
                                           │  p-queue (writes)  │
                                           └─────────┬──────────┘
                                                     │
                                           ┌─────────▼──────────┐
                                           │  SQLite (volume)   │
                                           │   shared-data      │
                                           └────────────────────┘
```

### Monitoring Stack (optional Docker Compose profile)

```
All services → Log Service :3003 → Logstash :5000 → Elasticsearch :9200 → Kibana :5601
```

Enabled with `make` (full stack). Disabled by default with `make start` (lightweight, school-machine friendly).

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Vanilla TypeScript + Vite | No framework — hand-rolled SPA router |
| 3D Engine | Babylon.js v6 | 3D Pong rendering, scene management |
| Styling | Tailwind CSS | Subject-mandated minor module |
| Gateway | Fastify v5 (TypeScript) | JWT auth, reverse proxy, WS routing |
| User Service | Fastify v5 (JavaScript) | Auth, profiles, avatars, friends |
| Game Service | Fastify v4 (JavaScript) | Pong logic, WebSocket rooms |
| Tournament Service | Fastify v4 (JavaScript) | Bracket generation, WS orchestration |
| Log Service | Fastify v4 + Winston | Centralized logging pipeline |
| Database Service | Fastify v5 + better-sqlite3 + p-queue | Serialized writes, no race conditions |
| Database | SQLite | Shared Docker volume across services |
| Reverse Proxy | Nginx | SSL/TLS, HTTP/2, SPA fallback, WS upgrade |
| Containers | Docker + Docker Compose | Full orchestration, health checks, profiles |
| Monitoring | ELK Stack (Elastic 8.11) | ILM policy, Kibana dashboards, 30-day retention |
| CI | GitHub Actions | API tests, Docker build tests, service tests |

---

## SumUp Payment Integration

After completing the 42 curriculum project, I integrated SumUp's Checkout API 
directly into the platform as a practical exploration of their payment infrastructure.

Each accepted friend in the friends list has a ☕ **Buy a coffee** button. Clicking 
it creates a real checkout via SumUp's REST API and opens their hosted payment page.
```
Friends list → POST /api/payment/coffee/:username
                       ↓
              Gateway calls SumUp API
                       ↓
              SumUp returns hosted_checkout_url
                       ↓
              Browser opens SumUp payment page
```

Built to demonstrate how SumUp's developer platform works in practice.

**Stack**: SumUp Checkout API · Fastify route · Vanilla TypeScript

---

## Services in Detail

### Gateway — `services/gateway` (Fastify v5, TypeScript)

The single entry point for all API traffic:
- JWT verification on every protected route via a custom Fastify plugin (`mustAuth.plugin.ts`)
- Proxies requests to downstream services using `@fastify/http-proxy`
- Upgrades WebSocket connections and routes them to game/tournament/notification services
- `queueAwareProxyHandler` manages in-flight requests gracefully during service restarts

### User Service — `services/user-service` (Fastify v5, JavaScript)

Registration, login, bcrypt hashing, JWT issuance, profiles, avatar uploads, friend requests, online status, optional 2FA.

### Game Service — `services/game-service` (Fastify v4, JavaScript)

Server-side Pong at a fixed tick rate (authoritative server model). WebSocket room management via `RoomManager` and `GameRoom`. Supports local, remote, and tournament modes. Match results persisted to the database service on game end.

### Tournament Service — `services/tournament-service` (Fastify v4, JavaScript)

Automatic bracket generation, WebSocket waiting room coordination, match scheduling, score tracking and bracket advancement.

### Database Service — `services/database-service` (Fastify v5, JavaScript)

All persistence goes through here — no service touches the SQLite file directly. `better-sqlite3` for synchronous access, `p-queue` to serialize concurrent writes and eliminate locking entirely. Clean migration boundary if the storage backend ever needs to change.

### Log Service — `services/log-service` (Fastify v4 + Winston)

Receives structured log events from all services via HTTP. Winston for formatting and transport. Forwards to Logstash when the monitoring profile is active.

---

## Frontend — `frontend/` (Vanilla TypeScript + Vite + Babylon.js)

A hand-built SPA — no React, no Vue. Custom client-side router, manual state management, Babylon.js for all 3D rendering. The frontend only ever talks to the gateway, never directly to any service.

```
src/
├── app/          # router, auth, store, guards
├── pages/        # dashboard, lobby, local, remote, tournament/
└── renderers/
    └── babylon/  # local-scene, remote-scene, lobby-scene
```

---

## Infrastructure

### Docker Compose

Named volumes (`shared-data`, `avatar-uploads`, `elasticsearch-data`), internal network with no exposed service ports, health checks on every container, and Compose profiles gating the ELK stack for resource-constrained machines.

### Nginx

SSL termination, HTTP/2, SPA serving with correct cache headers, WebSocket upgrade, HTTP → HTTPS redirect.

### CI/CD

Four GitHub Actions workflows covering API tests, full Docker Compose build verification, user service tests, and log service pipeline tests.

---

## Quick Start

```bash
git clone https://github.com/irrivero/ft_transcendence.git
cd ft_transcendence/transcendence

cp .env.example .env   # fill in JWT_SECRET

make start             # lightweight (no ELK)
make                   # full stack with monitoring

open https://localhost:8443   # app
open http://localhost:5601    # kibana (full mode only)
open http://localhost:8080    # sqlite web admin
```

---

## Key Design Decisions

**Dedicated Database Service + p-queue** — SQLite doesn't handle concurrent writes. Instead of debugging locking errors across 6 services, we centralized all persistence behind one service with a write serializer. Bonus: clean migration boundary if we ever swap the storage backend.

**Fastify plugin architecture** — the subject mandated Fastify, but its scoped plugin system turned out to enforce good patterns. Middleware and hooks are encapsulated to the plugin that registers them, making it harder to accidentally introduce shared state.

**Vanilla TypeScript frontend** — building our own router and state management without a framework gave us a much clearer mental model of what frameworks actually abstract. Worth the pain.

**ELK as optional** — Elasticsearch needs ~1GB heap alone. Making it opt-in via Compose profiles kept the core app runnable on 42's school machines without sacrificing the observability architecture.

---

## What I'd Add Next

The infrastructure foundations are here — health checks, internal networking, centralized logging. The natural next layer:

**Prometheus + Grafana** — ELK handles logs, but logs aren't metrics. Adding `/metrics` endpoints to each Fastify service (via `fastify-metrics`) and scraping with Prometheus would give us actual time-series data: WebSocket connections per room, database write queue depth, request latency per route. Grafana on top for dashboards and alerting.

**Kubernetes** — the architecture maps cleanly to k8s. Every service is stateless, health-checked, and communicates over a named network. The readiness/liveness probes are basically already written (the `/health` endpoints). Main gain would be horizontal scaling on the game service when there are many concurrent rooms, and proper secrets management via k8s Secrets instead of `.env` files.

**PostgreSQL** — `better-sqlite3` + `p-queue` is a solid single-node solution but not a production database. The database service layer makes this a contained swap — nothing else in the system would need to change.

**Distributed tracing** — with 6 services, debugging a slow request currently means correlating log timestamps manually. OpenTelemetry trace IDs propagated through the gateway would make that instant.

---

## 42 Berlin — Module Completion

| Module | Type | Implementation |
|---|---|---|
| Backend as Microservices | ✅ Major | 6 independent Fastify services |
| Remote Players | ✅ Major | Real-time WebSocket multiplayer |
| Server-Side Pong + API | ✅ Major | Authoritative game server |
| Advanced 3D Graphics | ✅ Major | Babylon.js v6 |
| ELK Log Management | ✅ Major | Full Elastic stack + ILM policy |
| Standard User Management | ✅ Major | Auth, profiles, friends, match history |
| Backend Framework (Fastify) | ✅ Major | Subject-mandated: Fastify + Node.js |
| Tailwind CSS Frontend | ✅ Minor | |
| SQLite Database | ✅ Minor | |

**7 Major + 2 Minor = 8 Points (100%)**

---

## Team

**Irene** · **Jason** · **Shenya** · **Rene** · **Emily** — 42 Berlin

---

<div align="center">

*"This project is not intended to be a portfolio piece. Its purpose is to reveal your ability to become acquainted with and complete a complex task using an unfamiliar technology."*
*— ft_transcendence subject, v17.0*

</div>