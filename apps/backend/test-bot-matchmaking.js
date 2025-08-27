/**
 * @title Bot Matchmaking Test Script
 * @notice Simple test script to verify bot matchmaking functionality
 * @dev Creates a human player client and requests bot matchmaking
 */

const { io } = require('socket.io-client');

// Mock Field class for testing
class MockField {
  constructor(value) {
    this.value = value;
  }
}

const Field = MockField;

// Test configuration
const SERVER_URL = 'http://localhost:3030';
const TEST_PLAYER_ID = `test_player_${Date.now()}`;
let matchData = null;

console.log('🧪 Starting Bot Matchmaking Test...');
console.log(`Player ID: ${TEST_PLAYER_ID}`);

// Create human player client
const playerSocket = io(SERVER_URL, {
  transports: ['websocket'],
  timeout: 5000,
});

playerSocket.on('connect', () => {
  console.log(`✅ Human player connected with socket ID: ${playerSocket.id}`);
  
  // Create player setup
  const playerSetup = {
    socketId: playerSocket.id,
    playerId: TEST_PLAYER_ID,
    fields: [new Field(100), new Field(2), new Field(2)], // HP=100, x=2, y=2
    hp: 100,
    position: { x: 2, y: 2 },
    effects: []
  };

  // Create matchmaking request
  const addToQueue = {
    playerId: TEST_PLAYER_ID,
    playerSetup: playerSetup,
    nonce: Date.now(),
    signature: `test_signature_${Date.now()}`,
    setupProof: `test_proof_${Date.now()}`
  };

  console.log('🤖 Requesting bot matchmaking...');
  
  // Request bot matchmaking
  playerSocket.emit('joinBotMatchmaking', { addToQueue });
});

playerSocket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
  process.exit(1);
});

playerSocket.on('addtoqueue', (response) => {
  console.log('📥 Add to queue response:', response);
  
  if (response.success) {
    console.log('✅ Successfully joined bot matchmaking!');
  } else {
    console.error('❌ Failed to join bot matchmaking:', response.result);
    process.exit(1);
  }
});

playerSocket.on('matchFound', (data) => {
  matchData = data;
  console.log('🎯 Match found!', matchData);
  console.log(`Room ID: ${matchData.roomId}`);
  console.log(`Opponent: ${matchData.opponentId}`);
  
  if (matchData.opponentId.startsWith('bot_')) {
    console.log('🤖 Successfully matched with a bot!');
  } else {
    console.log('⚠️  Matched with a human player instead of bot');
  }
});

playerSocket.on('newTurn', (data) => {
  console.log('🔄 New turn started:', data);
  
  if (data.phase === 'spell_casting') {
    console.log('⚡ Spell casting phase - both players should submit actions');
    
    // Submit test actions after a short delay
    setTimeout(() => {
      const testActions = {
        actions: [{
          playerId: TEST_PLAYER_ID,
          spellId: 'fireball',
          spellCastInfo: {
            target: { x: 5, y: 5 },
            targetPlayerId: null
          }
        }],
        signature: `test_action_signature_${Date.now()}`
      };
      
      console.log('🎯 Submitting test actions...');
      playerSocket.emit('submitActions', {
        roomId: matchData.roomId,
        actions: testActions
      });
    }, 1000);
  }
});

playerSocket.on('allPlayerActions', (allActions) => {
  console.log('📋 Received all player actions:', allActions);
  console.log('🤖 Bot should have also submitted actions!');
});

playerSocket.on('applySpellEffects', () => {
  console.log('✨ Applying spell effects phase');
  
  // Simulate trusted state submission
  setTimeout(() => {
    const trustedState = {
      playerId: TEST_PLAYER_ID,
      stateCommit: `test_commit_${Date.now()}`,
      publicState: {
        socketId: playerSocket.id,
        playerId: TEST_PLAYER_ID,
        fields: [new Field(90), new Field(3), new Field(3)], // Simulated damage and movement
        hp: 90,
        position: { x: 3, y: 3 },
        effects: []
      },
      signature: `test_trusted_signature_${Date.now()}`
    };
    
    console.log('📝 Submitting trusted state...');
    playerSocket.emit('submitTrustedState', {
      roomId: matchData.roomId,
      trustedState
    });
  }, 1000);
});

playerSocket.on('updateUserStates', (data) => {
  console.log('🔄 User states updated:', data);
  console.log('🤖 Bot state should be included in the update!');
});

playerSocket.on('gameEnd', (data) => {
  console.log('🏁 Game ended:', data);
  
  if (data.winnerId === TEST_PLAYER_ID) {
    console.log('🏆 Human player won!');
  } else if (data.winnerId.startsWith('bot_')) {
    console.log('🤖 Bot won!');
  }
  
  console.log('✅ Bot matchmaking test completed successfully!');
  process.exit(0);
});

// Test timeout
setTimeout(() => {
  console.log('⏰ Test timeout - ending test');
  playerSocket.disconnect();
  process.exit(0);
}, 60000); // 60 second timeout

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test...');
  playerSocket.disconnect();
  process.exit(0);
});

console.log('⏳ Connecting to server...');
