import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameStateService } from './game-state.service';
import {
    IAddToQueue,
    IAddToQueueResponse,
    IRemoveFromQueue,
    IUpdateQueue,
    IFoundMatch,
    IPublicState,
  } from "../../../common/types/matchmaking.types";

/**
 * @dev WebSocket gateway responsible for orchestrating real-time gameplay and
 * matchmaking events. Uses the Socket.IO Redis adapter to enable horizontal
 * scaling: messages are fanned out across instances via Redis pub/sub so that
 * players connected to different node processes remain in sync.
 */
@WebSocketGateway({
    cors: { origin: '*' },
})
export class GameSessionGateway {
    @WebSocketServer()
    server!: Server;

    constructor(
        private readonly matchmakingService: MatchmakingService,
        private readonly gameStateService: GameStateService
    ) { }

    /**
     * @dev Invoked once the gateway is initialized. Injects the Socket.IO
     * server instance into the matchmaking service (so it can join rooms and
     * emit locally) and subscribes to cross-instance room events from
     * `GameStateService`, routing them to `handleCrossInstanceEvent`.
     */
    afterInit() {
        console.log('WebSocket Gateway initialized');
        this.matchmakingService.setServer(this.server);

        // Configure Socket.IO Redis adapter at runtime so env is available
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();
        pubClient.on('error', err => console.error('Redis Pub Client Error', err));
        subClient.on('error', err => console.error('Redis Sub Client Error', err));
        pubClient.on('connect', () => console.log('Redis Pub Client Connected'));
        subClient.on('connect', () => console.log('Redis Sub Client Connected'));
        Promise.all([pubClient.connect(), subClient.connect()])
            .then(() => {
                this.server.adapter(createAdapter(pubClient, subClient));
            })
            .catch(err => console.error('Redis Connection Error', err));

        // Subscribe to cross-instance room events
        this.gameStateService.subscribeToRoomEvents(async (data) => {
            await this.handleCrossInstanceEvent(data);
        });
    }

    /**
     * @param socket - The socket instance
     * @dev Handles new socket connections. Registers a socket-to-instance
     * mapping in Redis so other processes can target this client even if they
     * do not host the socket locally.
     */
    handleConnection(socket: Socket) {
        console.log(`Client connected: ${socket.id}, Process ID: ${process.pid}`);
        // Register socket mapping
        this.gameStateService.registerSocket(socket).catch(err => 
            console.error('Failed to register socket mapping:', err)
        );
    }

    /**
     * @dev Handles socket disconnections. Cleans up Redis socket mapping and
     * informs the matchmaking service so the player leaves queues/rooms and
     * peers can be notified.
     */
    handleDisconnect(socket: Socket) {
        console.log(`Client disconnected: ${socket.id}`);
        // Clean up socket mapping and matchmaking
        this.gameStateService.unregisterSocket(socket.id).catch(err => 
            console.error('Failed to unregister socket mapping:', err)
        );
        this.matchmakingService.leaveMatchmaking(socket);
    }

    @SubscribeMessage('joinMatchmaking')
    /**
     * @param socket - The socket instance
     * @param data - The data object containing the addToQueue
     * @returns The result of the matchmaking service's joinMatchmaking method
     * @dev Entrypoint for clients to join a matchmaking queue. Delegates to the
     * matchmaking service which enqueues, attempts to match, and returns a
     * `roomId` when successful.
     */
    async handleJoinMatchmaking(socket: Socket, data: { addToQueue: IAddToQueue }) {
        return await this.matchmakingService.joinMatchmaking(socket, data.addToQueue);
    }

    @SubscribeMessage('gameMessage')
    /**
     * @param socket - The socket instance
     * @param data - The data object containing the roomId and message
     * @returns The result of the matchmaking service's getMatchInfo method
     * @dev Broadcasts a gameplay message to participants in a room. Verifies an
     * active match and state, emits to local sockets in the room, and publishes
     * the same event via Redis so other instances rebroadcast to their local
     * listeners.
     */
    async handleGameMessage(socket: Socket, data: { roomId: string; message: any }) {
        const match = await this.matchmakingService.getMatchInfo(data.roomId);
        const gameState = await this.gameStateService.getGameState(data.roomId);
        
        if (match && gameState && this.server) {
            console.log(`Broadcasting gameMessage to room ${data.roomId}: ${JSON.stringify(data.message)}`);
            
            // Emit to local sockets in the room
            this.server.to(data.roomId).emit('gameMessage', {
                roomId: data.roomId,
                sender: socket.id,
                message: data.message,
            });

            // Publish to other instances via Redis
            await this.gameStateService.publishToRoom(data.roomId, 'gameMessage', {
                sender: socket.id,
                message: data.message,
            });
        } else {
            console.error(`Failed to broadcast gameMessage: match=${!!match}, gameState=${!!gameState}, server=${!!this.server}, roomId=${data.roomId}`);
        }
    }

