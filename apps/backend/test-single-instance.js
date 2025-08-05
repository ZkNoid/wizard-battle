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

    // Wait and cleanup
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n6. Cleaning up...');
    socket.disconnect();
    
    console.log('\n✅ Single instance test completed!');
    process.exit(0);
}

// Run the test
testSingleInstance().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
}); 