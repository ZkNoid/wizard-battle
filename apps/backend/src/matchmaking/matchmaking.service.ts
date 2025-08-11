import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { GameStateService } from '../game-session/game-state.service';

/**
 * Player interface
 */
interface Player {
    id: string;
    level: number;
}

/**
 * Match interface
 */
interface Match {
    player1: Player;
    player2: Player;
    roomId: string;
}

/**
 * MatchmakingService
 */
@Injectable()
export class MatchmakingService {
    private server: Server | null = null;
    private redisClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379"}); //process.env.REDIS_URL });

    constructor(private readonly gameStateService: GameStateService) {
        this.redisClient.on('error', err => console.error('Redis Client Error', err));
        this.redisClient.connect().then(() => console.log('MatchmakingService Redis Connected'));
    }

    /**
     * Set the server
     * @param server - The server
     * @dev Injects the Socket.IO `Server` instance used for emitting events and
     * joining/leaving rooms on this node process. Must be called by the
     * WebSocket gateway during bootstrap before any matchmaking flows so that
     * local emits and room joins for matched players work when their sockets
     * reside on this instance.
     */
    setServer(server: Server) {
        this.server = server;
        console.log('Server set in MatchmakingService');
    }

    /**
     * Join matchmaking
     * @param socket - The socket
     * @param level - The level
     * @returns The room ID or `null` if no opponent is immediately found
     * @dev Registers the player's socket mapping, enqueues the player into a
     * Redis waiting list keyed by level (`waiting:level:<level>`), and attempts
     * to locate an opponent with the same level via `findMatch`. When a match
     * is found, it deterministically builds a room id by sorting socket ids,
     * removes both players from the waiting list, persists the match in the
     * Redis `matches` hash, creates initial game state, and updates socket
     * mappings with room information. It then joins any local sockets to the
     * room and notifies both players: a direct emit to the local socket and a
     * Redis pub/sub broadcast so peers on other instances receive the same
     * events. If no match is available yet, it emits a 'waiting' message and
     * returns `null`.
     */
    async joinMatchmaking(socket: Socket, level: number) {
        const player: Player = {
            id: socket.id,
            level,
        };

        console.log(`Player ${player.id} (Level ${level}) joining matchmaking`);

        // Register socket mapping
        await this.gameStateService.registerSocket(socket);

        // Add player to Redis waiting list
        await this.redisClient.lPush(`waiting:level:${level}`, JSON.stringify(player));
        const waiting = await this.redisClient.lRange(`waiting:level:${level}`, 0, -1);
        console.log(`Current waiting players for level ${level}: ${waiting.join(', ')}`);

        socket.emit('waiting', { message: 'Waiting for a match...' });

        // Check for match
        const matchedPlayer = await this.findMatch(player, level);
        if (matchedPlayer) {
            console.log(`Match found for ${player.id} with ${matchedPlayer.id}`);

            // Sort player IDs for consistent room ID
            const [firstPlayer, secondPlayer] =
                player.id < matchedPlayer.id ? [player, matchedPlayer] : [matchedPlayer, player];
            const roomId = `${firstPlayer.id}-${secondPlayer.id}`;

            // Create match
            const match: Match = {
                player1: firstPlayer,
                player2: secondPlayer,
                roomId,
            };

            // Remove both players from Redis waiting list
            await this.redisClient.lRem(`waiting:level:${level}`, 1, JSON.stringify(player));
            await this.redisClient.lRem(`waiting:level:${level}`, 1, JSON.stringify(matchedPlayer));
            console.log(`Players ${player.id} and ${matchedPlayer.id} removed from waiting list`);

            // Store match in Redis
            await this.redisClient.hSet('matches', roomId, JSON.stringify(match));
            const activeRooms = await this.redisClient.hKeys('matches');
            console.log(`Active rooms: ${activeRooms.join(', ')}`);

            // Create game state
            await this.gameStateService.createGameState(roomId, [
                { id: firstPlayer.id, socketId: firstPlayer.id },
                { id: secondPlayer.id, socketId: secondPlayer.id }
            ]);

            // Update socket mappings with room information
            await this.gameStateService.registerSocket(socket, player.id, roomId);
            
            // Find and update the matched player's socket mapping
            const matchedSocketMapping = await this.gameStateService.getSocketMapping(matchedPlayer.id);
            if (matchedSocketMapping) {
                // Update the matched player's mapping with room info
                await this.gameStateService.registerSocket(
                    { id: matchedPlayer.id } as Socket, 
                    matchedPlayer.id, 
                    roomId
                );
            }

            // Join both players to room
            socket.join(roomId);
            
            // For the matched player, we need to notify them through Redis pub/sub
            // since they might be on a different instance
            await this.gameStateService.publishToRoom(roomId, 'playerJoined', {
                playerId: matchedPlayer.id,
                roomId: roomId
            });
            
            if (this.server) {
                const matchedSocket = this.server.sockets.sockets.get(matchedPlayer.id);
                if (matchedSocket) {
                    matchedSocket.join(roomId);
                    console.log(`Players ${player.id} and ${matchedPlayer.id} joined room ${roomId}`);
                } else {
                    console.log(`Matched player ${matchedPlayer.id} is on a different instance, will be notified via Redis`);
                }
            } else {
                console.error(`Server not initialized, cannot join matched player ${matchedPlayer.id} to room ${roomId}`);
            }

            // Notify players of match
            if (!this.server) {
                console.error('Server not initialized in MatchmakingService');
                return roomId;
            }
            
            // Emit to local socket
            socket.emit('matchFound', {
                roomId,
                players: [
                    { id: firstPlayer.id, level: firstPlayer.level },
                    { id: secondPlayer.id, level: secondPlayer.level },
                ],
            });
            
            // Publish match found event to other instances
            await this.gameStateService.publishToRoom(roomId, 'matchFound', {
                roomId,
                players: [
                    { id: firstPlayer.id, level: firstPlayer.level },
                    { id: secondPlayer.id, level: secondPlayer.level },
                ],
            });

            return roomId;
        }

        console.log(`No match found for ${player.id} (Level ${level})`);
        return null;
    }