    @SubscribeMessage('updatePlayerState')
    /**
     * @param socket - The socket instance
     * @param data - The data object containing the roomId, playerId, and state
     * @returns The result of the gameStateService's updatePlayerState method
     * @dev Updates a player's state in the room and notifies peers. Persists the
     * per-player state via `GameStateService`, then publishes a
     * `playerStateUpdated` event to other instances and acknowledges the caller.
     */
    async handleUpdatePlayerState(socket: Socket, data: { roomId: string; playerId: string; state: any }) {
        try {
            await this.gameStateService.updatePlayerState(data.roomId, data.playerId, data.state);
            
            // Publish state update to other instances
            await this.gameStateService.publishToRoom(data.roomId, 'playerStateUpdated', {
                playerId: data.playerId,
                state: data.state,
            });
            
            socket.emit('playerStateUpdated', { success: true });
        } catch (error) {
            console.error('Failed to update player state:', error);
            socket.emit('playerStateUpdated', { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    @SubscribeMessage('cleanupQueue')
    /**
     * @param socket - The socket instance
     * @param data - The cleanup action data
     * @dev Handles queue cleanup requests for testing purposes.
     * Clears all players from the matchmaking queue and removes all active matches.
     */
    async handleCleanupQueue(socket: Socket, data: { action: string }) {
        if (data.action === 'clear') {
            try {
                console.log('🧹 Client requested queue cleanup');
                await this.matchmakingService.clearQueue();
                socket.emit('cleanupComplete', { success: true, message: 'Queue cleared successfully' });
            } catch (error) {
                console.error('Failed to cleanup queue:', error);
                socket.emit('cleanupComplete', { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
    }

    @SubscribeMessage('getGameState')
    /**
     * @param socket - The socket instance
     * @param data - The data object containing the roomId
     * @returns The current `GameState` for a room to the requesting client.
     * @dev Returns the current `GameState` for a room to the requesting client.
     * Errors are caught and sent back in the payload.
     */
    async handleGetGameState(socket: Socket, data: { roomId: string }) {
        try {
            const gameState = await this.gameStateService.getGameState(data.roomId);
            socket.emit('gameState', { roomId: data.roomId, state: gameState });
        } catch (error) {
            console.error('Failed to get game state:', error);
            socket.emit('gameState', { roomId: data.roomId, state: null, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    /**
     * @param data - The data object containing the roomId, event, data, originInstanceId, and timestamp
     * @dev Handles events published by other instances on the Redis channel and
     * re-emits them to any local sockets subscribed to the target room. For
     * `playerJoined`, attempts to join the player's socket to the room if the
     * socket is connected to this instance.
     */
    private async handleCrossInstanceEvent(data: { roomId: string; event: string; data: any; originInstanceId: string; timestamp: number }) {
        if (!this.server) return;

        // Skip events that originated from this instance to prevent double messages
        if (data.originInstanceId === this.gameStateService.getInstanceId()) {
            return;
        }

        switch (data.event) {
            case 'gameMessage':
                // Broadcast game message to local sockets in the room
                this.server.to(data.roomId).emit('gameMessage', {
                    roomId: data.roomId,
                    sender: data.data.sender,
                    message: data.data.message,
                });
                break;

            case 'playerStateUpdated':
                // Broadcast player state update to local sockets in the room
                this.server.to(data.roomId).emit('playerStateUpdated', {
                    playerId: data.data.playerId,
                    state: data.data.state,
                });
                break;

            case 'matchFound':
                // Handle match found event from other instances
                // If a specific socket is targeted, emit only to that socket; otherwise to room
                if (data.data?.targetSocketId) {
                    const target = this.server.sockets.sockets.get(data.data.targetSocketId);
                    if (target) {
                        target.emit('matchFound', data.data.payload);
                    }
                } else {
                    this.server.to(data.roomId).emit('matchFound', data.data?.payload ?? data.data);
                }
                break;

            case 'playerJoined':
                // Handle player joined event from other instances
                // data.data contains { playerId, roomId } from publisher
                // Look up by socketId; if not provided, try playerId as fallback
                const socketMapping = await this.gameStateService.getSocketMapping(data.data.socketId ?? data.data.playerId);
                if (socketMapping && this.server) {
                    const socket = this.server.sockets.sockets.get(socketMapping.socketId);
                    if (socket) {
                        socket.join(data.roomId);
                        console.log(`Player ${data.data.playerId} joined room ${data.roomId} via cross-instance event`);
                    }
                }
                break;

            case 'opponentDisconnected':
                // Handle opponent disconnection
                const gameState = await this.gameStateService.getGameState(data.roomId);
                if (gameState) {
                    const remainingPlayer = gameState.players.find(p => p.id === data.data.remainingPlayer);
                    if (remainingPlayer && this.server) {
                        const socket = this.server.sockets.sockets.get(remainingPlayer.socketId);
                        if (socket) {
                            socket.emit('opponentDisconnected');
                        }
                    }
                }
                break;

            default:
                console.log(`Unknown cross-instance event: ${data.event}`);
        }
    }
}