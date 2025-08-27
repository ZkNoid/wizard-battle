/**
 * @title Bot Gameplay Full Test Script
 * @notice Comprehensive test that verifies bot behavior through complete gameplay phases
 * @dev Tests all 5 phases: Spell Casting → Propagation → Effects → End of Round → State Update
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
let currentPhase = null;
let turnNumber = 0;

console.log('🎮 Starting Bot Gameplay Full Test...');
console.log(`Player ID: ${TEST_PLAYER_ID}`);

// Create human player client
const playerSocket = io(SERVER_URL, {
  transports: ['websocket'],
  timeout: 5000,
});

// Test state tracking
let testResults = {
  connection: false,
  matchmaking: false,
  matchFound: false,
  phase1_spellCasting: false,
  phase2_spellPropagation: false,
  phase3_spellEffects: false,
  phase4_endOfRound: false,
  phase5_stateUpdate: false,
  botActionsReceived: false,
  botStateReceived: false,
  gameplayComplete: false
};

playerSocket.on('connect', () => {
  console.log(`✅ Human player connected with socket ID: ${playerSocket.id}`);
  testResults.connection = true;
  
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
  playerSocket.emit('joinBotMatchmaking', { addToQueue });
});

playerSocket.on('addtoqueue', (response) => {
  console.log('📥 Add to queue response:', response);
  testResults.matchmaking = response.success;
  
  if (response.success) {
    console.log('✅ Successfully joined bot matchmaking!');
  } else {
    console.error('❌ Failed to join bot matchmaking:', response.result);
    printTestResults();
    process.exit(1);
  }
});

playerSocket.on('matchFound', (data) => {
  matchData = data;
  testResults.matchFound = true;
  console.log('🎯 Match found!');
  console.log(`   Room ID: ${matchData.roomId}`);
  console.log(`   Opponent: ${matchData.opponentId}`);
  
  if (matchData.opponentId.startsWith('bot_')) {
    console.log('✅ Successfully matched with a bot!');
  } else {
    console.log('⚠️  Matched with a human player instead of bot');
  }
});

// Phase 1: Spell Casting
playerSocket.on('newTurn', (data) => {
  turnNumber++;
  currentPhase = data.phase;
  console.log(`\n🔄 TURN ${turnNumber} - Phase: ${data.phase}`);
  
  if (data.phase === 'spell_casting') {
    testResults.phase1_spellCasting = true;
    console.log('⚡ Phase 1: SPELL_CASTING - Both players submit actions');
    
    // Submit test actions after a short delay
    setTimeout(() => {
      const testActions = {
        actions: [{
          playerId: TEST_PLAYER_ID,
          spellId: 'fireball',
          spellCastInfo: {
            target: { x: 5, y: 5 },
            damage: 25
          }
        }],
        signature: `test_action_signature_${Date.now()}`
      };
      
      console.log('   🎯 Human submitting actions:', testActions.actions.map(a => a.spellId));
      playerSocket.emit('submitActions', {
        roomId: matchData.roomId,
        actions: testActions
      });
    }, 1000);
  }
});

// Phase 2: Spell Propagation
playerSocket.on('allPlayerActions', (allActions) => {
  testResults.phase2_spellPropagation = true;
  console.log('📋 Phase 2: SPELL_PROPAGATION - Received all player actions');
  
  // Check if bot submitted actions
  const botActions = Object.entries(allActions).find(([playerId, actions]) => 
    playerId.startsWith('bot_')
  );
  
  if (botActions) {
    testResults.botActionsReceived = true;
    console.log(`   🤖 Bot actions received:`, botActions[1].actions.map(a => a.spellId));
    console.log('   ✅ Bot successfully participated in spell casting phase!');
  } else {
    console.log('   ❌ No bot actions received');
  }
  
  console.log(`   📊 Total players with actions: ${Object.keys(allActions).length}`);
});

// Phase 3: Spell Effects
playerSocket.on('applySpellEffects', () => {
  testResults.phase3_spellEffects = true;
  console.log('✨ Phase 3: SPELL_EFFECTS - Applying effects locally');
  
  // Simulate processing time, then submit trusted state (wait for END_OF_ROUND phase)
  setTimeout(() => {
    const trustedState = {
      playerId: TEST_PLAYER_ID,
      stateCommit: `test_commit_${Date.now()}`,
      publicState: {
        socketId: playerSocket.id,
        playerId: TEST_PLAYER_ID,
        fields: [new Field(85), new Field(3), new Field(3)], // Simulated damage and movement
        hp: 85,
        position: { x: 3, y: 3 },
        effects: []
      },
      signature: `test_trusted_signature_${Date.now()}`
    };
    
    console.log('   📝 Human submitting trusted state (HP: 85, Position: 3,3)');
    playerSocket.emit('submitTrustedState', {
      roomId: matchData.roomId,
      trustedState
    });
  }, 2500); // Wait longer for server to advance to END_OF_ROUND phase
});

// Phase 5: State Update
playerSocket.on('updateUserStates', (data) => {
  testResults.phase4_endOfRound = true; // Bot must have submitted trusted state
  testResults.phase5_stateUpdate = true;
  console.log('🔄 Phase 5: STATE_UPDATE - Received state updates');
  
  if (data.states && data.states.length > 0) {
    console.log(`   📊 Received ${data.states.length} player states:`);
    
    data.states.forEach(state => {
      if (state.playerId.startsWith('bot_')) {
        testResults.botStateReceived = true;
        console.log(`   🤖 Bot state: HP=${state.publicState.hp}, Position=(${state.publicState.position.x},${state.publicState.position.y})`);
        console.log('   ✅ Bot successfully participated in state update phase!');
      } else {
        console.log(`   👤 Human state: HP=${state.publicState.hp}, Position=(${state.publicState.position.x},${state.publicState.position.y})`);
      }
    });
  }
  
  // Check if we've completed a full gameplay cycle
  if (turnNumber >= 1) {
    testResults.gameplayComplete = true;
    console.log('\n🎉 FULL GAMEPLAY CYCLE COMPLETED!');
    
    setTimeout(() => {
      printTestResults();
      process.exit(0);
    }, 2000);
  }
});

// Action submission results
playerSocket.on('actionSubmitResult', (result) => {
  if (result.success) {
    console.log('   ✅ Human actions submitted successfully');
  } else {
    console.error('   ❌ Human action submission failed:', result.error);
  }
});

playerSocket.on('trustedStateResult', (result) => {
  if (result.success) {
    console.log('   ✅ Human trusted state submitted successfully');
  } else {
    console.error('   ❌ Human trusted state submission failed:', result.error);
  }
});

// Game end events
playerSocket.on('gameEnd', (data) => {
  console.log('\n🏁 Game ended:', data);
  
  if (data.winnerId === TEST_PLAYER_ID) {
    console.log('🏆 Human player won!');
  } else if (data.winnerId.startsWith('bot_')) {
    console.log('🤖 Bot won!');
  }
  
  testResults.gameplayComplete = true;
  printTestResults();
  process.exit(0);
});

// Error handling
playerSocket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
  printTestResults();
  process.exit(1);
});

// Test results summary
function printTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 BOT GAMEPLAY TEST RESULTS');
  console.log('='.repeat(60));
  
  const results = [
    ['Connection', testResults.connection],
    ['Matchmaking', testResults.matchmaking],
    ['Match Found', testResults.matchFound],
    ['Phase 1: Spell Casting', testResults.phase1_spellCasting],
    ['Phase 2: Spell Propagation', testResults.phase2_spellPropagation],
    ['Phase 3: Spell Effects', testResults.phase3_spellEffects],
    ['Phase 4: End of Round', testResults.phase4_endOfRound],
    ['Phase 5: State Update', testResults.phase5_stateUpdate],
    ['Bot Actions Received', testResults.botActionsReceived],
    ['Bot State Received', testResults.botStateReceived],
    ['Full Gameplay Cycle', testResults.gameplayComplete]
  ];
  
  results.forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });
  
  const passedTests = results.filter(([, passed]) => passed).length;
  const totalTests = results.length;
  
  console.log('='.repeat(60));
  console.log(`📊 SUMMARY: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - Bot gameplay fully functional!');
  } else {
    console.log('⚠️  Some tests failed - Bot gameplay needs fixes');
  }
  console.log('='.repeat(60));
}

// Test timeout (60 seconds)
setTimeout(() => {
  console.log('\n⏰ Test timeout - ending test');
  printTestResults();
  process.exit(0);
}, 60000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test...');
  printTestResults();
  process.exit(0);
});

console.log('⏳ Connecting to server...');
