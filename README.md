# Microservices Architecture Implementation

## Branch: `microservices-refactor`

## Overview
This branch implements the "Designing the Backend as Microservices" major module for ft_transcendence. We are restructuring the application from a monolithic architecture to a distributed microservices system.

## Diagram

```mermaid
graph TB
    %% Frontend Layer
    Frontend[Frontend - Jason<br/>3D Graphics + Tailwind CSS<br/>TypeScript Interface]
    
    %% API Gateway Layer
    Gateway[API Gateway - Emily<br/>Node.js + Fastify Framework<br/>Request Routing + Remote Players<br/>WebSocket Management]
    
    %% Service Layer
    UserService[User Service - Rene<br/>Authentication + JWT<br/>User Management + Profiles<br/>SQLite Database Module]
    
    GameService[Game Service - Shenya<br/>Server-side Pong Logic<br/>Microservices Architecture<br/>Tournament Management]
    
    LogService[Log Service - Irene<br/>ELK Stack Integration<br/>Centralized Logging<br/>Monitoring System]
    
    %% Database Layer
    DB[(SQLite Database - Rene<br/>Shared Schema<br/>Users + Games + Tournaments<br/>Application Logs)]
    
    %% Monitoring Layer
    MonitoringUI[Monitoring Dashboard - Irene<br/>Prometheus + Grafana<br/>System Metrics + Health Checks]
    
    %% Connections
    Frontend -->|HTTP/WebSocket| Gateway
    Gateway -->|HTTP REST| UserService
    Gateway -->|HTTP REST| GameService
    Gateway -->|HTTP Logs| LogService
    
    UserService -->|SQLite| DB
    GameService -->|SQLite| DB
    LogService -->|SQLite Access| DB
    
    LogService -->|Metrics| MonitoringUI
    
    %% Remote Players Flow
    Frontend -.->|Remote Players| Gateway
    Gateway -.->|Real-time| GameService
    
    %% Authentication Flow
    Gateway -.->|JWT Check| UserService
    GameService -.->|User Verify| UserService
    
    %% Module Annotations
    classDef emilyWork fill:#e1f5fe
    classDef shenyaWork fill:#f3e5f5
    classDef reneWork fill:#e8f5e8
    classDef jasonWork fill:#fff3e0
    classDef ireneWork fill:#fce4ec
    
    class Gateway emilyWork
    class GameService shenyaWork
    class UserService,DB reneWork
    class Frontend jasonWork
    class LogService,MonitoringUI ireneWork
```

## Time flow 

```mermaid
sequenceDiagram
    participant U as User Browser
    participant G as API Gateway
    participant A as Auth Service
    participant GS as Game Service
    participant DB as SQLite Database
    participant L as Log Service

    %% Authentication Flow
    Note over U,L: User Login Process
    U->>G: POST /api/auth/login
    G->>A: Forward credentials
    A->>DB: Validate user
    DB-->>A: User data
    A->>A: Generate JWT
    A-->>G: Return JWT token
    G-->>U: Login success + token

    %% Game Creation Flow
    Note over U,L: Game Creation Process
    U->>G: POST /api/games/create (JWT)
    G->>A: Verify JWT token
    A-->>G: Token valid
    G->>GS: Create game session
    GS->>DB: Store game state
    DB-->>GS: Game created
    GS-->>G: Game ID + status
    G-->>U: Game ready

    %% Real-time Game Flow
    Note over U,L: Real-time Gameplay
    U->>G: WebSocket connect
    G->>GS: Establish game session
    
    loop Every 16ms (60fps)
        GS->>GS: Update ball physics
        GS->>DB: Save game state
        GS->>G: Broadcast game update
        G->>U: WebSocket game state
    end

    %% Remote Player Joins
    Note over U,L: Remote Player Connection
    U->>G: Player input (paddle move)
    G->>GS: Forward input
    GS->>GS: Process physics
    GS->>G: Updated game state
    G->>U: Broadcast to all players

    %% Logging Throughout
    G->>L: Log requests
    A->>L: Log auth events
    GS->>L: Log game metrics

```


## Architecture Goals

### Service Boundaries
- **User Service**: Authentication, profiles, friends management
- **Game Service**: Pong logic, tournaments, matchmaking
- **Chat Service**: Real-time messaging system  
- **AI Service**: Computer opponent logic
- **API Gateway**: Request routing, authentication middleware

### Critical Design Decisions Needed

#### Database Strategy
- [ ] **Decision**: Shared database vs database per service
- [ ] **Rationale**: Document why we chose this approach
- [ ] **Implementation**: How services will access data

