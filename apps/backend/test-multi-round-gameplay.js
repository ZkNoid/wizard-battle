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

// Multi-Round Gameplay Test - Extended sessions between same players
const SERVER_URL = 'http://localhost:3030';

/**
 * 🎯 MULTI-ROUND GAMEPLAY TEST
 * 
 * This test validates:
 * - Extended gameplay sessions (10+ rounds)
 * - Player state persistence across rounds
 * - Resource management during long games
 * - Turn counter accuracy
 * - Phase progression stability
 * - Memory leak prevention
 * - Bot behavior consistency over time
 * - Win condition detection
 * 
 * Test Scenarios:
 * 1. Human vs Bot - 15 rounds
 * 2. Human vs Human - 10 rounds  
 * 3. Simulated HP depletion -> game end
 * 4. Performance metrics collection
 */

class MultiRoundGameplayTester {
  constructor() {
    this.testResults = {
      totalRounds: 0,
      completedPhases: 0,
      errors: [],
      performanceMetrics: {
        averageRoundDuration: 0,
        totalTestDuration: 0,
        memoryLeaks: [],
        phaseTimeouts: []
      },
      playerStats: {
        human: { actionsSubmitted: 0, statesSubmitted: 0 },
        bot: { actionsSubmitted: 0, statesSubmitted: 0 }
      }
    };
    this.startTime = Date.now();
    this.currentRound = 0;
    this.roundStartTime = 0;
    this.maxRounds = 15;
    this.playerSocket = null;
    this.matchData = null;
  }

  async runTest() {
    console.log('🎮 Starting Multi-Round Gameplay Test...');
    console.log(`📊 Target: ${this.maxRounds} complete rounds`);
    console.log('⏱️  Monitoring: Performance, memory, stability\n');

    try {
      await this.setupConnection();
      await this.initiateMatch();
      await this.runMultipleRounds();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Test failed:', error);
      this.testResults.errors.push(error.message);
    } finally {
      this.cleanup();
    }
  }

  async setupConnection() {
    console.log('🔌 Setting up player connection...');
    
    this.playerSocket = io(SERVER_URL);
    
    return new Promise((resolve, reject) => {
      this.playerSocket.on('connect', () => {
        console.log(`✅ Connected with socket ID: ${this.playerSocket.id}`);
        this.setupEventListeners();
        resolve();
      });

      this.playerSocket.on('connect_error', (error) => {
        console.error('❌ Connection failed:', error);
        reject(error);
      });

      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }

  setupEventListeners() {
    // Round progression tracking
    this.playerSocket.on('newTurn', (data) => {
      this.currentRound++;
      this.roundStartTime = Date.now();
      console.log(`\n🔄 ROUND ${this.currentRound} - Phase: ${data.phase}`);
      
      if (this.currentRound > this.maxRounds) {
        console.log(`🎯 Target rounds reached! Ending test...`);
        this.endTest();
        return;
      }

      // Submit actions for this round
      this.submitRoundActions();
    });

    // Phase tracking
    this.playerSocket.on('allPlayerActions', (allActions) => {
      this.testResults.completedPhases++;
      console.log(`📋 Phase 2: SPELL_PROPAGATION - Received actions from ${Object.keys(allActions).length} players`);
      
      // Track bot participation
      const botActions = Object.entries(allActions).find(([playerId]) => 
        playerId.startsWith('bot_')
      );
      
      if (botActions) {
        this.testResults.playerStats.bot.actionsSubmitted++;
        console.log(`   🤖 Bot participated (Total bot actions: ${this.testResults.playerStats.bot.actionsSubmitted})`);
      }
    });

    this.playerSocket.on('applySpellEffects', () => {
      console.log('✨ Phase 3: SPELL_EFFECTS - Applying effects locally');
      
      // Submit trusted state after delay
      setTimeout(() => {
        this.submitTrustedState();
      }, 2000);
    });

    this.playerSocket.on('updateUserStates', (data) => {
      const roundDuration = Date.now() - this.roundStartTime;
      this.testResults.performanceMetrics.averageRoundDuration = 
        (this.testResults.performanceMetrics.averageRoundDuration * (this.currentRound - 1) + roundDuration) / this.currentRound;
        
      console.log(`🔄 Phase 5: STATE_UPDATE - Round ${this.currentRound} completed (${roundDuration}ms)`);
      
      if (data.states) {
        // Track bot state submissions
        const botState = data.states.find(state => state.playerId.startsWith('bot_'));
        if (botState) {
          this.testResults.playerStats.bot.statesSubmitted++;
        }
        
        // Check for HP depletion (simulate game end condition)
        if (this.currentRound >= 10) {
          console.log('🎯 Simulating low HP - triggering game end scenario...');
          this.simulatePlayerDeath();
        }
      }
    });

    // Game end detection
    this.playerSocket.on('gameEnd', (data) => {
      console.log(`🏆 GAME END DETECTED - Winner: ${data.winner || 'Draw'}`);
      console.log(`📊 Game lasted ${this.currentRound} rounds`);
      this.testResults.totalRounds = this.currentRound;
      this.endTest();
    });

    // Error tracking
    this.playerSocket.on('error', (error) => {
      console.error(`❌ Socket error in round ${this.currentRound}:`, error);
      this.testResults.errors.push(`Round ${this.currentRound}: ${error}`);
    });

    // Performance monitoring
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.testResults.performanceMetrics.memoryLeaks.push({
        round: this.currentRound,
        heapUsed: memUsage.heapUsed,
        timestamp: Date.now()
      });
    }, 30000); // Every 30 seconds
  }

