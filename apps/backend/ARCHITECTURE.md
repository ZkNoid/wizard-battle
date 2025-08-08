# Wizard Battle Backend Architecture

## Overview

The Wizard Battle backend is a **NestJS application** with a **multi-instance, horizontally scalable architecture** using **Redis** for coordination. The system supports real-time multiplayer gameplay with WebSocket connections and can scale across multiple server instances.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    WIZARD BATTLE BACKEND ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        CLIENT LAYER                                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                       │
│  │   Client A  │    │   Client B  │    │   Client C  │    │   Client D  │                       │
│  │  (Level 2)  │    │  (Level 2)  │    │  (Level 3)  │    │  (Level 3)  │                       │
│  └─────┬───────┘    └─────┬───────┘    └─────┬───────┘    └─────┬───────┘                       │
│        │ WebSocket        │ WebSocket        │ WebSocket        │ WebSocket                      │
└────────┼──────────────────┼──────────────────┼──────────────────┼─────────────────────────────────┘
         │                  │                  │                  │
┌────────┼──────────────────┼──────────────────┼──────────────────┼─────────────────────────────────┐
│        │                  │                  │                  │         LOAD BALANCER           │
│        │                  │                  │                  │                                 │
│        ▼                  ▼                  ▼                  ▼                                 │
│ ┌─────────────────┐                                    ┌─────────────────┐                       │
│ │   INSTANCE 1    │                                    │   INSTANCE 2    │                       │
│ │   (Port 3030)   │                                    │   (Port 3031)   │                       │
│ │                 │                                    │                 │                       │
│ │ ┌─────────────┐ │                                    │ ┌─────────────┐ │                       │
│ │ │ AppModule   │ │                                    │ │ AppModule   │ │                       │
│ │ │             │ │                                    │ │             │ │                       │
│ │ │ ┌─────────┐ │ │                                    │ │ ┌─────────┐ │ │                       │
│ │ │ │AppCtrl  │ │ │                                    │ │ │AppCtrl  │ │ │                       │
│ │ │ │AppSvc   │ │ │                                    │ │ │AppSvc   │ │ │                       │
│ │ │ │Health   │ │ │                                    │ │ │Health   │ │ │                       │
│ │ │ └─────────┘ │ │                                    │ │ └─────────┘ │ │                       │
│ │ │             │ │                                    │ │             │ │                       │
│ │ │GameSession  │ │                                    │ │GameSession  │ │                       │
│ │ │   Module    │ │                                    │ │   Module    │ │                       │
│ │ └─────────────┘ │                                    │ └─────────────┘ │                       │
│ │                 │                                    │                 │                       │
│ │ ┌─────────────┐ │                                    │ ┌─────────────┐ │                       │
│ │ │   Gateway   │ │◄──────────┐            ┌─────────►│ │   Gateway   │ │                       │
│ │ │             │ │           │            │          │ │             │ │                       │
│ │ │ Socket.IO   │ │           │            │          │ │ Socket.IO   │ │                       │
│ │ │ + Redis     │ │           │            │          │ │ + Redis     │ │                       │
│ │ │ Adapter     │ │           │            │          │ │ Adapter     │ │                       │
│ │ └─────────────┘ │           │            │          │ └─────────────┘ │                       │
│ │                 │           │            │          │                 │                       │
│ │ ┌─────────────┐ │           │            │          │ ┌─────────────┐ │                       │
│ │ │Matchmaking  │ │           │            │          │ │Matchmaking  │ │                       │
│ │ │  Service    │ │           │            │          │ │  Service    │ │                       │
│ │ └─────────────┘ │           │            │          │ └─────────────┘ │                       │
│ │                 │           │            │          │                 │                       │
│ │ ┌─────────────┐ │           │            │          │ ┌─────────────┐ │                       │
│ │ │ GameState   │ │           │            │          │ │ GameState   │ │                       │
│ │ │  Service    │ │           │            │          │ │  Service    │ │                       │
│ │ └─────────────┘ │           │            │          │ └─────────────┘ │                       │
│ └─────────────────┘           │            │          └─────────────────┘                       │
└───────────────────────────────┼────────────┼──────────────────────────────────────────────────────┘
                                │            │
┌───────────────────────────────┼────────────┼──────────────────────────────────────────────────────┐
│                               │            │                  REDIS CLUSTER                       │
│                               │            │                                                       │
│                               ▼            ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              REDIS PUB/SUB CHANNELS                                        │ │
│  │                                                                                             │ │
│  │  room_events: {roomId, event, data, timestamp}                                             │ │
│  │  ├─ gameMessage                                                                             │ │
│  │  ├─ playerStateUpdated                                                                      │ │
│  │  ├─ matchFound                                                                              │ │
│  │  ├─ playerJoined                                                                            │ │
│  │  └─ opponentDisconnected                                                                    │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                 REDIS DATA STRUCTURES                                      │ │
│  │                                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │ │
│  │  │ waiting:level:2 │  │ waiting:level:3 │  │     matches     │  │  game_states    │       │ │
│  │  │     (LIST)      │  │     (LIST)      │  │     (HASH)      │  │     (HASH)      │       │ │
│  │  │                 │  │                 │  │                 │  │                 │       │ │
│  │  │ [Player JSON]   │  │ [Player JSON]   │  │ roomId1: Match  │  │ roomId1: State  │       │ │
│  │  │ [Player JSON]   │  │ [Player JSON]   │  │ roomId2: Match  │  │ roomId2: State  │       │ │
│  │  │      ...        │  │      ...        │  │      ...        │  │      ...        │       │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘       │ │
│  │                                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │ │
│  │  │                           socket_mappings (HASH)                                   │   │ │
│  │  │                                                                                     │   │ │
│  │  │  socketId1: {socketId, instanceId, roomId?, playerId?}                             │   │ │
│  │  │  socketId2: {socketId, instanceId, roomId?, playerId?}                             │   │ │
│  │  │  socketId3: {socketId, instanceId, roomId?, playerId?}                             │   │ │
│  │  │  socketId4: {socketId, instanceId, roomId?, playerId?}                             │   │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Component Relationships

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AppModule     │────│ GameSessionModule│────│  Redis Cluster  │
│                 │    │                  │    │                 │
│ • AppController │    │ • Gateway        │    │ • Pub/Sub       │
│ • AppService    │    │ • MatchmakingSvc │    │ • State Storage │
│ • Health        │    │ • GameStateSvc   │    │ • Socket Maps   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Core Components

