import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameStateService } from './game-state.service';

@WebSocketGateway({
    cors: { origin: '*' },
    adapter: (() => {
        const pubClient = createClient({ url: 'redis://localhost:6379' });
        const subClient = pubClient.duplicate();
        pubClient.on('error', err => console.error('Redis Pub Client Error', err));
        subClient.on('error', err => console.error('Redis Sub Client Error', err));
        pubClient.on('connect', () => console.log('Redis Pub Client Connected'));
        subClient.on('connect', () => console.log('Redis Sub Client Connected'));
        Promise.all([pubClient.connect(), subClient.connect()]).catch(err => console.error('Redis Connection Error', err));
        return createAdapter(pubClient, subClient);
    })(),
})
export class GameSessionGateway {
    @WebSocketServer()
    server!: Server;

    constructor(
        private readonly matchmakingService: MatchmakingService,
        private readonly gameStateService: GameStateService
    ) { }

    afterInit() {
        console.log('WebSocket Gateway initialized');
        this.matchmakingService.setServer(this.server);
        
        // Subscribe to cross-instance room events
        this.gameStateService.subscribeToRoomEvents(async (data) => {
            await this.handleCrossInstanceEvent(data);
        });
    }

    handleConnection(socket: Socket) {
        console.log(`Client connected: ${socket.id}, Process ID: ${process.pid}`);
        // Register socket mapping
        this.gameStateService.registerSocket(socket).catch(err => 
            console.error('Failed to register socket mapping:', err)
        );
    }

    handleDisconnect(socket: Socket) {
        console.log(`Client disconnected: ${socket.id}`);
        // Clean up socket mapping and matchmaking
        this.gameStateService.unregisterSocket(socket.id).catch(err => 
            console.error('Failed to unregister socket mapping:', err)
        );
        this.matchmakingService.leaveMatchmaking(socket);
    }

    @SubscribeMessage('joinMatchmaking')
    async handleJoinMatchmaking(socket: Socket, data: { level: number }) {
        return await this.matchmakingService.joinMatchmaking(socket, data.level);
    }

    @SubscribeMessage('gameMessage')
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

    @SubscribeMessage('getGameState')
    async handleGetGameState(socket: Socket, data: { roomId: string }) {
        try {
            const gameState = await this.gameStateService.getGameState(data.roomId);
            socket.emit('gameState', { roomId: data.roomId, state: gameState });
        } catch (error) {
            console.error('Failed to get game state:', error);
            socket.emit('gameState', { roomId: data.roomId, state: null, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    private async handleCrossInstanceEvent(data: { roomId: string; event: string; data: any }) {
        if (!this.server) return;

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
                this.server.to(data.roomId).emit('matchFound', data.data);
                break;

            case 'playerJoined':
                // Handle player joined event from other instances
                const socketMapping = await this.gameStateService.getSocketMapping(data.data.playerId);
                if (socketMapping && this.server) {
                    const socket = this.server.sockets.sockets.get(data.data.playerId);
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