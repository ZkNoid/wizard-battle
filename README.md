# Wizard Battle - Multi-Instance Game Server

A real-time multiplayer wizard battle game with Redis-backed multi-instance architecture supporting horizontal scaling and cross-instance matchmaking.

## 🚀 Features

### **Multi-Instance Architecture**
- **Horizontal Scaling**: Run multiple server instances simultaneously
- **Redis State Management**: All game state persisted in Redis
- **Cross-Instance Communication**: Seamless communication between instances
- **Socket-to-Instance Mapping**: Track connections across all instances
- **Health Monitoring**: Comprehensive system monitoring and statistics

### **Real-Time Game Features**
- **Cross-Instance Matchmaking**: Players matched across different server instances
- **WebSocket Communication**: Real-time game updates
- **Game State Persistence**: Complete game state stored in Redis
- **Graceful Disconnection**: Proper cleanup and resource management

## 🏗️ Architecture

### **Backend Services**
- **GameSessionGateway**: WebSocket handling and game session management
- **MatchmakingService**: Player matching with Redis-backed queues
- **GameStateService**: Game state persistence and cross-instance communication
- **RedisHealthService**: System monitoring and health checks

### **Redis Data Structure**
```
socket_mappings: Hash storing socket-to-instance mappings
game_states: Hash storing game state for each room
waiting:level:${level}: Lists of players waiting for matches
matches: Hash storing active match information
room_events: Pub/sub channel for cross-instance communication
```

## 🛠️ Technology Stack

- **Backend**: NestJS with TypeScript
- **WebSockets**: Socket.IO with Redis adapter
- **State Management**: Redis for persistence and synchronization
- **Frontend**: Next.js with React
- **Build System**: Turborepo for monorepo management

## 📦 Project Structure

```
wizard-battle/
├── apps/
│   ├── backend/          # NestJS game server
│   ├── frontend/         # Next.js game client
│   └── common/           # Shared types and utilities
├── packages/
│   ├── redis/            # Redis configuration
│   └── typescript-config/ # TypeScript configurations
└── docs/                 # Documentation
```

## 🚀 Project Deploy
### **GitHub Secrets Setup**

1. Navigate to your GitHub repository
2. Go to Settings > Secrets and Variables > Actions
3. Click "New repository secret"
4. Add the following required secrets:
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB`: MongoDB database name
- `SERVER_HOST`: Remote server hostname/IP
- `SERVER_USER`: SSH username for remote server
- `SERVER_PORT`: SSH port for remote server
- `SERVER_SSH_KEY`: SSH private key for authentication
- `TARGET_PATH`: Remote server deployment path
- `TELEGRAM_TOKEN`: Telegram bot token for notifications
- `TELEGRAM_CHAT_ID`: Telegram chat ID for notifications
- `MONGO_INITDB_ROOT_USERNAME`: MongoDB root username (default: admin)
- `MONGO_INITDB_ROOT_PASSWORD`: MongoDB root password
- `POSTGRES_USER`: PostgreSQL username (default: orbitrium)
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_DB`: PostgreSQL database name (default: orbitrium_db)

#### Required Secrets:

for dev server
```bash
git commit --allow-empty -m "Deploy all to new dev server"
git push origin dev
```

for production server
```bash
git commit --allow-empty -m "Deploy all to new prod server"
git push origin main
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- Redis server
- pnpm package manager

### **1. Install Dependencies**
```bash
pnpm install
```

### **2. Start Redis**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or using local Redis
redis-server
```

### **3. Start Multi-Instance Backend**
```bash
cd apps/backend

# Start multiple instances
npm run start:multi

# Or start instances only (keeps them running)
npm run start:instances
```

### **4. Start Frontend**
```bash
cd apps/frontend
npm run dev
```

## 🧪 Testing Multi-Instance Setup

### **Single Instance Test**
```bash
cd apps/backend
npm run test:single-instance
```

### **Multi-Instance Test**
```bash
cd apps/backend
npm run test:multi-instance
```

### **Manual Testing**
```bash
# Start instances manually
export APP_PORT=3001 && npm run start:dev &
export APP_PORT=3002 && npm run start:dev &
export APP_PORT=3003 && npm run start:dev &

# Test health endpoints
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## 🔧 Configuration

### **Environment Variables**
- `APP_PORT`: Server port (default: 3030)
- `REDIS_URL`: Redis connection URL (default: redis://localhost:6379)

### **Multi-Instance Setup**
The system automatically supports multiple instances:
- Each instance gets a unique instance ID
- Socket mappings track which instance each connection belongs to
- Redis pub/sub enables cross-instance communication
- Game state is shared across all instances

## 📊 Monitoring & Health

### **Health Endpoints**
- `GET /health`: Overall system health
- `GET /health/stats`: Detailed system statistics
- `POST /health/cleanup`: Clean up orphaned data

### **Health Response Example**
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

## 🔄 Cross-Instance Matchmaking

### **How It Works**
1. **Player A** connects to Instance 1
2. **Player B** connects to Instance 2
3. Both players join matchmaking queue (stored in Redis)
4. MatchmakingService finds compatible players across instances
5. Game state created in Redis
6. Both players notified via cross-instance events
7. Game session starts with players on different instances

### **Cross-Instance Events**
- `matchFound`: Notifies players when match is created
- `playerJoined`: Handles player joining from different instance
- `gameMessage`: Broadcasts game messages across instances
- `opponentDisconnected`: Handles player disconnection

## 🚀 Production Deployment

### **Docker Compose Setup**
```yaml
version: '3.8'
services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
  
  backend-1:
    build: ./apps/backend
    environment:
      - APP_PORT=3001
      - REDIS_URL=redis://redis:6379
    ports:
      - "3001:3001"
  
  backend-2:
    build: ./apps/backend
    environment:
      - APP_PORT=3002
      - REDIS_URL=redis://redis:6379
    ports:
      - "3002:3002"
  
  backend-3:
    build: ./apps/backend
    environment:
      - APP_PORT=3003
      - REDIS_URL=redis://redis:6379
    ports:
      - "3003:3003"
```

### **Load Balancer Configuration**
- Use sticky sessions for WebSocket connections
- Configure health checks for all instances
- Set up Redis clustering for high availability

## 🔍 Troubleshooting

### **Common Issues**

1. **Port Conflicts**
   ```bash
   # Check for running processes
   lsof -i :3001 -i :3002 -i :3003
   
   # Kill existing processes
   pkill -f "nest start"
   ```

2. **Redis Connection Issues**
   ```bash
   # Test Redis connection
   redis-cli ping
   
   # Check Redis logs
   docker logs redis-container
   ```

3. **Cross-Instance Communication**
   - Verify Redis pub/sub is working
   - Check socket mappings in Redis
   - Monitor room events

### **Debug Commands**
```bash
# Check Redis data
redis-cli hgetall socket_mappings
redis-cli hgetall game_states
redis-cli hgetall matches

# Monitor Redis operations
redis-cli monitor

# Check instance health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## 📈 Performance Considerations

### **Redis Optimization**
- Use Redis pipelining for batch operations
- Implement connection pooling
- Monitor Redis memory usage
- Consider Redis clustering for high availability

### **Scaling Guidelines**
- Start with 3-5 instances for testing
- Monitor memory usage per instance
- Use load balancer for distribution
- Implement auto-scaling based on metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Useful Links

- [NestJS Documentation](https://docs.nestjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Turborepo Documentation](https://turborepo.com/docs)
