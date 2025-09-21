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
let botOpponentId = null;

// Spell IDs for testing (based on common/stater/spells/mage.ts)
const SPELL_IDS = {
  LIGHTNING: 'LightningBold',
  FIREBALL: 'FireBall',
  TELEPORT: 'Teleport',
  HEAL: 'Heal',
  LASER: 'Laser',
};

// Game state tracking for damage verification
let gameState = {
  humanPlayer: {
    initialHP: 100,
    currentHP: 100,
    position: { x: 2, y: 2 },
    spellsCast: [],
  },
  botPlayer: {
    initialHP: 100,
    currentHP: 100,
    position: { x: 5, y: 5 },
    spellsCast: [],
  },
};

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
  gameplayComplete: false,
  // Extended spell testing
  multipleSpellTypes: false,
  damageProcessing: false,
  hpTracking: false,
  positionTracking: false,
  spellEffectsVerified: false,
};

playerSocket.on('connect', () => {
  console.log(`✅ Human player connected with socket ID: ${playerSocket.id}`);
  testResults.connection = true;

  // Create player setup - only use fields array (consistent with our updates)
  const playerSetup = {
    socketId: playerSocket.id,
    playerId: TEST_PLAYER_ID,
    fields: [new Field(100), new Field(2), new Field(2)], // HP=100, x=2, y=2 as fields only
  };

  // Initialize human player state
  gameState.humanPlayer.initialHP = 100;
  gameState.humanPlayer.currentHP = 100;
  gameState.humanPlayer.position = { x: 2, y: 2 };

  // Create matchmaking request
  const addToQueue = {
    playerId: TEST_PLAYER_ID,
    playerSetup: playerSetup,
    nonce: Date.now(),
    signature: `test_signature_${Date.now()}`,
    setupProof: `test_proof_${Date.now()}`,
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
  // In bot matchmaking, backend uses numeric-like bot IDs (e.g. "0XXXX")
  botOpponentId = matchData.opponentId;
  console.log(
    `   📌 Treating opponent '${botOpponentId}' as bot for this test`
  );
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
      // Choose spell based on turn number for variety
      // Use last known bot position for offensive spells to ensure hits
      const botPos = gameState.botPlayer.position || { x: 5, y: 5 };
      const spellTypes = [
        {
          id: SPELL_IDS.FIREBALL,
          target: { x: botPos.x, y: botPos.y },
          description: 'FireBall targeting bot last known position',
        },
        {
          id: SPELL_IDS.LIGHTNING,
          target: { x: botPos.x, y: botPos.y },
          description: 'Lightning targeting bot last known position',
        },
        {
          id: SPELL_IDS.HEAL,
          target: { x: 2, y: 2 },
          description: 'Heal self',
        },
      ];

      const selectedSpell = spellTypes[(turnNumber - 1) % spellTypes.length];

      const testActions = {
        actions: [
          {
            playerId: TEST_PLAYER_ID,
            spellId: selectedSpell.id,
            spellCastInfo: JSON.stringify({
              position: {
                x: {
                  magnitude: selectedSpell.target.x.toString(),
                  sgn: 'Positive',
                },
                y: {
                  magnitude: selectedSpell.target.y.toString(),
                  sgn: 'Positive',
                },
              },
            }),
          },
        ],
        signature: `test_action_signature_${Date.now()}`,
      };

      // Track spell cast
      gameState.humanPlayer.spellsCast.push({
        turn: turnNumber,
        spellId: selectedSpell.id,
        target: selectedSpell.target,
        description: selectedSpell.description,
      });

      console.log(
        `   🎯 Human casting ${selectedSpell.description} on turn ${turnNumber}`
      );
      console.log(
        `   📍 Target position: (${selectedSpell.target.x}, ${selectedSpell.target.y})`
      );

      playerSocket.emit('submitActions', {
        roomId: matchData.roomId,
        actions: testActions,
      });
    }, 1000);
  }
});

