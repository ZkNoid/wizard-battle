#!/bin/bash

# Mina Tournament Service startup script
# This script starts the tournament service as a separate instance

echo "🚀 Starting Mina Tournament Service"

# Check if Redis is running
echo "📡 Checking Redis connection..."
REDIS_CONTAINER_ID=$(docker ps --filter "ancestor=redis:latest" --format "{{.ID}}" | head -1)
if [ -z "$REDIS_CONTAINER_ID" ] || ! docker exec $REDIS_CONTAINER_ID redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   docker run -d -p 6379:6379 redis:latest"
    exit 1
fi
echo "✅ Redis is running"

# Check if MongoDB is running
echo "📡 Checking MongoDB connection..."
MONGO_CONTAINER_ID=$(docker ps --filter "ancestor=mongo:latest" --format "{{.ID}}" | head -1)
if [ -z "$MONGO_CONTAINER_ID" ]; then
    echo "⚠️  MongoDB container not found, assuming external MongoDB"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Default port for Mina service
MINA_PORT=${MINA_APP_PORT:-3031}

echo "🔧 Starting Mina Tournament Service on port $MINA_PORT..."

# Check for required environment variables
if [ -z "$TOURNAMENT_CONTRACT_ADDRESS" ]; then
    echo "⚠️  WARNING: TOURNAMENT_CONTRACT_ADDRESS not set"
    echo "   The service will start but contract interactions will fail"
fi

# Start the mina app
export MINA_APP_PORT=$MINA_PORT
npm run start:mina:dev > logs/mina-instance.log 2>&1 &
MINA_PID=$!
echo "✅ Mina Tournament Service started with PID: $MINA_PID"

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
MAX_WAIT=60
COUNTER=0
while [ $COUNTER -lt $MAX_WAIT ]; do
    if curl -s http://localhost:$MINA_PORT/tournament/status > /dev/null 2>&1; then
        echo "✅ Mina Tournament Service is ready!"
        break
    fi
    sleep 2
    COUNTER=$((COUNTER + 2))
    echo "   Waiting... ($COUNTER/$MAX_WAIT seconds)"
done

if [ $COUNTER -ge $MAX_WAIT ]; then
    echo "⚠️  Service may not be fully ready yet, check logs/mina-instance.log"
fi

echo ""
echo "📊 Service Status:"
echo "   Mina Service: http://localhost:$MINA_PORT"
echo "   Health Check: http://localhost:$MINA_PORT/tournament/status"
echo ""
echo "📝 Logs available at: logs/mina-instance.log"
echo ""
echo "To stop the service:"
echo "   kill $MINA_PID"
echo ""
echo "Environment variables for frontend:"
echo "   MINA_TOURNAMENT_API_URL=http://localhost:$MINA_PORT"
