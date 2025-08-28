import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { Socket } from 'socket.io';
import { GamePhase, IUserActions, ITrustedState } from '../../../common/types/gameplay.types';

/**
 * @title Game State Service - 5-Phase Turn Management
 * @notice Manages game state and orchestrates the 5-phase turn-based gameplay system
 * @dev Provides Redis-backed state persistence with multi-instance support for horizontal scaling
 * 
 * ## 5-Phase Turn System:
 * 1. SPELL_CASTING: Players submit actions via storePlayerActions()
 * 2. SPELL_PROPAGATION: Server broadcasts all actions via getAllPlayerActions()
 * 3. SPELL_EFFECTS: Automatic phase advancement 
 * 4. END_OF_ROUND: Players submit trusted states via storeTrustedState()
 * 5. STATE_UPDATE: Server broadcasts states via getAllTrustedStates()
 * 
 * ## Multi-Instance Architecture:
 * - Uses Redis for shared state across multiple server instances
 * - Cross-instance communication via Redis pub/sub
 * - Socket mappings track which instance manages each connection
 */

/**
 * @notice Core game state structure stored in Redis
 * @dev Extended to support 5-phase gameplay with player lifecycle management
 */
interface GameState {
    roomId: string;
    players: {
        id: string;                          // Unique player identifier
        instanceId: string;                  // Which server instance manages this player
        socketId: string;                    // Socket.IO connection ID
        state: any;                          // Player's private game state
        isAlive: boolean;                    // Whether player is still in the game
        currentActions?: IUserActions;       // Phase 1: Actions submitted by player
        trustedState?: ITrustedState;        // Phase 4: Computed state after spell effects
    }[];
    gameData: any;                          // Additional game-specific data
    turn: number;                           // Current turn number (increments after each cycle)
    currentPhase: GamePhase;                // Current phase within the turn
    phaseStartTime: number;                 // Timestamp when current phase started
    phaseTimeout: number;                   // Phase duration in milliseconds
    playersReady: string[];                 // Players who completed current phase
    status: 'waiting' | 'active' | 'finished'; // Overall game status
    createdAt: number;                      // Game creation timestamp
    updatedAt: number;                      // Last modification timestamp
}

interface SocketMapping {
    socketId: string;
    instanceId: string;
    roomId?: string;
    playerId?: string;
}

@Injectable()
export class GameStateService {
    public redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    private instanceId = `${process.pid}-${Date.now()}`;

    constructor() {
        this.redisClient.on('error', err => console.error('GameStateService Redis Client Error', err));
        this.redisClient.connect().then(() => console.log('GameStateService Redis Connected'));
    }