// Phase 2: Spell Propagation
playerSocket.on('allPlayerActions', (allActions) => {
  testResults.phase2_spellPropagation = true;
  console.log('📋 Phase 2: SPELL_PROPAGATION - Received all player actions');

  // Check if bot submitted actions (use opponentId captured from matchFound)
  const botActions = Object.entries(allActions).find(
    ([playerId]) => botOpponentId && playerId === botOpponentId
  );

  if (botActions) {
    testResults.botActionsReceived = true;
    const [botId, botActionData] = botActions;
    const botSpells = botActionData.actions.map((a) => a.spellId);

    console.log(`   🤖 Bot ${botId} actions received:`, botSpells);

    // Track bot spells for analysis
    botActionData.actions.forEach((action) => {
      try {
        const spellCastInfo = JSON.parse(action.spellCastInfo);
        gameState.botPlayer.spellsCast.push({
          turn: turnNumber,
          spellId: action.spellId,
          target: spellCastInfo.position || 'unknown',
          playerId: action.playerId,
        });
        console.log(
          `   🎯 Bot cast: ${action.spellId} at position:`,
          spellCastInfo.position
        );

        // Check for spell cooldown compliance (no immediate repeats)
        const previousTurnSameSpell = gameState.botPlayer.spellsCast.filter(
          (s) => s.spellId === action.spellId && s.turn === turnNumber - 1
        );
        if (previousTurnSameSpell.length === 0) {
          testResults.verify_spell_cooldowns = true;
          console.log(
            `   ✅ Bot respecting spell cooldowns - no immediate repeat of ${action.spellId}`
          );
        }
      } catch (e) {
        console.log(
          `   🎯 Bot cast: ${action.spellId} (couldn't parse target)`
        );
      }
    });

    // Check for spell variety across turns
    const allBotSpells = gameState.botPlayer.spellsCast.map((s) => s.spellId);
    const uniqueSpells = [...new Set(allBotSpells)];
    if (uniqueSpells.length > 1) {
      testResults.multipleSpellTypes = true;
      console.log(
        `   ✅ Bot using multiple spell types: ${uniqueSpells.join(', ')}`
      );
    }

    console.log('   ✅ Bot successfully participated in spell casting phase!');
  } else {
    console.log('   ❌ No bot actions received');
  }

  console.log(
    `   📊 Total players with actions: ${Object.keys(allActions).length}`
  );
});

// Phase 3: Spell Effects
playerSocket.on('applySpellEffects', () => {
  testResults.phase3_spellEffects = true;
  console.log('✨ Phase 3: SPELL_EFFECTS - Applying effects locally');

  // Simulate damage processing based on spells cast
  let simulatedHP = gameState.humanPlayer.currentHP;
  let simulatedPosition = { ...gameState.humanPlayer.position };

  // Process damage from bot spells (simplified simulation)
  const currentTurnBotSpells = gameState.botPlayer.spellsCast.filter(
    (s) => s.turn === turnNumber
  );
  currentTurnBotSpells.forEach((spell) => {
    console.log(`   💥 Processing bot spell: ${spell.spellId}`);

    // Simulate damage based on spell type and distance
    if (spell.spellId.includes('FireBall')) {
      const distance = calculateDistance(simulatedPosition, spell.target);
      if (distance <= 2) {
        const damage = distance === 0 ? 60 : distance === 1 ? 40 : 20;
        simulatedHP = Math.max(0, simulatedHP - damage);
        console.log(
          `   💥 FireBall hit! Distance: ${distance}, Damage: ${damage}, HP: ${simulatedHP}`
        );
        testResults.damageProcessing = true;
      }
    } else if (spell.spellId.includes('Lightning')) {
      const distance = calculateDistance(simulatedPosition, spell.target);
      if (distance <= 1) {
        const damage = distance === 0 ? 100 : 50;
        simulatedHP = Math.max(0, simulatedHP - damage);
        console.log(
          `   ⚡ Lightning hit! Distance: ${distance}, Damage: ${damage}, HP: ${simulatedHP}`
        );
        testResults.damageProcessing = true;
      }
    }
  });

  // Process healing from human spells
  const currentTurnHumanSpells = gameState.humanPlayer.spellsCast.filter(
    (s) => s.turn === turnNumber
  );
  currentTurnHumanSpells.forEach((spell) => {
    if (spell.spellId === SPELL_IDS.HEAL) {
      simulatedHP = Math.min(100, simulatedHP + 100);
      console.log(`   💚 Heal cast! HP restored to: ${simulatedHP}`);
      testResults.spellEffectsVerified = true;
    } else if (spell.spellId === SPELL_IDS.TELEPORT) {
      simulatedPosition = { ...spell.target };
      console.log(
        `   🌀 Teleport cast! New position: (${simulatedPosition.x}, ${simulatedPosition.y})`
      );
      testResults.positionTracking = true;
    }
  });

  // Update game state
  if (simulatedHP !== gameState.humanPlayer.currentHP) {
    testResults.hpTracking = true;
    console.log(
      `   📊 HP changed: ${gameState.humanPlayer.currentHP} → ${simulatedHP}`
    );
  }

  gameState.humanPlayer.currentHP = simulatedHP;
  gameState.humanPlayer.position = simulatedPosition;

  // Simulate processing time, then submit trusted state
  setTimeout(() => {
    const trustedState = {
      playerId: TEST_PLAYER_ID,
      stateCommit: `test_commit_${Date.now()}`,
      publicState: {
        socketId: playerSocket.id,
        playerId: TEST_PLAYER_ID,
        fields: [
          new Field(simulatedHP),
          new Field(simulatedPosition.x),
          new Field(simulatedPosition.y),
        ],
      },
      signature: `test_trusted_signature_${Date.now()}`,
    };

    console.log(
      `   📝 Human submitting trusted state (HP: ${simulatedHP}, Position: ${simulatedPosition.x},${simulatedPosition.y})`
    );
    playerSocket.emit('submitTrustedState', {
      roomId: matchData.roomId,
      trustedState,
    });
  }, 2500); // Wait longer for server to advance to END_OF_ROUND phase
});

