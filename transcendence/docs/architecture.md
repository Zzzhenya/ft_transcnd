# System Architecture

## Microservices Overview

Our ft_transcendence platform uses a microservices architecture with:

- **API Gateway**: Central request routing and WebSocket proxy
- **User Service**: Authentication and user management
- **Game Service**: Server-side Pong physics and tournaments
- **Log Service**: Centralized logging and monitoring
- **Frontend**: 3D Pong interface

## Database Strategy

- **Shared SQLite Database**: All services access the same SQLite file
- **Service Ownership**: Each service owns specific tables
- **Connection Management**: Careful handling of concurrent access

## Communication Patterns

- **HTTP REST**: Synchronous service-to-service communication
- **WebSocket**: Real-time game updates through Gateway proxy
- **Database**: Shared data persistence layer

## Deployment

All services run in Docker containers orchestrated with Docker Compose.
