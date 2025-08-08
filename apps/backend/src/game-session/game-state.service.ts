import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { Socket } from 'socket.io';

interface GameState {
    roomId: string;
    players: {
        id: string;
        instanceId: string;
        socketId: string;
        state: any;
    }[];
    gameData: any;
    turn: number;
    status: 'waiting' | 'active' | 'finished';
    createdAt: number;
    updatedAt: number;
}

interface SocketMapping {
    socketId: string;
    instanceId: string;
    roomId?: string;
    playerId?: string;
}

@Injectable()
export class GameStateService {
    private redisClient = createClient({ url: 'redis://localhost:6379' });
    private instanceId = `${process.pid}-${Date.now()}`;

    constructor() {
        this.redisClient.on('error', err => console.error('GameStateService Redis Client Error', err));
        this.redisClient.connect().then(() => console.log('GameStateService Redis Connected'));
    }

    // Socket-to-Instance Mapping
    /**
     * Register a socket mapping
     * @param socket - The connected socket
     * @param playerId - Optional logical player identifier
     * @param roomId - Optional current room identifier
     * @dev Stores a mapping under the Redis hash `socket_mappings` keyed by
     * `socket.id`, recording which node instance manages the socket along with
     * optional player and room ties. This enables other instances to route
     * events by consulting Redis even if the peer socket is remote.
     */
    async registerSocket(socket: Socket, playerId?: string, roomId?: string): Promise<void> {
        const mapping: SocketMapping = {
            socketId: socket.id,
            instanceId: this.instanceId,
            roomId,
            playerId,
        };

        await this.redisClient.hSet('socket_mappings', socket.id, JSON.stringify(mapping));
        console.log(`Registered socket ${socket.id} on instance ${this.instanceId}`);
    }

    /**
     * Unregister a socket mapping
     * @param socketId - The socket id to remove
     * @dev Deletes the entry from the `socket_mappings` Redis hash so further
     * lookups won't target a stale socket.
     */
    async unregisterSocket(socketId: string): Promise<void> {
        await this.redisClient.hDel('socket_mappings', socketId);
        console.log(`Unregistered socket ${socketId}`);
    }

    /**
     * Get a socket mapping
     * @param socketId - The socket id to resolve
     * @returns The mapping or `null` when not present
     * @dev Reads and parses the JSON mapping from the `socket_mappings` Redis
     * hash.
     */
    async getSocketMapping(socketId: string): Promise<SocketMapping | null> {
        const mapping = await this.redisClient.hGet('socket_mappings', socketId);
        return mapping ? JSON.parse(mapping) : null;
    }

    /**
     * Get all sockets in a room
     * @param roomId - The room identifier
     * @returns Array of socket mappings in the room
     * @dev Scans all entries in `socket_mappings` and filters by `roomId`.
     * Useful for broadcasting to all participants irrespective of instance
     * boundaries.
     */
    async getSocketsInRoom(roomId: string): Promise<SocketMapping[]> {
        const allMappings = await this.redisClient.hGetAll('socket_mappings');
        return Object.values(allMappings)
            .map(m => JSON.parse(m))
            .filter(m => m.roomId === roomId);
    }