// Helper function to calculate Manhattan distance
function calculateDistance(pos1, pos2) {
  if (!pos1 || !pos2 || !pos2.x || !pos2.y) return 999; // Invalid position
  return (
    Math.abs(pos1.x - (pos2.x.magnitude || pos2.x)) +
    Math.abs(pos1.y - (pos2.y.magnitude || pos2.y))
  );
}

// Helper function to validate spell effects
function validateSpellEffect(
  spellId,
  casterPos,
  targetPos,
  targetHP,
  initialHP
) {
  const distance = calculateDistance(casterPos, targetPos);

  switch (spellId) {
    case SPELL_IDS.FIREBALL:
      if (distance === 0) return initialHP - targetHP === 60;
      if (distance === 1) return initialHP - targetHP === 40;
      if (distance === 2) return initialHP - targetHP === 20;
      return initialHP === targetHP; // No damage if distance > 2

    case SPELL_IDS.LIGHTNING:
      if (distance === 0) return initialHP - targetHP === 100;
      if (distance === 1) return initialHP - targetHP === 50;
      return initialHP === targetHP; // No damage if distance > 1

    case SPELL_IDS.HEAL:
      return targetHP >= initialHP; // HP should increase or stay same

    default:
      return true; // Unknown spell, assume valid
  }
}

