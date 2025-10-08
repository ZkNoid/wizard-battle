const { io } = require('socket.io-client');
// Mock Field class for testing (since we can't import o1js in Node.js environment)
class Field {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value.toString();
  }
}

// Human vs Human Multi-Round Test
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3030';
const TEST_ROOM_ID = `hvh_test_${Date.now()}`;

/**
 * 🥊 HUMAN VS HUMAN MULTI-ROUND TEST
 *
 * This test validates:
 * - Multiple rounds between same human players
 * - Player state synchronization across rounds
 * - Turn counter accuracy
 * - Phase progression with two human players
 * - Graceful handling of extended sessions
 */

class HumanVsHumanTester {
  constructor() {
    this.players = [];
    this.currentRound = 0;
    this.maxRounds = 8;
    this.testResults = {
      roundsCompleted: 0,
      phasesCompleted: 0,
      synchronizationErrors: 0,
      playerStats: {
        player1: { actionsSubmitted: 0, statesSubmitted: 0 },
        player2: { actionsSubmitted: 0, statesSubmitted: 0 },
      },
    };
    this.roundStartTime = 0;
  }

  async runTest() {
    console.log('🥊 Starting Human vs Human Multi-Round Test...');
    console.log(
      `📊 Target: ${this.maxRounds} rounds between two human players\n`
    );

    try {
      await this.setupPlayers();
      await this.createGameSession();
      await this.runMultipleRounds();
      this.generateReport();
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      this.cleanup();
    }
  }

  async setupPlayers() {
    console.log('👥 Setting up two human players...');

    // Create player connections
    const player1Socket = io(SERVER_URL);
    const player2Socket = io(SERVER_URL);

    this.players = [
      {
        socket: player1Socket,
        id: 'human_player_1',
        name: 'Human Player 1',
        stats: this.testResults.playerStats.player1,
      },
      {
        socket: player2Socket,
        id: 'human_player_2',
        name: 'Human Player 2',
        stats: this.testResults.playerStats.player2,
      },
    ];

    // Wait for both connections
    await Promise.all(
      this.players.map(
        (player) =>
          new Promise((resolve, reject) => {
            player.socket.on('connect', () => {
              console.log(`✅ ${player.name} connected: ${player.socket.id}`);
              resolve();
            });

            player.socket.on('connect_error', (error) => {
              console.error(`❌ ${player.name} connection failed:`, error);
              reject(error);
            });

            setTimeout(
              () => reject(new Error(`${player.name} connection timeout`)),
              10000
            );
          })
      )
    );

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.players.forEach((player, playerIndex) => {
      // Round progression
      player.socket.on('newTurn', (data) => {
        if (playerIndex === 0) {
          // Only count once per round
          this.currentRound++;
          this.roundStartTime = Date.now();
          console.log(`\n🔄 ROUND ${this.currentRound} - Phase: ${data.phase}`);

          if (this.currentRound > this.maxRounds) {
            console.log(`🎯 Target rounds reached!`);
            this.endTest();
            return;
          }
        }

        // Both players submit actions
        setTimeout(
          () => {
            this.submitPlayerActions(player, playerIndex);
          },
          1000 + playerIndex * 500
        ); // Stagger submissions slightly
      });

      // Phase 2: Spell Propagation
      player.socket.on('allPlayerActions', (allActions) => {
        if (playerIndex === 0) {
          // Only count once per phase
          this.testResults.phasesCompleted++;
        }

        console.log(
          `📋 ${player.name} received actions from ${Object.keys(allActions).length} players`
        );

        // Verify both players' actions are present
        const expectedPlayers = ['human_player_1', 'human_player_2'];
        const receivedPlayers = Object.keys(allActions);

        if (expectedPlayers.every((pid) => receivedPlayers.includes(pid))) {
          console.log("   ✅ Both players' actions synchronized correctly");
        } else {
          console.log('   ⚠️  Player synchronization issue detected');
          this.testResults.synchronizationErrors++;
        }
      });

      // Phase 3: Spell Effects
      player.socket.on('applySpellEffects', () => {
        console.log(`✨ ${player.name} applying spell effects...`);

        // Submit trusted state after processing
        setTimeout(
          () => {
            this.submitPlayerTrustedState(player, playerIndex);
          },
          2000 + playerIndex * 500
        ); // Stagger submissions
      });

      // Phase 5: State Update
      player.socket.on('updateUserStates', (data) => {
        const roundDuration = Date.now() - this.roundStartTime;
        console.log(
          `🔄 ${player.name} received state update (Round ${this.currentRound} - ${roundDuration}ms)`
        );

        if (data.states && data.states.length === 2) {
          console.log("   ✅ Both players' states synchronized");
        } else {
          console.log('   ⚠️  State synchronization issue');
          this.testResults.synchronizationErrors++;
        }

        // Mark round as completed (only count once)
        if (playerIndex === 0) {
          this.testResults.roundsCompleted = this.currentRound;
        }
      });

      // Game end detection
      player.socket.on('gameEnd', (data) => {
        console.log(
          `🏆 ${player.name} received game end - Winner: ${data.winner || 'Draw'}`
        );
        this.endTest();
      });

      // Error tracking
      player.socket.on('error', (error) => {
        console.error(`❌ ${player.name} error:`, error);
      });
    });
  }

