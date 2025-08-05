# Multi-Instance Redis Implementation

This document describes the Redis-based multi-instance architecture implemented for the wizard-battle backend.

## Overview

The backend now supports running multiple server instances with full state synchronization through Redis. This ensures that:

- Matchmaking works across all instances
- Game sessions are properly distributed
- Socket connections are tracked across instances
- Game state is persisted and synchronized
- Cross-instance communication works seamlessly

## Architecture Components

### 1. GameStateService (`apps/backend/src/game-session/game-state.service.ts`)

**Purpose**: Manages socket-to-instance mappings and game state persistence.

**Key Features**:
- **Socket Mapping**: Tracks which socket is connected to which server instance
- **Game State Persistence**: Stores game state in Redis for cross-instance access
- **Cross-Instance Communication**: Uses Redis pub/sub for inter-instance messaging
- **Instance Cleanup**: Automatically cleans up instance data on shutdown

**Redis Keys**:
- `socket_mappings`: Hash storing socket-to-instance mappings
- `game_states`: Hash storing game state for each room
- `room_events`: Pub/sub channel for cross-instance communication

### 2. Enhanced MatchmakingService (`apps/backend/src/matchmaking/matchmaking.service.ts`)

**Purpose**: Handles player matchmaking with Redis-backed state management.

**Key Features**:
- **Redis-Backed Waiting Lists**: Player queues stored in Redis lists
- **Cross-Instance Match Creation**: Matches can be created across different instances
- **Socket Mapping Integration**: Uses GameStateService for socket tracking
- **Graceful Disconnection**: Properly handles player disconnections

**Redis Keys**:
- `waiting:level:${level}`: Lists of players waiting for matches at each level
- `matches`: Hash storing active match information

### 3. Enhanced GameSessionGateway (`apps/backend/src/game-session/game-session.gateway.ts`)

**Purpose**: Handles WebSocket connections and game session management.

**Key Features**:
- **Redis Adapter**: Socket.IO rooms synchronized across instances
- **Cross-Instance Event Handling**: Processes events from other instances
- **State Synchronization**: Updates game state across all instances
- **Socket Registration**: Tracks socket connections across instances

### 4. RedisHealthService (`apps/backend/src/health/redis-health.service.ts`)

**Purpose**: Monitors Redis health and provides cleanup utilities.

**Key Features**:
- **Health Checks**: Monitors Redis connection and data integrity
- **Detailed Statistics**: Provides comprehensive system statistics
- **Orphaned Data Cleanup**: Removes stale data from Redis
- **Instance Monitoring**: Tracks active instances and their connections

## Redis Data Structure

### Socket Mappings
```
socket_mappings: {
  "socket_id_1": '{"socketId":"socket_id_1","instanceId":"pid-timestamp","roomId":"room_123","playerId":"player_1"}',
  "socket_id_2": '{"socketId":"socket_id_2","instanceId":"pid-timestamp","roomId":"room_123","playerId":"player_2"}'
}
```

### Game States
```
game_states: {
  "room_123": '{"roomId":"room_123","players":[{"id":"player_1","instanceId":"pid-timestamp","socketId":"socket_id_1","state":{}}],"gameData":{},"turn":0,"status":"active","createdAt":1234567890,"updatedAt":1234567890}'
}
```

### Matchmaking
```
waiting:level:2: ["player_1", "player_2"]
waiting:level:3: ["player_3"]
matches: {
  "room_123": '{"player1":{"id":"player_1","level":2},"player2":{"id":"player_2","level":2},"roomId":"room_123"}'
}
```

## Cross-Instance Communication

### Room Events (Pub/Sub)
```javascript
// Publishing events to other instances
await gameStateService.publishToRoom(roomId, 'gameMessage', {
  sender: socketId,
  message: gameMessage
});

// Subscribing to events from other instances
await gameStateService.subscribeToRoomEvents((data) => {
  // Handle cross-instance events
});
```

## Health Monitoring

### Health Endpoints
- `GET /health`: Overall system health status
- `GET /health/stats`: Detailed system statistics
- `POST /health/cleanup`: Clean up orphaned data

### Health Status Response
```json
{
  "redis": true,
  "matchmaking": true,
  "gameStates": true,
  "socketMappings": true,
  "details": {
    "redisConnection": true,
    "matchmakingData": 5,
    "activeGameStates": 3,
    "activeSocketMappings": 10,
    "activeRooms": 3
  }
}
```

## Deployment Considerations

### 1. Redis Configuration
Ensure Redis is properly configured for your deployment:
- **Persistence**: Enable AOF or RDB for data durability
- **Memory**: Configure appropriate memory limits
- **Network**: Ensure all instances can connect to Redis

### 2. Load Balancing
- Use sticky sessions or session affinity for WebSocket connections
- Ensure load balancer supports WebSocket upgrades
- Consider using Redis for session storage

### 3. Monitoring
- Monitor Redis memory usage
- Track active connections per instance
- Set up alerts for orphaned data
- Monitor cross-instance communication

### 4. Scaling
- Add new instances by simply starting them with the same Redis configuration
- Instances automatically register and start handling requests
- No manual configuration required for new instances

## Error Handling

### Graceful Degradation
- If Redis is unavailable, the system falls back to single-instance mode
- Socket connections continue to work locally
- Matchmaking queues are preserved in Redis when available

### Recovery Procedures
1. **Instance Restart**: Instances automatically clean up their data on shutdown
2. **Redis Restart**: Game states and matchmaking data are preserved
3. **Orphaned Data**: Use `/health/cleanup` endpoint to remove stale data

## Performance Considerations

### Redis Optimization
- Use Redis pipelining for batch operations
- Implement connection pooling
- Monitor Redis memory usage
- Consider Redis clustering for high availability

### Memory Management
- Clean up socket mappings on disconnect
- Remove game states when sessions end
- Implement TTL for temporary data
- Monitor for memory leaks

## Testing Multi-Instance Setup

### Local Testing
1. Start Redis: `redis-server`
2. Start multiple backend instances on different ports
3. Connect clients to different instances
4. Verify cross-instance communication

### Load Testing
1. Use tools like Artillery or k6
2. Test with multiple instances
3. Verify state consistency
4. Monitor Redis performance

## Troubleshooting

### Common Issues

1. **Socket Not Found**: Check socket mappings in Redis
2. **Cross-Instance Messages Not Received**: Verify pub/sub configuration
3. **Orphaned Data**: Run cleanup endpoint
4. **Memory Issues**: Monitor Redis memory usage

### Debug Commands
```bash
# Check Redis keys
redis-cli keys "*"

# Monitor Redis operations
redis-cli monitor

# Check specific data
redis-cli hgetall socket_mappings
redis-cli hgetall game_states
redis-cli hgetall matches
```

## Future Enhancements

1. **Redis Clustering**: For high availability
2. **State Compression**: Reduce Redis memory usage
3. **Event Sourcing**: For complete game state history
4. **Metrics Collection**: Enhanced monitoring and alerting
5. **Auto-scaling**: Dynamic instance management 