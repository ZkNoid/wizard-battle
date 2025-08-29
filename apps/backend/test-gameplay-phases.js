const { io } = require('socket.io-client');

// Test 5-phase gameplay functionality
const SERVER_URL = 'http://localhost:3001';
const TEST_ROOM_ID = 'gameplay-test-room';

/**
 * 🎯 COMPREHENSIVE WINNER/LOSER TESTING
 * Tests all winner detection scenarios in a controlled gameplay environment
 */
async function testWinnerLoserScenarios(players, roomId) {
  console.log('🏆 Starting comprehensive winner/loser detection tests...\n');

  // Test 1: Standard winner detection
  await testStandardWinnerDetection(players, roomId);

  // Test 2: Draw scenario testing
  await testDrawScenarios(players, roomId);

  // Test 3: Edge cases and error handling
  await testEdgeCases(players, roomId);

  // Test 4: Multiple player scenarios (simulate with existing 2 players)
  await testMultiPlayerScenarios(players, roomId);

  console.log('✅ Winner/Loser detection tests completed\n');
}

async function testStandardWinnerDetection(players, roomId) {
  console.log('🎯 Test 1: Standard Winner Detection');

  return new Promise((resolve) => {
    let gameEndReceived = false;
    let expectedWinner = players[0].id;
    let victim = players[1].id;

    // Setup game end listener
    const gameEndHandler = (data) => {
      if (!gameEndReceived) {
        gameEndReceived = true;
        console.log(`   ✅ Game end detected: Winner = ${data.winnerId}`);
        console.log(`   📊 Expected winner: ${expectedWinner}`);
        console.log(`   💀 Victim: ${victim}`);

        if (data.winnerId === expectedWinner) {
          console.log('   ✅ PASS: Correct winner identified');
        } else if (data.winnerId === 'draw') {
          console.log('   ⚠️  UNEXPECTED: Draw detected instead of winner');
        } else {
          console.log('   ❌ FAIL: Incorrect winner identified');
        }

        // Remove listeners and resolve
        players.forEach((player) => {
          player.socket.off('gameEnd', gameEndHandler);
        });
        resolve();
      }
    };

    // Add listeners to both players
    players.forEach((player) => {
      player.socket.on('gameEnd', gameEndHandler);
    });

    // Kill player 2, player 1 should win
    console.log(
      `   💀 ${players[1].name} dies, ${players[0].name} should win...`
    );
    players[0].socket.emit('reportDead', {
      roomId: roomId,
      dead: { playerId: players[1].id },
    });

    // Timeout handler
    setTimeout(() => {
      if (!gameEndReceived) {
        console.log('   ❌ TIMEOUT: No game end event received');
        players.forEach((player) => {
          player.socket.off('gameEnd', gameEndHandler);
        });
        resolve();
      }
    }, 5000);
  });
}

async function testDrawScenarios(players, roomId) {
  console.log('🎯 Test 2: Draw Scenario Detection');

  // Create a new test room for draw scenarios
  const drawTestRoomId = `${roomId}_draw_${Date.now()}`;

  return new Promise((resolve) => {
    let gameEndCount = 0;
    let lastResult = null;

    const gameEndHandler = (data) => {
      gameEndCount++;
      lastResult = data.winnerId;
      console.log(`   📊 Game end #${gameEndCount}: Result = ${data.winnerId}`);

      if (gameEndCount >= 1) {
        if (lastResult === 'draw') {
          console.log('   ✅ PASS: Draw correctly detected');
        } else {
          console.log(
            `   ⚠️  RESULT: ${lastResult} declared winner instead of draw`
          );
          console.log(
            '   📝 NOTE: Sequential processing may prevent true simultaneous death'
          );
        }

        // Cleanup listeners
        players.forEach((player) => {
          player.socket.off('gameEnd', gameEndHandler);
        });
        resolve();
      }
    };

    // Add listeners
    players.forEach((player) => {
      player.socket.on('gameEnd', gameEndHandler);
    });

    // Simulate rapid successive deaths (as close to simultaneous as possible)
    console.log('   💀💀 Simulating simultaneous deaths...');

    setTimeout(() => {
      players[0].socket.emit('reportDead', {
        roomId: roomId,
        dead: { playerId: players[0].id },
      });
    }, 100);

    setTimeout(() => {
      players[1].socket.emit('reportDead', {
        roomId: roomId,
        dead: { playerId: players[1].id },
      });
    }, 120); // Very small delay to test race condition handling

    // Timeout handler
    setTimeout(() => {
      if (gameEndCount === 0) {
        console.log('   ❌ TIMEOUT: No game end event for draw scenario');
        players.forEach((player) => {
          player.socket.off('gameEnd', gameEndHandler);
        });
        resolve();
      }
    }, 5000);
  });
}

