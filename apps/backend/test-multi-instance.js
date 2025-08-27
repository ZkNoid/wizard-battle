const { io } = require('socket.io-client');

// Test configuration
const SERVER_URLS = [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003'
];

const TEST_ROOM_ID = 'test-room-123';

async function testMultiInstance() {
    console.log('🧪 Testing Multi-Instance Redis Functionality\n');

    // Test 1: Connect to different instances
    console.log('1. Testing connections to different instances...');
    const sockets = [];
    
    for (let i = 0; i < SERVER_URLS.length; i++) {
        try {
            const socket = io(SERVER_URLS[i]);
            
            socket.on('connect', () => {
                console.log(`✅ Connected to instance ${i + 1}: ${socket.id}`);
            });
            
            socket.on('disconnect', () => {
                console.log(`❌ Disconnected from instance ${i + 1}`);
            });
            
            socket.on('error', (error) => {
                console.log(`❌ Error on instance ${i + 1}:`, error);
            });
            
            sockets.push(socket);
            
            // Wait for connection
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.log(`❌ Failed to connect to instance ${i + 1}:`, error.message);
        }
    }

    if (sockets.length === 0) {
        console.log('❌ No instances available for testing');
        return;
    }

    // Test 2: Join matchmaking on different instances
    console.log('\n2. Testing matchmaking across instances...');
    
    for (let i = 0; i < sockets.length; i++) {
        const socket = sockets[i];
        
        socket.emit('joinMatchmaking', { level: 2 });
        
        socket.on('waiting', (data) => {
            console.log(`✅ Instance ${i + 1} joined matchmaking:`, data.message);
        });
        
        socket.on('matchFound', (data) => {
            console.log(`🎯 Instance ${i + 1} found match:`, data);
        });
    }

    // Test 3: Test cross-instance communication
    console.log('\n3. Testing cross-instance communication...');
    
    const testMessage = { type: 'test', data: 'Hello from multi-instance test' };
    
    // Send message from first socket
    if (sockets[0]) {
        sockets[0].emit('gameMessage', {
            roomId: TEST_ROOM_ID,
            message: testMessage
        });
        console.log(`📤 Sent test message from instance 1`);
    }
    
    // Listen for messages on all sockets
    sockets.forEach((socket, index) => {
        socket.on('gameMessage', (data) => {
            console.log(`📨 Instance ${index + 1} received message:`, data);
        });

        // Listen for gameplay phase events
        socket.on('allPlayerActions', (data) => {
            console.log(`🎯 Instance ${index + 1} received all player actions:`, Object.keys(data));
        });

        socket.on('applySpellEffects', () => {
            console.log(`⚡ Instance ${index + 1} received apply spell effects`);
        });

        socket.on('updateUserStates', (data) => {
            console.log(`🔄 Instance ${index + 1} received update user states:`, data.states.length, 'states');
        });

        socket.on('newTurn', (data) => {
            console.log(`🔄 Instance ${index + 1} received new turn:`, data.phase);
        });

        socket.on('gameEnd', (data) => {
            console.log(`🏆 Instance ${index + 1} received game end:`, data.winnerId);
        });
    });

    // Test 4: Test health endpoints
    console.log('\n4. Testing health endpoints...');
    
    for (let i = 0; i < SERVER_URLS.length; i++) {
        try {
            const healthResponse = await fetch(`${SERVER_URLS[i]}/health`);
            const healthData = await healthResponse.json();
            console.log(`🏥 Instance ${i + 1} health:`, healthData);
        } catch (error) {
            console.log(`❌ Failed to get health from instance ${i + 1}:`, error.message);
        }
    }

    // Test 5: Test stats endpoint
    console.log('\n5. Testing stats endpoint...');
    
    for (let i = 0; i < SERVER_URLS.length; i++) {
        try {
            const statsResponse = await fetch(`${SERVER_URLS[i]}/health/stats`);
            const statsData = await statsResponse.json();
            console.log(`📊 Instance ${i + 1} stats:`, statsData);
        } catch (error) {
            console.log(`❌ Failed to get stats from instance ${i + 1}:`, error.message);
        }
    }

    // Test 6: Test gameplay phase messages across instances
    console.log('\n6. Testing gameplay phases across instances...');
    
    if (sockets.length >= 2) {
        // Test submit actions from different instances
        console.log('Testing submitActions from different instances...');
        
        sockets[0].emit('submitActions', {
            roomId: TEST_ROOM_ID,
            actions: {
                actions: [{ playerId: 'player1', spellId: 'fireball', spellCastInfo: {} }],
                signature: 'test-signature-1'
            }
        });

        if (sockets[1]) {
            sockets[1].emit('submitActions', {
                roomId: TEST_ROOM_ID,
                actions: {
                    actions: [{ playerId: 'player2', spellId: 'heal', spellCastInfo: {} }],
                    signature: 'test-signature-2'
                }
            });
        }

        // Wait for phase progression
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test trusted state submission
        console.log('Testing submitTrustedState from different instances...');
        
        sockets[0].emit('submitTrustedState', {
            roomId: TEST_ROOM_ID,
            trustedState: {
                playerId: 'player1',
                stateCommit: 'test-commit-1',
                publicState: { playerId: 'player1', hp: 100 },
                signature: 'test-signature-1'
            }
        });

        if (sockets[1]) {
            sockets[1].emit('submitTrustedState', {
                roomId: TEST_ROOM_ID,
                trustedState: {
                    playerId: 'player2',
                    stateCommit: 'test-commit-2',
                    publicState: { playerId: 'player2', hp: 90 },
                    signature: 'test-signature-2'
                }
            });
        }

        // Wait for state updates
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Cleanup
    console.log('\n7. Cleaning up connections...');
    
    setTimeout(() => {
        sockets.forEach((socket, index) => {
            socket.disconnect();
            console.log(`🔌 Disconnected from instance ${index + 1}`);
        });
        
        console.log('\n✅ Multi-instance test completed!');
        process.exit(0);
    }, 5000);
}

// Run the test
testMultiInstance().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted by user');
    process.exit(0);
}); 