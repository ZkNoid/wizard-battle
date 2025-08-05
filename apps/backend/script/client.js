const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3030';
const TOTAL_USERS = 20;
const LEVELS = [2, 3];
const sockets = [];

async function createUser(userId, level) {
    return new Promise((resolve, reject) => {
        const socket = io(SERVER_URL, {
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
            transports: ['websocket'],
        });

        sockets.push(socket);

        socket.on('connect', () => {
            console.log(`User ${userId} (Level ${level}) connected: ${socket.id}`);
            socket.emit('joinMatchmaking', { level });
            resolve();
        });

        socket.on('waiting', (data) => {
            console.log(`User ${userId} (Level ${level}): ${data.message}`);
        });

        socket.on('matchFound', (data) => {
            console.log(`User ${userId} (Level ${level}) matched in room: ${data.roomId}`);
            console.log(`Players in room: ${JSON.stringify(data.players)}`);
            socket.emit('gameMessage', {
                roomId: data.roomId,
                message: { type: 'test', content: `Hello from User ${userId}` },
            });
            console.log(`User ${userId} sent gameMessage with roomId: ${data.roomId}`);
        });

        socket.on('gameMessage', (data) => {
            console.log(`User ${userId} (Level ${level}) received game message in room ${data.roomId || 'undefined'}: ${JSON.stringify(data.message)}`);
        });

        socket.on('opponentDisconnected', () => {
            console.log(`User ${userId} (Level ${level}): Opponent disconnected`);
        });

        socket.on('error', (err) => {
            console.error(`User ${userId} (Level ${level}) error: ${err}`);
            reject(err);
        });

        socket.on('connect_error', (err) => {
            console.error(`User ${userId} (Level ${level}) connect error: ${err.message}`);
            reject(err);
        });
    });
}

async function generateUsers() {
    let userId = 1;
    for (const level of LEVELS) {
        for (let pair = 1; pair <= TOTAL_USERS / (2 * LEVELS.length); pair++) {
            try {
                await createUser(`Player${userId}`, level);
                await new Promise(resolve => setTimeout(resolve, 200));
                await createUser(`Player${userId + 1}`, level);
                await new Promise(resolve => setTimeout(resolve, 200));
                userId += 2;
            } catch (err) {
                console.error(`Failed to create user pair Player${userId}-Player${userId + 1}: ${err.message}`);
            }
        }
    }
}

process.on('SIGINT', () => {
    console.log('Disconnecting all users...');
    sockets.forEach((socket) => {
        socket.disconnect();
    });
    process.exit(0);
});

generateUsers().catch(console.error);