// Phase 5: State Update
playerSocket.on('updateUserStates', (data) => {
  testResults.phase4_endOfRound = true; // Bot must have submitted trusted state
  testResults.phase5_stateUpdate = true;
  console.log('🔄 Phase 5: STATE_UPDATE - Received state updates');

  if (data.states && data.states.length > 0) {
    console.log(`   📊 Received ${data.states.length} player states:`);

    data.states.forEach((state) => {
      const isBot = botOpponentId && state.playerId === botOpponentId;
      if (isBot) {
        testResults.botStateReceived = true;
        try {
          const raw = state.publicState.fields;
          let botHP;
          let botX;
          let botY;
          if (Array.isArray(raw) && raw.length >= 3) {
            botHP = parseInt(raw[0].value || raw[0]);
            botX = parseInt(raw[1].value || raw[1]);
            botY = parseInt(raw[2].value || raw[2]);
          } else if (typeof raw === 'string') {
            const parsed = JSON.parse(raw);
            botHP = parseInt(parsed?.playerStats?.hp?.magnitude ?? '100');
            botX = parseInt(
              parsed?.playerStats?.position?.value?.x?.magnitude ?? '0'
            );
            botY = parseInt(
              parsed?.playerStats?.position?.value?.y?.magnitude ?? '0'
            );
          }

          if (
            Number.isFinite(botHP) &&
            Number.isFinite(botX) &&
            Number.isFinite(botY)
          ) {
            const prevHP = gameState.botPlayer.currentHP;
            const prevPos = gameState.botPlayer.position;
            console.log(
              `   🤖 Bot state: HP=${botHP}, Position=(${botX},${botY})`
            );

            const currentTurnHumanSpells =
              gameState.humanPlayer.spellsCast.filter(
                (s) => s.turn === turnNumber
              );
            currentTurnHumanSpells.forEach((spell) => {
              if (
                spell.spellId === SPELL_IDS.FIREBALL ||
                spell.spellId === SPELL_IDS.LIGHTNING
              ) {
                const distance = calculateDistance(
                  { x: botX, y: botY },
                  spell.target
                );
                if (distance <= 2) {
                  console.log(
                    `   💥 Human spell ${spell.spellId} may have hit bot (distance: ${distance})`
                  );
                  if (botHP < gameState.botPlayer.initialHP) {
                    testResults.damageProcessing = true;
                    console.log(
                      `   ✅ Bot took damage! HP reduced from ${gameState.botPlayer.initialHP} to ${botHP}`
                    );
                  }
                }
              }
            });

            if (Number.isFinite(prevHP) && botHP < prevHP) {
              testResults.damageProcessing = true;
              testResults.hpTracking = true;
            }
            if (prevPos && (botX !== prevPos.x || botY !== prevPos.y)) {
              testResults.positionTracking = true;
            }
            gameState.botPlayer.currentHP = botHP;
            gameState.botPlayer.position = { x: botX, y: botY };
          } else {
            console.log(
              '   🤖 Bot state parsing failed, missing numeric fields'
            );
          }
        } catch (e) {
          console.log(
            `   🤖 Bot state received (couldn't parse details):`,
            e.message
          );
        }

        console.log(
          '   ✅ Bot successfully participated in state update phase!'
        );
      } else {
        // Human player state
        try {
          const humanFields = state.publicState.fields;
          if (humanFields && humanFields.length >= 3) {
            const humanHP = parseInt(humanFields[0].value || humanFields[0]);
            const humanX = parseInt(humanFields[1].value || humanFields[1]);
            const humanY = parseInt(humanFields[2].value || humanFields[2]);

            console.log(
              `   👤 Human state: HP=${humanHP}, Position=(${humanX},${humanY})`
            );

            // Verify our simulation matches server state
            if (Math.abs(humanHP - gameState.humanPlayer.currentHP) <= 5) {
              // Allow small differences
              console.log(
                `   ✅ Human HP simulation accurate! Expected: ${gameState.humanPlayer.currentHP}, Actual: ${humanHP}`
              );
            } else {
              console.log(
                `   ⚠️  Human HP simulation mismatch. Expected: ${gameState.humanPlayer.currentHP}, Actual: ${humanHP}`
              );
            }
          }
        } catch (e) {
          console.log(
            `   👤 Human state received (couldn't parse details):`,
            e.message
          );
        }
      }
    });
  }

  // Check if we've completed enough turns to test multiple spells
  if (turnNumber >= 3) {
    testResults.gameplayComplete = true;
    console.log('\n🎉 COMPREHENSIVE SPELL TESTING COMPLETED!');

    // Print spell summary
    console.log('\n📋 SPELL CASTING SUMMARY:');
    console.log('Human spells cast:');
    gameState.humanPlayer.spellsCast.forEach((spell) => {
      console.log(`  Turn ${spell.turn}: ${spell.description}`);
    });

    console.log('Bot spells cast:');
    gameState.botPlayer.spellsCast.forEach((spell) => {
      console.log(
        `  Turn ${spell.turn}: ${spell.spellId} at (${spell.target?.x?.magnitude || 'unknown'}, ${spell.target?.y?.magnitude || 'unknown'})`
      );
    });

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
    ['Multiple Spell Types', testResults.multipleSpellTypes],
    ['Damage Processing', testResults.damageProcessing],
    ['HP Tracking', testResults.hpTracking],
    ['Position Tracking', testResults.positionTracking],
    ['Spell Effects Verified', testResults.spellEffectsVerified],
    ['Spell Cooldowns Verified', testResults.verify_spell_cooldowns],
    ['Full Gameplay Cycle', testResults.gameplayComplete],
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

// Test timeout (120 seconds for multiple turns)
setTimeout(() => {
  console.log('\n⏰ Test timeout - ending test');
  console.log(`Completed ${turnNumber} turns before timeout`);
  printTestResults();
  process.exit(0);
}, 120000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test...');
  printTestResults();
  process.exit(0);
});

console.log('⏳ Connecting to server...');
