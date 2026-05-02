/**
 * @title Clear Stuck Room Script
 * @notice Clears stuck rooms from Redis to fix matchmaking issues
 */

const { io } = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3030';
const STUCK_ROOM_ID = process.env.STUCK_ROOM_ID || '6969-1000787';

console.log('🧹 Clearing stuck room:', STUCK_ROOM_ID);

const socket = io(SERVER_URL, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('✅ Connected to server');

  // Clear the stuck room
  socket.emit('clearStuckRooms', { roomIds: [STUCK_ROOM_ID] });
});

socket.on('stuckRoomsCleared', (response) => {
  console.log('📥 Response:', response);

  if (response.success) {
    console.log('✅ Successfully cleared stuck room!');
  } else {
    console.log('❌ Failed to clear stuck room:', response.error);
  }

  socket.disconnect();
  process.exit(response.success ? 0 : 1);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Timeout waiting for response');
  socket.disconnect();
  process.exit(1);
}, 10000);
