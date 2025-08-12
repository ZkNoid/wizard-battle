interface IMap {
    tiles: number[][];
  }
  
  interface ISpell {
    spellId: string;
    cooldown: number;
    active: boolean;
  }
  
  interface IPublicState {
    playerId?: string;
    wizardId?: string;
    maxHP?: number;
    mapStructure?: IMap;
    spells?: ISpell[];
    level?: number;
  }
  
  interface IAddToQueue {
    playerId: string;
    playerSetup: IPublicState;
    nonce: number;
    signature: any;
    setupProof: any;
  }
  
  export class TransformedMap implements IMap {
    tiles: number[][];
  
    constructor(tiles: number[][]) {
      this.tiles = tiles;
    }
  }
  
  export class TransformedSpell implements ISpell {
    spellId: string;
    cooldown: number;
    active: boolean;
  
    constructor(spellId: string, cooldown: number, active: boolean) {
      this.spellId = spellId;
      this.cooldown = cooldown;
      this.active = active;
    }
  }
  
  export class TransformedPlayerSetup implements IPublicState {
    playerId: string;
    wizardId: string;
    maxHP: number;
    mapStructure: IMap;
    spells: ISpell[];
    level: number;
  
    constructor(playerId: string, wizardId: string, maxHP: number, mapStructure: IMap, spells: ISpell[], level: number) {
      this.playerId = playerId;
      this.wizardId = wizardId;
      this.maxHP = maxHP;
      this.mapStructure = mapStructure;
      this.spells = spells;
      this.level = level;
    }
  }
  
  export class TransformedAddToQueue implements IAddToQueue {
    playerId: string;
    playerSetup: IPublicState;
    nonce: number;
    signature: any;
    setupProof: any;
  
    constructor(
      playerId: string,
      playerSetup: IPublicState,
      nonce: number,
      signature: any,
      setupProof: any,
    ) {
      this.playerId = playerId;
      this.playerSetup = playerSetup;
      this.nonce = nonce;
      this.signature = signature;
      this.setupProof = setupProof;
    }
  }
  
/**
 * @fileoverview WebSocket Client Test Script
 * @description A test client script that simulates multiple users connecting to the game server
 * to test matchmaking, room creation, and real-time communication functionality.
 * 
 * This script creates multiple Socket.IO clients that connect to the game server,
 * join matchmaking queues, and simulate gameplay interactions to stress-test
 * the server's ability to handle concurrent connections and matchmaking.
 * 
 * @author Test Team
 * @version 1.0.0
 * @since 2024
 */

import { io, Socket } from 'socket.io-client';

// Configuration constants
const SERVER_URL = 'http://localhost:3030';  // Target server URL for testing
const TOTAL_USERS = 20;                     // Total number of users to create
const LEVELS = [2, 3];                      // Available game levels for matchmaking
const sockets: Socket[] = [];               // Array to track all created socket connections

/**
 * Creates a single user connection and joins matchmaking
 * @param {string} userId - Unique identifier for the user
 * @param {number} level - Game level for matchmaking (affects matchmaking pool)
 * @returns {Promise<void>} Promise that resolves when user is connected and joined matchmaking
 * @throws {Error} If connection or matchmaking join fails
 */
async function createUser(userId: string, level: number): Promise<void> {
    return new Promise((resolve, reject) => {
        // Create Socket.IO client with reconnection settings
        const socket = io(SERVER_URL, {
            reconnection: true,              // Enable automatic reconnection
            reconnectionAttempts: 3,         // Try to reconnect up to 3 times
            reconnectionDelay: 1000,         // Wait 1 second between reconnection attempts
            transports: ['websocket'],       // Use WebSocket transport only
        });

        // Store socket reference for cleanup
        sockets.push(socket);

        // 1. Create addToQueue struct
        const map = new TransformedMap([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
        const spells = [
            new TransformedSpell("fireball", 10, true),
            new TransformedSpell("heal", 10, true),
        ];
        const playerSetup = new TransformedPlayerSetup(socket.id || `Player${userId}`, socket.id || `Wizard${userId}`, 100, map, spells, level);
        const addToQueue = new TransformedAddToQueue(socket.id || `Player${userId}`, playerSetup, 0, null, null);

        // Handle successful connection
        socket.on('connect', () => {
            console.log(`User ${userId} (Level ${level}) connected: ${socket.id}`);
            // Join matchmaking queue immediately after connection
            socket.emit('joinMatchmaking', { addToQueue });
            resolve();
        });

        // Handle waiting state in matchmaking queue
        socket.on('waiting', (data) => {
            console.log(`User ${userId} (Level ${level}): ${data.message}`);
        });

        // Handle successful match found
        socket.on('matchFound', (data) => {
            console.log(`User ${userId} (Level ${level}) matched in room: ${data.roomId}`);
            console.log(`Players in room: ${JSON.stringify(data.players)}`);
            
            // Send a test game message to verify room communication
            socket.emit('gameMessage', {
                roomId: data.roomId,
                message: { type: 'test', content: `Hello from User ${userId}` },
            });
            console.log(`User ${userId} sent gameMessage with roomId: ${data.roomId}`);
        });

        // Handle incoming game messages from other players
        socket.on('gameMessage', (data) => {
            console.log(`User ${userId} (Level ${level}) received game message in room ${data.roomId || 'undefined'}: ${JSON.stringify(data.message)}`);
        });

        // Handle opponent disconnection events
        socket.on('opponentDisconnected', () => {
            console.log(`User ${userId} (Level ${level}): Opponent disconnected`);
        });

        // Handle general socket errors
        socket.on('error', (err) => {
            console.error(`User ${userId} (Level ${level}) error: ${err}`);
            reject(err);
        });

        // Handle connection errors
        socket.on('connect_error', (err) => {
            console.error(`User ${userId} (Level ${level}) connect error: ${err.message}`);
            reject(err);
        });
    });
}

/**
 * Generates multiple user pairs for testing matchmaking
 * @description Creates pairs of users at different levels to test the matchmaking system.
 * Users are created in pairs to ensure they can be matched against each other.
 * A delay is added between user creation to avoid overwhelming the server.
 * 
 * The function creates users in the following pattern:
 * - For each level, create pairs of users
 * - Each pair consists of 2 users at the same level
 * - Total users = 2 * pairs * number of levels
 * 
 * @returns {Promise<void>} Promise that resolves when all users are created
 */
async function generateUsers() {
    let userId = 1;
    
    // Iterate through each game level
    for (const level of LEVELS) {
        // Calculate how many pairs to create for this level
        for (let pair = 1; pair <= TOTAL_USERS / (2 * LEVELS.length); pair++) {
            try {
                // Create first user in the pair
                await createUser(`Player${userId}`, level);
                // Wait 200ms before creating the next user
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Create second user in the pair
                await createUser(`Player${userId + 1}`, level);
                // Wait 200ms before creating the next pair
                await new Promise(resolve => setTimeout(resolve, 200));
                
                userId += 2;
            } catch (err: any) {
                console.error(`Failed to create user pair Player${userId}-Player${userId + 1}: ${err.message}`);
            }
        }
    }
}

// Graceful shutdown handler
process.on('SIGINT', () => {
    console.log('Disconnecting all users...');
    sockets.forEach((socket) => {
        socket.disconnect();
    });
    process.exit(0);
});

// Start the test by generating users
generateUsers().catch(console.error);