    // Game State Management
    /**
     * Create initial game state for a room
     * @param roomId - The room identifier
     * @param players - Players list with logical ids and socket ids
     * @returns The created `GameState`
     * @dev Initializes a `GameState` structure with per-player entries bound to
     * the creating instance id, sets timestamps, and persists it in the Redis
     * `game_states` hash under the room id key.
     */
    async createGameState(roomId: string, players: { id: string; socketId: string }[]): Promise<GameState> {
        const gameState: GameState = {
            roomId,
            players: players.map(p => ({
                id: p.id,
                socketId: p.socketId,
                instanceId: this.instanceId,
                state: null,
            })),
            gameData: {},
            turn: 0,
            status: 'waiting',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await this.redisClient.hSet('game_states', roomId, JSON.stringify(gameState));
        console.log(`Created game state for room ${roomId}`);
        return gameState;
    }

    /**
     * Read game state for a room
     * @param roomId - The room identifier
     * @returns Parsed `GameState` or `null` if absent
     * @dev Reads from the `game_states` Redis hash and parses JSON into a
     * `GameState` object.
     */
    async getGameState(roomId: string): Promise<GameState | null> {
        const state = await this.redisClient.hGet('game_states', roomId);
        return state ? JSON.parse(state) : null;
    }

    /**
     * Update game state partially
     * @param roomId - The room identifier
     * @param updates - Partial state fields to merge
     * @dev Loads the current state, merges the provided fields, refreshes the
     * `updatedAt` timestamp, and persists back to the `game_states` hash.
     */
    async updateGameState(roomId: string, updates: Partial<GameState>): Promise<void> {
        const currentState = await this.getGameState(roomId);
        if (!currentState) {
            throw new Error(`Game state not found for room ${roomId}`);
        }

        const updatedState = {
            ...currentState,
            ...updates,
            updatedAt: Date.now(),
        };

        await this.redisClient.hSet('game_states', roomId, JSON.stringify(updatedState));
        console.log(`Updated game state for room ${roomId}`);
    }

    /**
     * Update a specific player's state
     * @param roomId - The room identifier
     * @param playerId - The player id to update
     * @param state - The new per-player state blob
     * @dev Fetches the `GameState`, finds the target player entry, updates the
     * `state` and `updatedAt` fields, and persists back into the `game_states`
     * hash.
     */
    async updatePlayerState(roomId: string, playerId: string, state: any): Promise<void> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) {
            throw new Error(`Game state not found for room ${roomId}`);
        }

        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            throw new Error(`Player ${playerId} not found in room ${roomId}`);
        }

        if (gameState.players[playerIndex]) {
            gameState.players[playerIndex].state = state;
            gameState.updatedAt = Date.now();

            await this.redisClient.hSet('game_states', roomId, JSON.stringify(gameState));
            console.log(`Updated player state for ${playerId} in room ${roomId}`);
        } else {
            throw new Error(`Player ${playerId} not found in room ${roomId}`);
        }
    }

    /**
     * Remove a game state
     * @param roomId - The room identifier
     * @dev Deletes the room entry from the `game_states` hash.
     */
    async removeGameState(roomId: string): Promise<void> {
        await this.redisClient.hDel('game_states', roomId);
        console.log(`Removed game state for room ${roomId}`);
    }

    // Cross-instance communication
    /**
     * Publish an event to a room topic
     * @param roomId - The logical room id
     * @param event - Event name
     * @param data - Serializable payload
     * @dev Publishes a JSON message on the `room_events` Redis channel. Other
     * instances subscribing to this channel will receive and route the event to
     * relevant sockets.
     */
    async publishToRoom(roomId: string, event: string, data: any): Promise<void> {
        await this.redisClient.publish('room_events', JSON.stringify({
            roomId,
            event,
            data,
            timestamp: Date.now(),
        }));
        console.log(`Published ${event} to room ${roomId}`);
    }

    /**
     * Subscribe to cross-instance room events
     * @param callback - Handler invoked with parsed message `{ roomId, event, data }`
     * @dev Creates a dedicated Redis client in subscriber mode, connects, and
     * subscribes to `room_events`. Each message is parsed and passed to the
     * provided callback. Parsing errors are caught and logged.
     */
    async subscribeToRoomEvents(callback: (data: { roomId: string; event: string; data: any }) => void): Promise<void> {
        const subscriber = this.redisClient.duplicate();
        await subscriber.connect();
        
        await subscriber.subscribe('room_events', (message) => {
            try {
                const parsed = JSON.parse(message);
                callback(parsed);
            } catch (error) {
                console.error('Error parsing room event:', error);
            }
        });

        console.log('Subscribed to room events');
    }

    // Cleanup
    /**
     * Cleanup resources for this instance
     * @dev Iterates entries of `socket_mappings`, removing those that belong to
     * this `instanceId`. Intended to be called on graceful shutdown to avoid
     * stale mappings.
     */
    async cleanupInstance(): Promise<void> {
        // Remove all socket mappings for this instance
        const allMappings = await this.redisClient.hGetAll('socket_mappings');
        const instanceMappings = Object.entries(allMappings)
            .filter(([_, mapping]) => {
                const parsed = JSON.parse(mapping);
                return parsed.instanceId === this.instanceId;
            });

        for (const [socketId, _] of instanceMappings) {
            await this.redisClient.hDel('socket_mappings', socketId);
        }

        console.log(`Cleaned up ${instanceMappings.length} socket mappings for instance ${this.instanceId}`);
    }

    /**
     * Disconnect
     * @dev Runs instance cleanup and then gracefully quits the Redis client.
     */
    async disconnect(): Promise<void> {
        await this.cleanupInstance();
        await this.redisClient.quit();
        console.log('GameStateService Redis Disconnected');
    }
} 