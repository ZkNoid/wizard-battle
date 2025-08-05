#!/bin/bash

# Multi-instance server startup script (instances only)
# This script starts multiple backend instances on different ports and keeps them running

echo "🚀 Starting Multi-Instance Backend Servers"

# Check if Redis is running
echo "📡 Checking Redis connection..."
if ! docker exec b65c2a1a79ce redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   docker run -d -p 6379:6379 redis:latest"
    exit 1
fi
echo "✅ Redis is running"

# Kill any existing processes on the ports we'll use
echo "🧹 Cleaning up existing processes..."
pkill -f "nest start" || true
pkill -f "node dist/main" || true

# Wait a moment for processes to terminate
sleep 2

# Create logs directory if it doesn't exist
mkdir -p logs

# Start multiple instances
echo "🔧 Starting backend instances..."

# Instance 1 - Port 3001
echo "📡 Starting Instance 1 on port 3001..."
export APP_PORT=3001
npm run start:dev > logs/instance-1.log 2>&1 &
INSTANCE_1_PID=$!
echo "✅ Instance 1 started with PID: $INSTANCE_1_PID"

# Instance 2 - Port 3002
echo "📡 Starting Instance 2 on port 3002..."
export APP_PORT=3002
npm run start:dev > logs/instance-2.log 2>&1 &
INSTANCE_2_PID=$!
echo "✅ Instance 2 started with PID: $INSTANCE_2_PID"

# Instance 3 - Port 3003
echo "📡 Starting Instance 3 on port 3003..."
export APP_PORT=3003
npm run start:dev > logs/instance-3.log 2>&1 &
INSTANCE_3_PID=$!
echo "✅ Instance 3 started with PID: $INSTANCE_3_PID"

# Wait for instances to start
echo "⏳ Waiting for instances to start..."
sleep 15

# Check if instances are running
echo "🔍 Checking instance status..."

check_instance() {
    local port=$1
    local instance_num=$2
    local pid=$3
    
    if curl -s http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ Instance $instance_num (Port $port) is running (PID: $pid)"
        return 0
    else
        echo "❌ Instance $instance_num (Port $port) is not responding (PID: $pid)"
        return 1
    fi
}

check_instance 3001 1 $INSTANCE_1_PID
check_instance 3002 2 $INSTANCE_2_PID
check_instance 3003 3 $INSTANCE_3_PID

echo ""
echo "🎯 All instances started and running!"
echo ""
echo "📋 Available endpoints:"
echo "   Instance 1: http://localhost:3001"
echo "   Instance 2: http://localhost:3002"
echo "   Instance 3: http://localhost:3003"
echo ""
echo "📋 Health endpoints:"
echo "   http://localhost:3001/health"
echo "   http://localhost:3002/health"
echo "   http://localhost:3003/health"
echo ""
echo "📋 Instance logs:"
echo "   tail -f logs/instance-1.log"
echo "   tail -f logs/instance-2.log"
echo "   tail -f logs/instance-3.log"
echo ""
echo "🛑 Press Ctrl+C to stop all instances"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all instances..."
    kill $INSTANCE_1_PID 2>/dev/null || true
    kill $INSTANCE_2_PID 2>/dev/null || true
    kill $INSTANCE_3_PID 2>/dev/null || true
    echo "✅ All instances stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
while true; do
    sleep 1
done 