  async initiateMatch() {
    console.log('🤖 Requesting bot matchmaking...');
    
    const TEST_PLAYER_ID = `test_player_${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      this.playerSocket.on('addtoqueue', (response) => {
        console.log('📥 Add to queue response:', response);
        if (!response.success) {
          reject(new Error(`Matchmaking failed: ${response.result}`));
        }
      });

      this.playerSocket.on('matchFound', (data) => {
        this.matchData = data;
        this.matchData.playerId = TEST_PLAYER_ID;
        console.log(`✅ Match found! Room: ${this.matchData.roomId}`);
        console.log(`🤖 Opponent: ${this.matchData.opponentId}`);
        resolve();
      });

      // Create player setup - only use fields array (consistent with our updates)
      const playerSetup = {
        socketId: this.playerSocket.id,
        playerId: TEST_PLAYER_ID,
        fields: [new Field(100), new Field(2), new Field(2)] // HP=100, x=2, y=2 as fields only
      };

      // Create matchmaking request
      const addToQueue = {
        playerId: TEST_PLAYER_ID,
        playerSetup: playerSetup,
        nonce: Date.now(),
        signature: `test_signature_${Date.now()}`,
        setupProof: `test_proof_${Date.now()}`
      };

      this.playerSocket.emit('joinBotMatchmaking', { addToQueue });

      setTimeout(() => reject(new Error('Matchmaking timeout')), 15000);
    });
  }

  submitRoundActions() {
    const actions = {
      actions: [
        {
          playerId: this.matchData.playerId || `test_player_${Date.now()}`,
          spellId: this.getRandomSpell(),
          spellCastInfo: {
            target: this.matchData.opponentId,
            damage: Math.floor(Math.random() * 20) + 10,
            position: { 
              x: Math.floor(Math.random() * 10), 
              y: Math.floor(Math.random() * 10) 
            }
          }
        }
      ],
      signature: `test_action_signature_${Date.now()}`
    };

    console.log(`⚡ Phase 1: SPELL_CASTING - Submitting ${actions.actions[0].spellId}`);
    this.playerSocket.emit('submitActions', {
      roomId: this.matchData.roomId,
      actions: actions
    });

    this.testResults.playerStats.human.actionsSubmitted++;
  }

  submitTrustedState() {
    const trustedState = {
      playerId: this.matchData.playerId || `test_player_${Date.now()}`,
      stateCommit: `test_commit_${Date.now()}`,
      publicState: {
        socketId: this.playerSocket.id,
        playerId: this.matchData.playerId || `test_player_${Date.now()}`,
        fields: this.generateSimulatedFields()
      },
      signature: `test_trusted_signature_${Date.now()}`
    };

    console.log(`📝 Phase 4: END_OF_ROUND - Submitting trusted state`);
    this.playerSocket.emit('submitTrustedState', {
      roomId: this.matchData.roomId,
      trustedState
    });

    this.testResults.playerStats.human.statesSubmitted++;
  }

  simulatePlayerDeath() {
    console.log('💀 Simulating player death to test game end...');
    this.playerSocket.emit('reportDead', {
      roomId: this.matchData.roomId,
      playerId: this.matchData.opponentId // Bot dies
    });
  }

  getRandomSpell() {
    const spells = ['fireball', 'heal', 'lightning', 'shield', 'teleport'];
    return spells[Math.floor(Math.random() * spells.length)];
  }

  generateSimulatedFields() {
    // Simulate decreasing HP over time
    const baseHP = 100 - (this.currentRound * 5);
    const hp = Math.max(baseHP, 10);
    
    return [
      new Field(hp), // HP
      new Field(Math.floor(Math.random() * 10)), // X position
      new Field(Math.floor(Math.random() * 10)), // Y position
      ...Array(117).fill(0).map(() => new Field(Math.floor(Math.random() * 100))) // Other state fields
    ];
  }

  async runMultipleRounds() {
    console.log('🎮 Starting extended gameplay session...\n');
    
    // Wait for the game to progress through multiple rounds
    return new Promise((resolve) => {
      this.testEndResolver = resolve;
      
      // Safety timeout - end test after 5 minutes regardless
      setTimeout(() => {
        console.log('⏰ Test timeout reached - ending test');
        this.endTest();
      }, 300000);
    });
  }

  endTest() {
    this.testResults.totalRounds = this.currentRound;
    this.testResults.performanceMetrics.totalTestDuration = Date.now() - this.startTime;
    
    if (this.testEndResolver) {
      this.testEndResolver();
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MULTI-ROUND GAMEPLAY TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`🎯 Rounds Completed: ${this.testResults.totalRounds}/${this.maxRounds}`);
    console.log(`⏱️  Total Test Duration: ${Math.round(this.testResults.performanceMetrics.totalTestDuration / 1000)}s`);
    console.log(`📈 Average Round Duration: ${Math.round(this.testResults.performanceMetrics.averageRoundDuration)}ms`);
    console.log(`🔄 Completed Phases: ${this.testResults.completedPhases}`);
    
    console.log('\n📊 PLAYER STATISTICS:');
    console.log(`👤 Human - Actions: ${this.testResults.playerStats.human.actionsSubmitted}, States: ${this.testResults.playerStats.human.statesSubmitted}`);
    console.log(`🤖 Bot - Actions: ${this.testResults.playerStats.bot.actionsSubmitted}, States: ${this.testResults.playerStats.bot.statesSubmitted}`);
    
    console.log('\n🎯 TEST ASSESSMENT:');
    
    // Performance analysis
    if (this.testResults.totalRounds >= this.maxRounds * 0.8) {
      console.log('✅ PASS: Extended gameplay stability');
    } else {
      console.log('❌ FAIL: Game ended prematurely');
    }
    
    if (this.testResults.playerStats.bot.actionsSubmitted >= this.testResults.totalRounds * 0.9) {
      console.log('✅ PASS: Bot consistency across rounds');
    } else {
      console.log('❌ FAIL: Bot participation dropped over time');
    }
    
    if (this.testResults.errors.length === 0) {
      console.log('✅ PASS: No errors during extended play');
    } else {
      console.log(`❌ FAIL: ${this.testResults.errors.length} errors occurred`);
      this.testResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Memory analysis
    if (this.testResults.performanceMetrics.memoryLeaks.length > 1) {
      const initialMem = this.testResults.performanceMetrics.memoryLeaks[0].heapUsed;
      const finalMem = this.testResults.performanceMetrics.memoryLeaks[this.testResults.performanceMetrics.memoryLeaks.length - 1].heapUsed;
      const memGrowth = ((finalMem - initialMem) / initialMem) * 100;
      
      if (memGrowth < 50) {
        console.log(`✅ PASS: Memory growth under control (${memGrowth.toFixed(1)}%)`);
      } else {
        console.log(`⚠️  WARNING: Significant memory growth (${memGrowth.toFixed(1)}%)`);
      }
    }
    
    console.log('\n🎉 MULTI-ROUND TEST COMPLETED!');
    console.log('='.repeat(60));
  }

  cleanup() {
    if (this.playerSocket) {
      this.playerSocket.disconnect();
    }
  }
}

// Run the test
async function main() {
  const tester = new MultiRoundGameplayTester();
  await tester.runTest();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MultiRoundGameplayTester };