    /**
     * Get the current instance ID
     * @returns The unique identifier for this instance
     */
    getInstanceId(): string {
        return this.instanceId;
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
                isAlive: true,
                currentActions: undefined,
                trustedState: undefined,
            })),
            gameData: {},
            turn: 0,
            currentPhase: GamePhase.SPELL_CASTING,
            phaseStartTime: Date.now(),
            phaseTimeout: 30000, // 30 seconds default
            playersReady: [],
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
            originInstanceId: this.instanceId,
            timestamp: Date.now(),
        }));
        console.log(`Published ${event} to room ${roomId}`);
    }

    /**
     * Subscribe to cross-instance room events
     * @param callback - Handler invoked with parsed message `{ roomId, event, data, originInstanceId, timestamp }`
     * @dev Creates a dedicated Redis client in subscriber mode, connects, and
     * subscribes to `room_events`. Each message is parsed and passed to the
     * provided callback. Parsing errors are caught and logged.
     */
    async subscribeToRoomEvents(callback: (data: { roomId: string; event: string; data: any; originInstanceId: string; timestamp: number }) => void): Promise<void> {
        const subscriber = this.redisClient.duplicate();
        await subscriber.connect();
        
        await subscriber.subscribe('room_events', (message) => {
            try {
                const parsed = JSON.parse(message);
                // Ignore events published by this same instance to avoid duplicate local handling
                if (parsed.originInstanceId && parsed.originInstanceId === this.instanceId) {
                    return;
                }
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

    // ==================== GAMEPLAY PHASE MANAGEMENT ====================
    
    /**
     * @notice Advances the game to the next phase in the 5-phase turn cycle
     * @dev Automatically handles turn transitions when reaching end of STATE_UPDATE phase
     * @param roomId The unique identifier for the game room
     * @return The new phase after advancement, or null if room doesn't exist
     * 
     * Phase Progression:
     * SPELL_CASTING → SPELL_PROPAGATION → SPELL_EFFECTS → END_OF_ROUND → STATE_UPDATE → (new turn) SPELL_CASTING
     * 
     * Side Effects:
     * - Updates currentPhase, phaseStartTime, and clears playersReady
     * - Increments turn counter when cycling back to SPELL_CASTING
     * - Persists changes to Redis for multi-instance consistency
     */
    async advanceGamePhase(roomId: string): Promise<GamePhase | null> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) return null;

        const phases = Object.values(GamePhase);
        const currentPhaseIndex = phases.indexOf(gameState.currentPhase);
        const nextPhase = phases[currentPhaseIndex + 1];
        
        if (nextPhase) {
            await this.updateGameState(roomId, {
                currentPhase: nextPhase,
                phaseStartTime: Date.now(),
                playersReady: []
            });
            return nextPhase;
        } else {
            // Start new turn
            await this.updateGameState(roomId, {
                turn: gameState.turn + 1,
                currentPhase: GamePhase.SPELL_CASTING,
                phaseStartTime: Date.now(),
                playersReady: []
            });
            return GamePhase.SPELL_CASTING;
        }
    }

    /**
     * @notice Marks a player as having completed the current phase
     * @dev Used to track phase completion and trigger automatic advancement
     * @param roomId The unique identifier for the game room
     * @param playerId The unique identifier for the player
     * @return True if all alive players are now ready, false otherwise
     * 
     * Usage:
     * - Called when player submits actions (Phase 1)
     * - Called when player submits trusted state (Phase 4)
     * - Server uses return value to determine if phase can advance
     * 
     * Implementation Notes:
     * - Only counts alive players for readiness calculation
     * - Prevents duplicate entries for same player
     * - Automatically persists to Redis
     */
    async markPlayerReady(roomId: string, playerId: string): Promise<boolean> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) return false;

        if (!gameState.playersReady.includes(playerId)) {
            gameState.playersReady.push(playerId);
            await this.updateGameState(roomId, { playersReady: gameState.playersReady });
        }

        // Check if all alive players are ready
        const alivePlayers = gameState.players.filter(p => p.isAlive);
        return gameState.playersReady.length >= alivePlayers.length;
    }

    /**
     * @notice Stores player's intended actions for Phase 1 (Spell Casting)
     * @dev Actions are held until all players submit, then broadcast in Phase 2
     * @param roomId The unique identifier for the game room
     * @param playerId The unique identifier for the player
     * @param actions The player's actions including spells and signatures
     * 
     * Validation:
     * - Ensures game state exists
     * - Verifies player exists in the game
     * - Should only be called during SPELL_CASTING phase
     * 
     * Storage:
     * - Actions stored in player's currentActions field
     * - Persisted to Redis for multi-instance access
     * - Retrieved later via getAllPlayerActions()
     */
    async storePlayerActions(roomId: string, playerId: string, actions: IUserActions): Promise<void> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) throw new Error(`Game state not found for room ${roomId}`);

        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        
        if (playerIndex === -1 || !gameState.players[playerIndex]) throw new Error(`Player ${playerId} not found in room ${roomId}`);
       
        gameState.players[playerIndex].currentActions = actions;
        await this.updateGameState(roomId, { players: gameState.players });
    }

    /**
     * @notice Retrieves all player actions for Phase 2 (Spell Propagation)
     * @dev Called when all players have submitted actions to broadcast them
     * @param roomId The unique identifier for the game room
     * @return Record mapping player IDs to their submitted actions
     * 
     * Usage:
     * - Server calls this when transitioning to SPELL_PROPAGATION
     * - Result is broadcast to all players via WebSocket
     * - Players use this data to apply spell effects locally
     * 
     * Filtering:
     * - Only includes actions from alive players
     * - Only includes players who have submitted actions
     * - Returns empty object if no actions available
     */
    async getAllPlayerActions(roomId: string): Promise<Record<string, IUserActions>> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) return {};

        const actions: Record<string, IUserActions> = {};
        for (const player of gameState.players) {
            if (player.isAlive && player.currentActions) {
                actions[player.id] = player.currentActions;
            }
        }
        return actions;
    }

    /**
     * @notice Stores player's computed state for Phase 4 (End of Round)
     * @dev Players submit this after locally applying all spell effects
     * @param roomId The unique identifier for the game room
     * @param playerId The unique identifier for the player
     * @param trustedState The player's computed state with cryptographic proofs
     * 
     * Trusted State Contents:
     * - stateCommit: Cryptographic commitment to private state
     * - publicState: Visible information (HP, position, effects)
     * - signature: Proof of state validity
     * 
     * Validation:
     * - Ensures game state exists
     * - Verifies player exists and is alive
     * - Should only be called during END_OF_ROUND phase
     * 
     * Storage:
     * - Stored in player's trustedState field
     * - Retrieved later via getAllTrustedStates()
     */
    async storeTrustedState(roomId: string, playerId: string, trustedState: ITrustedState): Promise<void> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) throw new Error(`Game state not found for room ${roomId}`);

        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1 || !gameState.players[playerIndex]) throw new Error(`Player ${playerId} not found in room ${roomId}`);

        gameState.players[playerIndex].trustedState = trustedState;
        await this.updateGameState(roomId, { players: gameState.players });
    }

    /**
     * Get all trusted states for current turn
     * @param roomId - The room identifier
     * @returns Array of trusted states from alive players
     */
    async getAllTrustedStates(roomId: string): Promise<ITrustedState[]> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) return [];

        return gameState.players
            .filter(p => p.isAlive && p.trustedState)
            .map(p => p.trustedState!);
    }

    /**
     * @notice Eliminates a player from the game and checks win conditions
     * @dev Called when a player's HP reaches zero or they're eliminated by game rules
     * @param roomId The unique identifier for the game room
     * @param playerId The unique identifier for the eliminated player
     * @return Winner's player ID if game ended, 'draw' if no players remain, null if game continues
     * 
     * Win Condition Logic:
     * - If 1 player remains alive: Return winner ID, set status to 'finished'
     * - If 0 players remain alive: Return 'draw', set status to 'finished'  
     * - If 2+ players remain: Return null, game continues
     * 
     * Side Effects:
     * - Sets player's isAlive flag to false
     * - Updates game status when win conditions are met
     * - Persists changes to Redis
     * 
     * Usage:
     * - Gateway calls this when receiving 'reportDead' message
     * - Return value determines if 'gameEnd' event should be broadcast
     */
    async markPlayerDead(roomId: string, playerId: string): Promise<string | null> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) return null;

        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1 || !gameState.players[playerIndex]) return null;

        gameState.players[playerIndex].isAlive = false;
        
        // Check for winner
        const alivePlayers = gameState.players.filter(p => p.isAlive);
        if (alivePlayers.length === 1) {
            await this.updateGameState(roomId, { 
                players: gameState.players,
                status: 'finished' 
            });
            return alivePlayers[0]?.id || null; // Winner ID
        } else if (alivePlayers.length === 0) {
            // Draw - no winner
            await this.updateGameState(roomId, { 
                players: gameState.players,
                status: 'finished' 
            });
            return 'draw';
        }
        
        await this.updateGameState(roomId, { players: gameState.players });
        return null;
    }

    /**
     * Get alive players count
     * @param roomId - The room identifier
     * @returns Number of alive players
     */
    async getAlivePlayersCount(roomId: string): Promise<number> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) return 0;

        return gameState.players.filter(p => p.isAlive).length;
    }

    /**
     * Clear turn data (actions and trusted states) for new turn
     * @param roomId - The room identifier
     */
    async clearTurnData(roomId: string): Promise<void> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) return;

        // Clear actions and trusted states for all players
        for (const player of gameState.players) {
            player.currentActions = undefined;
            player.trustedState = undefined;
        }

        await this.updateGameState(roomId, { 
            players: gameState.players,
            playersReady: []
        });
    }

    /**
     * Check if phase has timed out
     * @param roomId - The room identifier
     * @returns True if current phase has exceeded timeout
     */
    async hasPhaseTimedOut(roomId: string): Promise<boolean> {
        const gameState = await this.getGameState(roomId);
        if (!gameState) return false;

        const elapsed = Date.now() - gameState.phaseStartTime;
        return elapsed > gameState.phaseTimeout;
    }

    /**
     * Set phase timeout for current phase
     * @param roomId - The room identifier
     * @param timeoutMs - Timeout in milliseconds
     */
    async setPhaseTimeout(roomId: string, timeoutMs: number): Promise<void> {
        await this.updateGameState(roomId, { phaseTimeout: timeoutMs });
    }

    /**
     * ✅ NEW: Mark room for cleanup (used by cron job)
     */
    async markRoomForCleanup(roomId: string, reason: string): Promise<void> {
        const cleanupKey = `room_cleanup:${roomId}`;
        await this.redisClient.set(cleanupKey, JSON.stringify({
            roomId,
            reason,
            markedAt: Date.now()
        }), { EX: 3600 }); // Expire in 1 hour as backup
        
        console.log(`📝 Marked room ${roomId} for cleanup (reason: ${reason})`);
    }

    /**
     * ✅ NEW: Get rooms marked for cleanup
     */
    async getRoomsMarkedForCleanup(): Promise<Array<{ roomId: string; reason: string; markedAt: number }>> {
        const keys = await this.redisClient.keys('room_cleanup:*');
        const rooms: Array<{ roomId: string; reason: string; markedAt: number }> = [];
        
        for (const key of keys) {
            const data = await this.redisClient.get(key);
            if (data) {
                const roomData = JSON.parse(data) as { roomId: string; reason: string; markedAt: number };
                rooms.push(roomData);
                await this.redisClient.del(key); // Remove after reading
            }
        }
        
        return rooms;
    }

    /**
     * ✅ NEW: Clean up dead instances (called by cron)
     */
    async cleanupDeadInstances(): Promise<void> {
        const instanceKeys = await this.redisClient.keys('instance_heartbeat:*');
        const now = Date.now();
        
        for (const key of instanceKeys) {
            const instanceId = key.replace('instance_heartbeat:', '');
            const lastHeartbeat = await this.redisClient.get(key);
            
            if (!lastHeartbeat || (now - parseInt(lastHeartbeat)) > 120000) { // 2 minute timeout
                console.log(`🚨 Dead instance detected: ${instanceId}`);
                await this.cleanupInstanceResources(instanceId);
                await this.redisClient.del(key);
            }
        }
    }

    /**
     * ✅ NEW: Update instance heartbeat (called by cron)
     */
    async updateHeartbeat(): Promise<void> {
        await this.redisClient.set(
            `instance_heartbeat:${this.instanceId}`,
            Date.now().toString(),
            { EX: 180 } // 3 minute expiry
        );
    }

    /**
     * ✅ NEW: Get inactive rooms (called by cron)
     */
    async getInactiveRooms(maxAge: number = 3600000): Promise<string[]> {
        const now = Date.now();
        const inactiveRooms: string[] = [];
        
        const keys = await this.redisClient.keys('game_state:*');
        
        for (const key of keys) {
            const roomId = key.replace('game_state:', '');
            const gameState = await this.getGameState(roomId);
            
            if (gameState && (now - gameState.updatedAt) > maxAge) {
                inactiveRooms.push(roomId);
            }
        }
        
        return inactiveRooms;
    }

    /**
     * ✅ ENHANCED: Room cleanup with proper resource management
     */
    async cleanupRoom(roomId: string): Promise<void> {
        console.log(`🧹 Cleaning up room state for ${roomId}`);
        
        try {
            // Remove all room-related keys
            const keysToDelete = [
                `game_state:${roomId}`,
                `player_actions:${roomId}`,
                `trusted_states:${roomId}`,
                `room_cleanup:${roomId}`
            ];
            
            for (const key of keysToDelete) {
                await this.redisClient.del(key);
            }
            
            // Notify other instances
            await this.publishToRoom(roomId, 'room_cleanup', { 
                roomId, 
                timestamp: Date.now(),
                instanceId: this.instanceId 
            });
            
            console.log(`✅ Room state cleaned up for ${roomId}`);
        } catch (error) {
            console.error(`Failed to cleanup room state for ${roomId}:`, error);
            throw error;
        }
    }

    private async cleanupInstanceResources(instanceId: string): Promise<void> {
        // Remove all socket mappings for this instance
        const allMappings = await this.redisClient.hGetAll('socket_mappings');
        const instanceMappings = Object.entries(allMappings)
            .filter(([_, mapping]) => {
                const parsed = JSON.parse(mapping);
                return parsed.instanceId === instanceId;
            });

        for (const [socketId, _] of instanceMappings) {
            await this.redisClient.hDel('socket_mappings', socketId);
        }

        console.log(`Cleaned up ${instanceMappings.length} socket mappings for dead instance ${instanceId}`);
    }
} 