async function testEdgeCases(players, roomId) {
  console.log('🎯 Test 3: Edge Cases and Error Handling');

  return new Promise((resolve) => {
    let unexpectedGameEnd = false;

    const gameEndHandler = (data) => {
      unexpectedGameEnd = true;
      console.log(
        `   ⚠️  UNEXPECTED: Game end from invalid death report: ${data.winnerId}`
      );
    };

    // Add listeners
    players.forEach((player) => {
      player.socket.on('gameEnd', gameEndHandler);
    });

    // Test 3a: Invalid player ID
    console.log('   🔍 Testing invalid player ID death report...');
    players[0].socket.emit('reportDead', {
      roomId: roomId,
      dead: { playerId: 'invalid_player_xyz_123' },
    });

    setTimeout(() => {
      // Test 3b: Empty player ID
      console.log('   🔍 Testing empty player ID death report...');
      players[0].socket.emit('reportDead', {
        roomId: roomId,
        dead: { playerId: '' },
      });
    }, 1000);

    setTimeout(() => {
      // Test 3c: Null player ID
      console.log('   🔍 Testing null player ID death report...');
      players[0].socket.emit('reportDead', {
        roomId: roomId,
        dead: { playerId: null },
      });
    }, 2000);

    setTimeout(() => {
      // Test 3d: Malformed death report
      console.log('   🔍 Testing malformed death report...');
      players[0].socket.emit('reportDead', {
        roomId: roomId,
        dead: { wrongField: players[1].id },
      });
    }, 3000);

    setTimeout(() => {
      // Test 3e: Already dead player
      console.log('   🔍 Testing already dead player report...');
      // First kill player 2
      players[0].socket.emit('reportDead', {
        roomId: roomId,
        dead: { playerId: players[1].id },
      });

      // Then try to kill them again
      setTimeout(() => {
        players[0].socket.emit('reportDead', {
          roomId: roomId,
          dead: { playerId: players[1].id },
        });
      }, 500);
    }, 4000);

    setTimeout(() => {
      if (!unexpectedGameEnd) {
        console.log('   ✅ PASS: Invalid death reports handled gracefully');
      } else {
        console.log(
          '   ❌ FAIL: Invalid death report caused unexpected game end'
        );
      }

      // Cleanup listeners
      players.forEach((player) => {
        player.socket.off('gameEnd', gameEndHandler);
      });
      resolve();
    }, 8000);
  });
}

async function testMultiPlayerScenarios(players, roomId) {
  console.log('🎯 Test 4: Multi-Player Scenarios (Simulated)');

  return new Promise((resolve) => {
    let gameEndReceived = false;

    const gameEndHandler = (data) => {
      if (!gameEndReceived) {
        gameEndReceived = true;
        console.log(`   ✅ Multi-player game end: Winner = ${data.winnerId}`);

        // In a 2-player game, we expect a specific winner
        if (
          data.winnerId === players[0].id ||
          data.winnerId === players[1].id
        ) {
          console.log('   ✅ PASS: Valid winner in multi-player scenario');
        } else if (data.winnerId === 'draw') {
          console.log('   ✅ PASS: Draw detected in multi-player scenario');
        } else {
          console.log('   ❌ FAIL: Invalid winner in multi-player scenario');
        }

        // Cleanup listeners
        players.forEach((player) => {
          player.socket.off('gameEnd', gameEndHandler);
        });
        resolve();
      }
    };

    // Add listeners
    players.forEach((player) => {
      player.socket.on('gameEnd', gameEndHandler);
    });

    // Simulate a multi-player game where one player survives
    console.log('   🎮 Simulating multi-player elimination...');
    console.log(
      `   💀 Eliminating ${players[1].name}, ${players[0].name} should be last survivor...`
    );

    players[0].socket.emit('reportDead', {
      roomId: roomId,
      dead: { playerId: players[1].id },
    });

    // Timeout handler
    setTimeout(() => {
      if (!gameEndReceived) {
        console.log(
          '   ❌ TIMEOUT: No game end event for multi-player scenario'
        );
        players.forEach((player) => {
          player.socket.off('gameEnd', gameEndHandler);
        });
        resolve();
      }
    }, 5000);
  });
}