  async createGameSession() {
    console.log('🎮 Creating game session...');

    // Create a game state for both players
    const gameStateData = {
      roomId: TEST_ROOM_ID,
      players: this.players.map((p) => ({
        id: p.id,
        socketId: p.socket.id,
      })),
    };

    // Simulate joining the same room
    this.players.forEach((player) => {
      player.socket.emit('joinRoom', {
        roomId: TEST_ROOM_ID,
        playerId: player.id,
      });
    });

    // Wait for room setup
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`✅ Game session created in room: ${TEST_ROOM_ID}`);
  }

  submitPlayerActions(player, playerIndex) {
    const spells = ['fireball', 'heal', 'lightning', 'shield'];
    const selectedSpell = spells[Math.floor(Math.random() * spells.length)];

    const actions = {
      actions: [
        {
          playerId: player.id,
          spellId: selectedSpell,
          spellCastInfo: {
            target: playerIndex === 0 ? 'human_player_2' : 'human_player_1',
            damage: Math.floor(Math.random() * 25) + 10,
            position: {
              x: Math.floor(Math.random() * 10),
              y: Math.floor(Math.random() * 10),
            },
          },
        },
      ],
      signature: `${player.id}_action_signature_${Date.now()}`,
    };

    console.log(`⚡ ${player.name} casting ${selectedSpell}`);
    player.socket.emit('submitActions', {
      roomId: TEST_ROOM_ID,
      actions: actions,
    });

    player.stats.actionsSubmitted++;
  }

  submitPlayerTrustedState(player, playerIndex) {
    // Simulate HP loss over rounds
    const baseHP = 100 - this.currentRound * 8;
    const hp = Math.max(baseHP + playerIndex * 5, 15); // Player 2 slightly more HP

    const trustedState = {
      playerId: player.id,
      stateCommit: `${player.id}_commit_${Date.now()}`,
      publicState: {
        socketId: player.socket.id,
        playerId: player.id,
        fields: [
          new Field(hp), // HP
          new Field(playerIndex * 2 + 1), // X position
          new Field(playerIndex + 1), // Y position
          ...Array(117)
            .fill(0)
            .map(() => new Field(Math.floor(Math.random() * 50))),
        ],
      },
      signature: `${player.id}_trusted_signature_${Date.now()}`,
    };

    console.log(`📝 ${player.name} submitting trusted state (HP: ${hp})`);
    player.socket.emit('submitTrustedState', {
      roomId: TEST_ROOM_ID,
      trustedState,
    });

    player.stats.statesSubmitted++;

    // Simulate game end condition
    if (this.currentRound >= 6 && hp <= 20) {
      console.log(`💀 ${player.name} simulating low HP - ending game...`);
      setTimeout(() => {
        player.socket.emit('reportDead', {
          roomId: TEST_ROOM_ID,
          playerId: player.id,
        });
      }, 1000);
    }
  }

  async runMultipleRounds() {
    console.log('🎮 Starting multi-round human vs human gameplay...\n');

    // Wait for server-driven cron/flow to start turns automatically
    // No manual startTurn emit needed with current architecture

    // Wait for game completion
    return new Promise((resolve) => {
      this.testEndResolver = resolve;

      // Safety timeout
      setTimeout(() => {
        console.log('⏰ Test timeout - ending test');
        this.endTest();
      }, 180000); // 3 minutes
    });
  }

  endTest() {
    if (this.testEndResolver) {
      this.testEndResolver();
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 HUMAN VS HUMAN MULTI-ROUND TEST RESULTS');
    console.log('='.repeat(60));

    console.log(
      `🎯 Rounds Completed: ${this.testResults.roundsCompleted}/${this.maxRounds}`
    );
    console.log(
      `🔄 Total Phases Completed: ${this.testResults.phasesCompleted}`
    );
    console.log(
      `⚠️  Synchronization Errors: ${this.testResults.synchronizationErrors}`
    );

    console.log('\n📊 PLAYER STATISTICS:');
    console.log(
      `👤 Player 1 - Actions: ${this.testResults.playerStats.player1.actionsSubmitted}, States: ${this.testResults.playerStats.player1.statesSubmitted}`
    );
    console.log(
      `👤 Player 2 - Actions: ${this.testResults.playerStats.player2.actionsSubmitted}, States: ${this.testResults.playerStats.player2.statesSubmitted}`
    );

    console.log('\n🎯 TEST ASSESSMENT:');

    if (this.testResults.roundsCompleted >= this.maxRounds * 0.75) {
      console.log('✅ PASS: Multi-round stability achieved');
    } else {
      console.log('❌ FAIL: Game ended too early');
    }

    if (this.testResults.synchronizationErrors === 0) {
      console.log('✅ PASS: Perfect player synchronization');
    } else {
      console.log(
        `⚠️  WARNING: ${this.testResults.synchronizationErrors} synchronization issues`
      );
    }

    const expectedActions = this.testResults.roundsCompleted * 2; // 2 players per round
    const actualActions =
      this.testResults.playerStats.player1.actionsSubmitted +
      this.testResults.playerStats.player2.actionsSubmitted;

    if (actualActions >= expectedActions * 0.9) {
      console.log('✅ PASS: Consistent player participation');
    } else {
      console.log('❌ FAIL: Player participation dropped over time');
    }

    console.log('\n🎉 HUMAN VS HUMAN TEST COMPLETED!');
    console.log('='.repeat(60));
  }

  cleanup() {
    this.players.forEach((player) => {
      if (player.socket) {
        player.socket.disconnect();
      }
    });
  }
}

// Run the test
async function main() {
  const tester = new HumanVsHumanTester();
  await tester.runTest();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { HumanVsHumanTester };
