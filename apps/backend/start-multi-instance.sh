#!/bin/bash

# Multi-instance server startup script
# This script starts multiple backend instances on different ports

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

# Create logs directory if it doesn't exist
mkdir -p logs

# Wait for instances to start
echo "⏳ Waiting for instances to start..."
sleep 10

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
echo "🎯 All instances started! Running tests..."
echo ""

# Run the multi-instance test
echo "🧪 Running multi-instance tests..."
npm run test:multi-instance

# Wait for test to complete
echo ""
echo "📊 Test completed. Press Ctrl+C to stop all instances."

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

# Keep script running and show logs
echo ""
echo "📋 Instance logs (Ctrl+C to stop):"
echo "Instance 1 logs: tail -f logs/instance-1.log"
echo "Instance 2 logs: tail -f logs/instance-2.log"
echo "Instance 3 logs: tail -f logs/instance-3.log"
echo ""

# Wait for user to stop
while true; do
    sleep 1
done 