const { io } = require('socket.io-client');

// Test single instance functionality
const SERVER_URL = 'http://localhost:3001';

async function testSingleInstance() {
    console.log('🧪 Testing Single Instance with Redis Multi-Instance Support\n');

    // Connect to the server
    console.log('1. Connecting to server...');
    const socket = io(SERVER_URL);
    
    socket.on('connect', () => {
        console.log(`✅ Connected: ${socket.id}`);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected');
    });
    
    socket.on('waiting', (data) => {
        console.log(`⏳ Waiting: ${data.message}`);
    });
    
    socket.on('matchFound', (data) => {
        console.log(`🎯 Match Found:`, data);
    });
    
    socket.on('gameMessage', (data) => {
        console.log(`📨 Game Message:`, data);
    });

    // Listen for new gameplay phase events
    socket.on('allPlayerActions', (data) => {
        console.log(`🎯 All Player Actions:`, data);
    });

    socket.on('applySpellEffects', () => {
        console.log(`⚡ Apply Spell Effects phase started`);
    });

    socket.on('updateUserStates', (data) => {
        console.log(`🔄 Update User States:`, data);
    });

    socket.on('newTurn', (data) => {
        console.log(`🔄 New Turn Started:`, data);
    });

    socket.on('gameEnd', (data) => {
        console.log(`🏆 Game Ended:`, data);
    });

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test health endpoint
    console.log('\n2. Testing health endpoint...');
    try {
        const response = await fetch(`${SERVER_URL}/health`);
        const health = await response.json();
        console.log('✅ Health:', health);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
    }

    // Test stats endpoint
    console.log('\n3. Testing stats endpoint...');
    try {
        const response = await fetch(`${SERVER_URL}/health/stats`);
        const stats = await response.json();
        console.log('✅ Stats:', stats);
    } catch (error) {
        console.log('❌ Stats check failed:', error.message);
    }

    // Test matchmaking
    console.log('\n4. Testing matchmaking...');
    socket.emit('joinMatchmaking', { level: 2 });

    // Wait for matchmaking
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test game message
    console.log('\n5. Testing game message...');
    socket.emit('gameMessage', {
        roomId: 'test-room-123',
        message: { type: 'test', data: 'Hello from single instance test' }
    });

    // Test new gameplay phase messages
    console.log('\n6. Testing gameplay phases...');
    
    // Test submit actions (Phase 1: Spell Casting)
    console.log('Testing submitActions...');
    socket.emit('submitActions', {
        roomId: 'test-room-123',
        actions: {
            actions: [{ playerId: 'test-player', spellId: 'fireball', spellCastInfo: {} }],
            signature: 'test-signature'
        }
    });

    // Test submit trusted state (Phase 4: End of Round)
    console.log('Testing submitTrustedState...');
    socket.emit('submitTrustedState', {
        roomId: 'test-room-123',
        trustedState: {
            playerId: 'test-player',
            stateCommit: 'test-commit',
            publicState: { playerId: 'test-player' },
            signature: 'test-signature'
        }
    });

    // Test report dead
    console.log('Testing reportDead...');
    socket.emit('reportDead', {
        roomId: 'test-room-123',
        dead: { playerId: 'test-player' }
    });

    // Wait and cleanup
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n7. Cleaning up...');
    socket.disconnect();
    
    console.log('\n✅ Single instance test completed!');
    process.exit(0);
}

// Run the test
testSingleInstance().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
}); 