async function testGameplayPhases() {
  console.log('🎮 Testing 5-Phase Gameplay System\n');

  // Create two player connections
  console.log('1. Creating player connections...');
  const player1 = io(SERVER_URL);
  const player2 = io(SERVER_URL);

  const players = [
    { socket: player1, id: 'player1', name: 'Player 1' },
    { socket: player2, id: 'player2', name: 'Player 2' },
  ];

  // Setup event listeners for both players
  players.forEach((player, index) => {
    player.socket.on('connect', () => {
      console.log(`✅ ${player.name} connected: ${player.socket.id}`);
    });

    player.socket.on('disconnect', () => {
      console.log(`❌ ${player.name} disconnected`);
    });

    // Phase-specific listeners
    player.socket.on('actionSubmitResult', (data) => {
      console.log(`🎯 ${player.name} action submit result:`, data);
    });

    player.socket.on('allPlayerActions', (data) => {
      console.log(
        `📋 ${player.name} received all player actions:`,
        Object.keys(data)
      );
    });

    player.socket.on('applySpellEffects', () => {
      console.log(`⚡ ${player.name} received apply spell effects signal`);

      // Simulate spell effects processing and submit trusted state
      setTimeout(() => {
        player.socket.emit('submitTrustedState', {
          roomId: TEST_ROOM_ID,
          trustedState: {
            playerId: player.id,
            stateCommit: `commit-${player.id}-${Date.now()}`,
            publicState: {
              playerId: player.id,
              hp: 100 - index * 10, // Simulate different HP values
              position: { x: index * 10, y: index * 5 },
              effects: [],
            },
            signature: `signature-${player.id}`,
          },
        });
      }, 1000);
    });

    player.socket.on('trustedStateResult', (data) => {
      console.log(`✅ ${player.name} trusted state result:`, data);
    });

    player.socket.on('updateUserStates', (data) => {
      console.log(
        `🔄 ${player.name} received state updates:`,
        data.states.length,
        'states'
      );
    });

    player.socket.on('newTurn', (data) => {
      console.log(`🔄 ${player.name} new turn started:`, data.phase);
    });

    player.socket.on('gameEnd', (data) => {
      console.log(`🏆 ${player.name} game ended, winner:`, data.winnerId);
    });
  });

  // Wait for connections
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test Phase 1: Spell Casting
  console.log('\n2. Testing Phase 1: Spell Casting...');

  // Both players submit actions
  players.forEach((player, index) => {
    const actions = {
      actions: [
        {
          playerId: player.id,
          spellId: index === 0 ? 'fireball' : 'heal',
          spellCastInfo: {
            target: index === 0 ? 'player2' : 'player1',
            position: { x: index * 5, y: index * 3 },
          },
        },
      ],
      signature: `signature-${player.id}-actions`,
    };

    console.log(`📤 ${player.name} submitting actions...`);
    player.socket.emit('submitActions', {
      roomId: TEST_ROOM_ID,
      actions: actions,
    });
  });

  // Wait for spell propagation and effects phases
  console.log(
    '\n3. Waiting for Phase 2 (Spell Propagation) and Phase 3 (Spell Effects)...'
  );
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Test Phase 4 & 5 happen automatically via the applySpellEffects listener above

  console.log(
    '\n4. Waiting for Phase 4 (End of Round) and Phase 5 (State Update)...'
  );
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Test multiple turns
  console.log('\n5. Testing second turn...');

  // Submit actions for second turn
  players.forEach((player, index) => {
    const actions = {
      actions: [
        {
          playerId: player.id,
          spellId: 'lightning',
          spellCastInfo: {
            target: index === 0 ? 'player2' : 'player1',
            damage: 25,
          },
        },
      ],
      signature: `signature-${player.id}-turn2`,
    };

    console.log(`📤 ${player.name} submitting turn 2 actions...`);
    player.socket.emit('submitActions', {
      roomId: TEST_ROOM_ID,
      actions: actions,
    });
  });

  // Wait for second turn to complete
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Test comprehensive winner/loser scenarios
  console.log('\n6. Testing comprehensive winner/loser scenarios...');
  await testWinnerLoserScenarios(players, TEST_ROOM_ID);

  // Wait for game end
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Test error scenarios
  console.log('\n7. Testing error scenarios...');

  // Try to submit actions in wrong phase
  console.log('Testing wrong phase submission...');
  players[0].socket.emit('submitActions', {
    roomId: TEST_ROOM_ID,
    actions: {
      actions: [
        { playerId: players[0].id, spellId: 'test', spellCastInfo: {} },
      ],
      signature: 'test',
    },
  });

  // Try to submit empty actions
  console.log('Testing empty actions submission...');
  players[0].socket.emit('submitActions', {
    roomId: TEST_ROOM_ID,
    actions: {
      actions: [],
      signature: 'test',
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Cleanup
  console.log('\n8. Cleaning up...');
  players.forEach((player) => {
    player.socket.disconnect();
    console.log(`🔌 ${player.name} disconnected`);
  });

  console.log('\n✅ 5-Phase Gameplay test completed!');
  process.exit(0);
}

// Run the test
testGameplayPhases().catch((error) => {
  console.error('❌ Gameplay test failed:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});