#### Inter-Service Communication
- [ ] **Synchronous**: HTTP REST APIs between services
- [ ] **Asynchronous**: Message queues/event system for real-time features
- [ ] **Real-time**: WebSocket handling across services

#### Authentication Flow
- [ ] **JWT Token Management**: Where tokens are validated
- [ ] **Service-to-Service Auth**: How services authenticate each other
- [ ] **User Session Handling**: Shared session state management

## Implementation Tasks

### Phase 1: Foundation (Week 1)
#### Infrastructure Setup
- [ ] Create Docker Compose configuration for all services
- [ ] Set up API Gateway with basic routing
- [ ] Configure service discovery mechanism
- [ ] Set up shared logging and monitoring

#### Service Scaffolding
- [ ] Create basic service containers (Node.js + Fastify)
- [ ] Implement health check endpoints for all services
- [ ] Set up inter-service communication protocols
- [ ] Create service-to-service authentication

### Phase 2: Core Services (Week 2)
#### API Gateway
- [ ] Request routing to appropriate services
- [ ] Authentication middleware
- [ ] Rate limiting and security headers
- [ ] Load balancing configuration

#### Service Integration Points
- [ ] Define API contracts between services
- [ ] Implement service discovery
- [ ] Set up distributed transaction handling
- [ ] Create error handling and circuit breaker patterns

### Phase 3: Advanced Features (Week 3+)
#### Scalability & Reliability
- [ ] Implement circuit breaker pattern
- [ ] Add service redundancy and failover
- [ ] Set up distributed logging (ELK stack integration)
- [ ] Performance monitoring and metrics

#### Integration Testing
- [ ] End-to-end testing across services
- [ ] Load testing for service communication
- [ ] Failure scenario testing (service outages)

## Technical Specifications

### Service Communication Patterns
```yaml
# HTTP REST for standard operations
User Service → Game Service: GET /users/{id}/profile

# WebSocket for real-time features  
Frontend ↔ API Gateway ↔ Game Service: WebSocket game state

# Message queues for async operations
Game Service → Chat Service: game_ended event
```

### Data Flow Examples
1. **User Authentication**: Frontend → Gateway → User Service → JWT response
2. **Game Creation**: Frontend → Gateway → Game Service → User Service validation
3. **Real-time Gaming**: Frontend ↔ Gateway ↔ Game Service (WebSocket)

## Directory Structure
```
/services/
  /api-gateway/
    /src/
    /Dockerfile
  /user-service/
    /src/
    /Dockerfile
  /game-service/
    /src/  
    /Dockerfile
  /chat-service/
    /src/
    /Dockerfile
/shared/
  /types/          # Shared TypeScript interfaces
  /utils/          # Common utilities
/docker-compose.yml
/docker-compose.dev.yml
```

## Dependencies & Integration Points

### Team Coordination Required
- **(Backend Framework)**: Must align Node.js/Fastify implementation with service architecture
- **(User Management + JWT)**: User service implementation and JWT handling across services
- **(Remote Players)**: WebSocket integration with service architecture  
- **(Server-side Pong)**: Game logic must work within Game Service boundaries

### External Module Dependencies
- User Management → All services need user context
- JWT Security → Gateway and all services need token validation
- Server-side Pong → Game Service core functionality
- Remote Players → Real-time communication across services

## Development Guidelines

### Code Standards
- TypeScript for all services
- Consistent API response formats
- Standardized error handling
- Service interface documentation

### Testing Strategy
- Unit tests for individual services
- Integration tests for service communication
- End-to-end tests for complete user flows
- Load testing for service scalability

## Deployment Configuration

### Development Environment
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Start specific service for debugging
docker-compose up api-gateway user-service
```

### Production Considerations
- Service health monitoring
- Load balancing configuration  
- Database connection pooling
- Logging aggregation

## Risk Assessment

### Technical Risks
- **Service Communication Failures**: Network partitions between services
- **Data Consistency**: Managing state across distributed services
- **Debugging Complexity**: Tracing issues across multiple services
- **Performance Overhead**: Network latency between services

### Mitigation Strategies
- Implement circuit breaker patterns
- Use distributed tracing (correlation IDs)
- Comprehensive logging and monitoring
- Service redundancy for critical components

## Success Criteria
- [ ] All services can start independently via Docker
- [ ] API Gateway successfully routes requests to appropriate services
- [ ] User authentication works across all services
- [ ] Real-time gaming functions through service architecture
- [ ] System handles individual service failures gracefully
- [ ] Performance is acceptable compared to monolithic approach

## Notes and Decisions Log
- **Date**: Decision made and rationale
- **Date**: Architecture changes and impact
- **Date**: Integration challenges and solutions