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

    async unregisterSocket(socketId: string): Promise<void> {
        await this.redisClient.hDel('socket_mappings', socketId);
        console.log(`Unregistered socket ${socketId}`);
    }

    async getSocketMapping(socketId: string): Promise<SocketMapping | null> {
        const mapping = await this.redisClient.hGet('socket_mappings', socketId);
        return mapping ? JSON.parse(mapping) : null;
    }

    async getSocketsInRoom(roomId: string): Promise<SocketMapping[]> {
        const allMappings = await this.redisClient.hGetAll('socket_mappings');
        return Object.values(allMappings)
            .map(m => JSON.parse(m))
            .filter(m => m.roomId === roomId);
    }

    // Game State Management
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

    async getGameState(roomId: string): Promise<GameState | null> {
        const state = await this.redisClient.hGet('game_states', roomId);
        return state ? JSON.parse(state) : null;
    }

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

    async removeGameState(roomId: string): Promise<void> {
        await this.redisClient.hDel('game_states', roomId);
        console.log(`Removed game state for room ${roomId}`);
    }

    // Cross-instance communication
    async publishToRoom(roomId: string, event: string, data: any): Promise<void> {
        await this.redisClient.publish('room_events', JSON.stringify({
            roomId,
            event,
            data,
            timestamp: Date.now(),
        }));
        console.log(`Published ${event} to room ${roomId}`);
    }

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

    async disconnect(): Promise<void> {
        await this.cleanupInstance();
        await this.redisClient.quit();
        console.log('GameStateService Redis Disconnected');
    }
} 