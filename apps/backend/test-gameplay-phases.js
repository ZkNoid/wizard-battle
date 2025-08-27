const { io } = require('socket.io-client');

// Test 5-phase gameplay functionality
const SERVER_URL = 'http://localhost:3001';
const TEST_ROOM_ID = 'gameplay-test-room';

async function testGameplayPhases() {
    console.log('🎮 Testing 5-Phase Gameplay System\n');

    // Create two player connections
    console.log('1. Creating player connections...');
    const player1 = io(SERVER_URL);
    const player2 = io(SERVER_URL);
    
    const players = [
        { socket: player1, id: 'player1', name: 'Player 1' },
        { socket: player2, id: 'player2', name: 'Player 2' }
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
            console.log(`📋 ${player.name} received all player actions:`, Object.keys(data));
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
                            hp: 100 - (index * 10), // Simulate different HP values
                            position: { x: index * 10, y: index * 5 },
                            effects: []
                        },
                        signature: `signature-${player.id}`
                    }
                });
            }, 1000);
        });

        player.socket.on('trustedStateResult', (data) => {
            console.log(`✅ ${player.name} trusted state result:`, data);
        });

        player.socket.on('updateUserStates', (data) => {
            console.log(`🔄 ${player.name} received state updates:`, data.states.length, 'states');
        });

        player.socket.on('newTurn', (data) => {
            console.log(`🔄 ${player.name} new turn started:`, data.phase);
        });

        player.socket.on('gameEnd', (data) => {
            console.log(`🏆 ${player.name} game ended, winner:`, data.winnerId);
        });
    });

    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 2000));

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
                        position: { x: index * 5, y: index * 3 }
                    }
                }
            ],
            signature: `signature-${player.id}-actions`
        };

        console.log(`📤 ${player.name} submitting actions...`);
        player.socket.emit('submitActions', {
            roomId: TEST_ROOM_ID,
            actions: actions
        });
    });

    // Wait for spell propagation and effects phases
    console.log('\n3. Waiting for Phase 2 (Spell Propagation) and Phase 3 (Spell Effects)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test Phase 4 & 5 happen automatically via the applySpellEffects listener above

    console.log('\n4. Waiting for Phase 4 (End of Round) and Phase 5 (State Update)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

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
                        damage: 25
                    }
                }
            ],
            signature: `signature-${player.id}-turn2`
        };

        console.log(`📤 ${player.name} submitting turn 2 actions...`);
        player.socket.emit('submitActions', {
            roomId: TEST_ROOM_ID,
            actions: actions
        });
    });

    // Wait for second turn to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test player death scenario
    console.log('\n6. Testing player death scenario...');
    
    console.log(`💀 Simulating ${players[1].name} death...`);
    players[0].socket.emit('reportDead', {
        roomId: TEST_ROOM_ID,
        dead: { playerId: players[1].id }
    });

    // Wait for game end
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test error scenarios
    console.log('\n7. Testing error scenarios...');
    
    // Try to submit actions in wrong phase
    console.log('Testing wrong phase submission...');
    players[0].socket.emit('submitActions', {
        roomId: TEST_ROOM_ID,
        actions: {
            actions: [{ playerId: players[0].id, spellId: 'test', spellCastInfo: {} }],
            signature: 'test'
        }
    });

    // Try to submit empty actions
    console.log('Testing empty actions submission...');
    players[0].socket.emit('submitActions', {
        roomId: TEST_ROOM_ID,
        actions: {
            actions: [],
            signature: 'test'
        }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cleanup
    console.log('\n8. Cleaning up...');
    players.forEach(player => {
        player.socket.disconnect();
        console.log(`🔌 ${player.name} disconnected`);
    });

    console.log('\n✅ 5-Phase Gameplay test completed!');
    process.exit(0);
}

// Run the test
testGameplayPhases().catch(error => {
    console.error('❌ Gameplay test failed:', error);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted by user');
    process.exit(0);
});