    /**
     * Find a match
     * @param player - The player
     * @param level - The level
     * @returns The matched player or `null` if none found
     * @dev Reads the Redis list `waiting:level:<level>`, parses JSON entries, and
     * selects the first player with the same level and a different id. This is a
     * simple FIFO/same-level strategy (no ELO or skill distance). Returns
     * `null` when no candidate is available.
     */
    private async findMatch(player: Player, level: number): Promise<Player | null> {
        const waiting = await this.redisClient.lRange(`waiting:level:${level}`, 0, -1);
        const match = waiting
            .map(p => JSON.parse(p))
            .find(p => p.level === player.level && p.id !== player.id);
        console.log(`findMatch for ${player.id} (Level ${player.level}): ${match ? `Found ${match.id}` : 'No match'}`);
        return match || null;
    }

    /**
     * Leave matchmaking
     * @param socket - The socket
     * @dev Unregisters the player's socket mapping, removes their entry from all
     * level-specific waiting lists, then inspects the Redis `matches` hash to
     * determine if they are part of an active room. If so, it notifies the
     * opponent via Redis pub/sub (`opponentDisconnected`), removes the room's
     * game state, emits to and detaches the opponent's local socket when it
     * resides on this instance, and finally deletes the match record from
     * Redis.
     */
    async leaveMatchmaking(socket: Socket) {
        console.log(`Player ${socket.id} leaving matchmaking`);

        // Remove socket mapping
        await this.gameStateService.unregisterSocket(socket.id);

        // Remove from Redis waiting list for all possible levels
        const levels = [2, 3]; // Adjust based on your LEVELS from client.js
        for (const level of levels) {
            const waiting = await this.redisClient.lRange(`waiting:level:${level}`, 0, -1);
            const playerEntry = waiting.find(p => JSON.parse(p).id === socket.id);
            if (playerEntry) {
                await this.redisClient.lRem(`waiting:level:${level}`, 1, playerEntry);
            }
        }

        // Check for match in Redis
        const matches = await this.redisClient.hGetAll('matches');
        const matchEntry = Object.entries(matches).find(
            ([_, m]) => {
                const match = JSON.parse(m);
                return match.player1.id === socket.id || match.player2.id === socket.id;
            }
        );

        if (matchEntry) {
            const [roomId, m] = matchEntry;
            const match: Match = JSON.parse(m);
            const otherPlayer = match.player1.id === socket.id ? match.player2 : match.player1;
            
            // Notify other player through Redis pub/sub instead of direct socket access
            await this.gameStateService.publishToRoom(roomId, 'opponentDisconnected', {
                disconnectedPlayer: socket.id,
                remainingPlayer: otherPlayer.id
            });

            // Remove game state
            await this.gameStateService.removeGameState(roomId);
            
            if (this.server) {
                const otherSocket = this.server.sockets.sockets.get(otherPlayer.id);
                if (otherSocket) {
                    otherSocket.emit('opponentDisconnected');
                    otherSocket.leave(roomId);
                }
                console.log(`Player ${socket.id} left match ${roomId}`);
            }
            await this.redisClient.hDel('matches', roomId);
            const activeRooms = await this.redisClient.hKeys('matches');
            console.log(`Active rooms: ${activeRooms.join(', ')}`);
        }
    }

    /**
     * Get match info
     * @param roomId - The room ID
     * @returns The match info object or `null` if not found
     * @dev Fetches the serialized match object from the Redis `matches` hash and
     * parses it into a `Match` shape.
     */
    async getMatchInfo(roomId: string) {
        const match = await this.redisClient.hGet('matches', roomId);
        return match ? JSON.parse(match) : null;
    }

    /**
     * Disconnect
     * @dev Gracefully closes the Redis client connection. Intended to be called
     * from application shutdown hooks to release resources cleanly.
    */
    async disconnect() {
        await this.redisClient.quit();
        console.log('MatchmakingService Redis Disconnected');
    }
}