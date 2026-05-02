/**
 * @title Direct Redis Clear Script
 * @notice Directly clears stuck rooms from Redis
 */

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const STUCK_ROOM_ID = process.env.STUCK_ROOM_ID || '6969-1000787';

console.log('🧹 Clearing stuck room from Redis:', STUCK_ROOM_ID);

async function clearStuckRoom() {
  const client = createClient({ url: REDIS_URL });

  try {
    await client.connect();
    console.log('✅ Connected to Redis');

    // Remove from matches hash
    const matchRemoved = await client.hDel('matches', STUCK_ROOM_ID);
    console.log('🗑️ Removed from matches:', matchRemoved ? 'Yes' : 'No');

    // Remove from game_states hash
    const stateRemoved = await client.hDel('game_states', STUCK_ROOM_ID);
    console.log('🗑️ Removed from game_states:', stateRemoved ? 'Yes' : 'No');

    // Check remaining rooms
    const remainingMatches = await client.hKeys('matches');
    const remainingStates = await client.hKeys('game_states');

    console.log('📊 Remaining matches:', remainingMatches.length);
    console.log('📊 Remaining game states:', remainingStates.length);

    if (remainingMatches.length > 0) {
      console.log('🏠 Remaining rooms:', remainingMatches.join(', '));
    }

    console.log('✅ Successfully cleared stuck room!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

clearStuckRoom();