### 1. App Layer (Entry Point)
- **`main.ts`**: Bootstraps the NestJS application on port 3030
- **`app.module.ts`**: Root module that imports `GameSessionModule` and provides core services
- **`app.controller.ts`**: Basic HTTP controller with a simple health check endpoint
- **`app.service.ts`**: Handles application lifecycle, particularly cleanup of Redis connections on shutdown

### 2. Game Session Layer (WebSocket & Coordination)
- **`game-session.gateway.ts`**: WebSocket gateway using Socket.IO with Redis adapter for horizontal scaling
- **`game-session.module.ts`**: Module that wires together the gateway and related services

### 3. Matchmaking Service (Player Matching)
- **`matchmaking.service.ts`**: Handles player queuing, matching, and room creation using Redis for coordination

### 4. Game State Service (State Management)
- **`game-state.service.ts`**: Manages game state persistence, socket mappings, and cross-instance communication

## Data Flow Patterns

### 1. Player Connection Flow
```
1. Client connects → GameSessionGateway.handleConnection()
2. Socket registered → GameStateService.registerSocket()
3. Socket mapping stored in Redis → enables cross-instance routing
```

### 2. Matchmaking Flow
```
1. Client sends 'joinMatchmaking' → GameSessionGateway.handleJoinMatchmaking()
2. MatchmakingService.joinMatchmaking():
   a. Register socket with GameStateService
   b. Add player to Redis waiting list by level
   c. Search for opponent with same level
   d. If match found:
      - Create room ID (sorted player IDs)
      - Remove both players from waiting list
      - Store match in Redis 'matches' hash
      - Create initial game state via GameStateService
      - Join both players to Socket.IO room
      - Notify players via direct emit + Redis pub/sub
```

### 3. Game Communication Flow
```
1. Client sends 'gameMessage' → GameSessionGateway.handleGameMessage()
2. Verify active match and game state exist
3. Emit to local sockets in room
4. Publish to Redis 'room_events' channel
5. Other instances receive via GameStateService.subscribeToRoomEvents()
6. Other instances re-emit to their local sockets
```

### 4. State Management Flow
```
1. Client sends 'updatePlayerState' → GameSessionGateway.handleUpdatePlayerState()
2. GameStateService.updatePlayerState():
   - Load game state from Redis 'game_states' hash
   - Update specific player's state
   - Persist back to Redis
3. Publish 'playerStateUpdated' event via Redis
4. All instances broadcast update to room participants
```

## Redis Data Structures

### Core Data Storage
1. **`waiting:level:<level>`** (Lists): Queued players by skill level
2. **`matches`** (Hash): Active matches with room IDs and player info
3. **`game_states`** (Hash): Complete game state per room
4. **`socket_mappings`** (Hash): Socket-to-instance mappings for routing

### Communication Channels
5. **`room_events`** (Pub/Sub Channel): Cross-instance event broadcasting

### Event Types
- `gameMessage`: In-game communication between players
- `playerStateUpdated`: Player state changes (position, health, etc.)
- `matchFound`: Successful matchmaking notification
- `playerJoined`: Player joining a room
- `opponentDisconnected`: Opponent leaving the game

## Horizontal Scaling Architecture

The system supports **multiple backend instances** running simultaneously:

### Key Features
- **Socket.IO Redis Adapter**: Enables WebSocket message broadcasting across instances
- **Redis Pub/Sub**: Coordinates events between instances (match found, player updates, etc.)
- **Socket Mappings**: Track which instance hosts each connected player
- **Shared State**: All game state and matchmaking data stored in Redis

### Cross-Instance Communication
When a player on Instance A needs to communicate with a player on Instance B:
1. Instance A publishes event to Redis `room_events` channel
2. Instance B receives event via subscription
3. Instance B emits to local sockets in the target room
4. Both instances maintain synchronized game state in Redis

## Scaling Benefits

- ✅ **Horizontal Scaling**: Multiple instances can run simultaneously
- ✅ **Load Distribution**: Players distributed across instances
- ✅ **High Availability**: If one instance fails, others continue
- ✅ **Cross-Instance Communication**: Players on different instances can play together
- ✅ **Persistent State**: Game state survives instance restarts via Redis
- ✅ **Real-time Sync**: Socket.IO Redis adapter ensures message broadcasting

## Deployment

The system can be started in multiple ways:

1. **Single Instance**: Standard NestJS application
2. **Multi-Instance**: Using `start-multi-instance.sh` script to run multiple processes
3. **Docker**: Containerized deployment with Redis cluster

This architecture ensures that players can be matched and play together regardless of which backend instance they're connected to, providing seamless horizontal scalability for the multiplayer game.
```

The architecture documentation has been saved to `apps/backend/architecture.md` with a comprehensive explanation of the system design, component relationships, data flows, and scaling capabilities. 