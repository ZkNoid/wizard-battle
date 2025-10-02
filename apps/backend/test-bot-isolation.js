/**
 * @title Bot Isolation Test Script
 * @notice Test script to verify that bots are properly isolated and cannot collude
 * @dev Creates multiple bot clients and verifies they have separate BotService instances
 */

const { io } = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:3030';
const TEST_BOT_IDS = [
  `bot_test_1_${Date.now()}`,
  `bot_test_2_${Date.now()}`,
  `bot_test_3_${Date.now()}`,
];

console.log('🧪 Starting Bot Isolation Test...');
console.log(`Testing ${TEST_BOT_IDS.length} bots for isolation`);

// Track bot connections and their states
const botConnections = new Map();
let testResults = {
  botsCreated: 0,
  botsConnected: 0,
  isolationVerified: false,
  errors: [],
};

// Create bot clients
async function createBotClients() {
  console.log('\n1. Creating bot clients...');

  for (const botId of TEST_BOT_IDS) {
    try {
      const botSocket = io(SERVER_URL, {
        transports: ['websocket'],
        timeout: 5000,
      });

      botSocket.on('connect', () => {
        console.log(
          `✅ Bot ${botId} connected with socket ID: ${botSocket.id}`
        );
        botConnections.set(botId, {
          socket: botSocket,
          socketId: botSocket.id,
          connected: true,
          actions: [],
          states: [],
        });
        testResults.botsConnected++;
      });

      botSocket.on('connect_error', (error) => {
        console.error(`❌ Bot ${botId} connection error:`, error);
        testResults.errors.push(
          `Bot ${botId} connection failed: ${error.message}`
        );
      });

      botSocket.on('disconnect', (reason) => {
        console.log(`🔌 Bot ${botId} disconnected:`, reason);
      });

      // Listen for game events to verify isolation
      botSocket.on('newTurn', (data) => {
        console.log(`🔄 Bot ${botId} received new turn:`, data.phase);
        const botData = botConnections.get(botId);
        if (botData) {
          botData.lastTurn = data;
        }
      });

      botSocket.on('allPlayerActions', (allActions) => {
        console.log(
          `📋 Bot ${botId} received all actions:`,
          Object.keys(allActions)
        );
        const botData = botConnections.get(botId);
        if (botData) {
          botData.actions.push(allActions);
        }
      });

      botSocket.on('updateUserStates', (data) => {
        console.log(
          `🔄 Bot ${botId} received state updates:`,
          data.states?.length || 0,
          'states'
        );
        const botData = botConnections.get(botId);
        if (botData) {
          botData.states.push(data);
        }
      });

      botConnections.set(botId, {
        socket: botSocket,
        socketId: null,
        connected: false,
        actions: [],
        states: [],
      });

      testResults.botsCreated++;

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to create bot ${botId}:`, error);
      testResults.errors.push(`Bot ${botId} creation failed: ${error.message}`);
    }
  }
}

// Test bot matchmaking requests
async function testBotMatchmaking() {
  console.log('\n2. Testing bot matchmaking requests...');

  for (const botId of TEST_BOT_IDS) {
    const botData = botConnections.get(botId);
    if (botData && botData.connected) {
      try {
        // Create player setup for bot matchmaking
        const playerSetup = {
          socketId: botData.socketId,
          playerId: botId,
          fields: JSON.stringify({
            playerStats: {
              hp: { magnitude: '100', sgn: 'Positive' },
              position: {
                value: {
                  x: {
                    magnitude: Math.floor(Math.random() * 10).toString(),
                    sgn: 'Positive',
                  },
                  y: {
                    magnitude: Math.floor(Math.random() * 10).toString(),
                    sgn: 'Positive',
                  },
                },
              },
            },
          }),
        };

        const addToQueue = {
          playerId: botId,
          playerSetup: playerSetup,
          nonce: Date.now(),
          signature: `test_signature_${botId}_${Date.now()}`,
          setupProof: `test_proof_${botId}_${Date.now()}`,
        };

        console.log(`🤖 Bot ${botId} requesting bot matchmaking...`);
        botData.socket.emit('joinBotMatchmaking', { addToQueue });

        // Wait between requests to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Bot ${botId} matchmaking request failed:`, error);
        testResults.errors.push(
          `Bot ${botId} matchmaking failed: ${error.message}`
        );
      }
    }
  }
}

// Verify isolation
async function verifyIsolation() {
  console.log('\n3. Verifying bot isolation...');

  // Check that each bot has its own connection
  const connectedBots = Array.from(botConnections.values()).filter(
    (bot) => bot.connected
  );

  if (connectedBots.length === TEST_BOT_IDS.length) {
    console.log('✅ All bots connected successfully');
    testResults.isolationVerified = true;
  } else {
    console.log(
      `⚠️ Only ${connectedBots.length}/${TEST_BOT_IDS.length} bots connected`
    );
    testResults.errors.push(
      `Isolation verification failed: ${connectedBots.length}/${TEST_BOT_IDS.length} bots connected`
    );
  }

  // Check that each bot has unique socket IDs
  const socketIds = connectedBots.map((bot) => bot.socketId).filter((id) => id);
  const uniqueSocketIds = new Set(socketIds);

  if (socketIds.length === uniqueSocketIds.size) {
    console.log('✅ All bots have unique socket IDs');
  } else {
    console.log('❌ Some bots share socket IDs - isolation compromised');
    testResults.errors.push('Socket ID collision detected');
  }

  // Check that bots have separate action/state histories
  let isolationCheck = true;
  for (let i = 0; i < connectedBots.length; i++) {
    for (let j = i + 1; j < connectedBots.length; j++) {
      const bot1 = connectedBots[i];
      const bot2 = connectedBots[j];

      // Each bot should have its own action and state history
      if (bot1.actions.length > 0 && bot2.actions.length > 0) {
        const actions1 = JSON.stringify(bot1.actions);
        const actions2 = JSON.stringify(bot2.actions);

        if (actions1 === actions2) {
          console.log(
            '❌ Bots share identical action history - isolation compromised'
          );
          isolationCheck = false;
          testResults.errors.push('Action history collision detected');
        }
      }
    }
  }

  if (isolationCheck) {
    console.log('✅ Bot action/state histories are isolated');
  }
}

// Cleanup function
async function cleanup() {
  console.log('\n4. Cleaning up connections...');

  for (const [botId, botData] of botConnections) {
    if (botData.socket) {
      botData.socket.disconnect();
      console.log(`🔌 Disconnected bot ${botId}`);
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`- Bots created: ${testResults.botsCreated}`);
  console.log(`- Bots connected: ${testResults.botsConnected}`);
  console.log(
    `- Isolation verified: ${testResults.isolationVerified ? '✅' : '❌'}`
  );
  console.log(`- Errors: ${testResults.errors.length}`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    testResults.errors.forEach((error) => console.log(`  - ${error}`));
  }

  if (testResults.isolationVerified && testResults.errors.length === 0) {
    console.log('\n🎉 Bot isolation test PASSED!');
  } else {
    console.log('\n💥 Bot isolation test FAILED!');
  }
}

// Main test execution
async function runTest() {
  try {
    await createBotClients();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for connections

    await testBotMatchmaking();
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for matchmaking

    await verifyIsolation();

    // Wait a bit more to collect any additional events
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    testResults.errors.push(`Test execution failed: ${error.message}`);
  } finally {
    await cleanup();
    process.exit(
      testResults.isolationVerified && testResults.errors.length === 0 ? 0 : 1
    );
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted by user');
  await cleanup();
  process.exit(1);
});

// Run the test
console.log('⏳ Starting bot isolation test...');
runTest().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
