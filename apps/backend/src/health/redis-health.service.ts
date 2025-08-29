import { Injectable } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

export interface HealthStatus {
  redis: boolean;
  matchmaking: boolean;
  gameStates: boolean;
  socketMappings: boolean;
  details: {
    redisConnection: boolean;
    matchmakingData: number;
    activeGameStates: number;
    activeSocketMappings: number;
    activeRooms: number;
  };
}

@Injectable()
export class RedisHealthService {
  private redisClient: RedisClientType = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  constructor() {
    this.redisClient.on('error', (err) =>
      console.error('RedisHealthService Redis Client Error', err)
    );
    this.redisClient
      .connect()
      .then(() => console.log('RedisHealthService Redis Connected'));
  }

  async checkHealth(): Promise<HealthStatus> {
    try {
      // Check Redis connection
      await this.redisClient.ping();
      const redisConnection = true;

      // Get matchmaking data
      const levels = [2, 3];
      let totalWaitingPlayers = 0;
      for (const level of levels) {
        const waiting = await this.redisClient.lRange(
          `waiting:level:${level}`,
          0,
          -1
        );
        totalWaitingPlayers += waiting.length;
      }

      // Get active matches
      const matches = await this.redisClient.hGetAll('matches');
      const activeRooms = Object.keys(matches).length;

      // Get active game states
      const gameStates = await this.redisClient.hGetAll('game_states');
      const activeGameStates = Object.keys(gameStates).length;

      // Get active socket mappings
      const socketMappings = await this.redisClient.hGetAll('socket_mappings');
      const activeSocketMappings = Object.keys(socketMappings).length;

      return {
        redis: redisConnection,
        matchmaking: totalWaitingPlayers >= 0,
        gameStates: activeGameStates >= 0,
        socketMappings: activeSocketMappings >= 0,
        details: {
          redisConnection,
          matchmakingData: totalWaitingPlayers,
          activeGameStates,
          activeSocketMappings,
          activeRooms,
        },
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        redis: false,
        matchmaking: false,
        gameStates: false,
        socketMappings: false,
        details: {
          redisConnection: false,
          matchmakingData: 0,
          activeGameStates: 0,
          activeSocketMappings: 0,
          activeRooms: 0,
        },
      };
    }
  }

  async getDetailedStats() {
    try {
      const stats = {
        matchmaking: {} as any,
        gameStates: {} as any,
        socketMappings: {} as any,
        rooms: {} as any,
      };

      // Matchmaking stats
      const levels = [2, 3];
      for (const level of levels) {
        const waiting = await this.redisClient.lRange(
          `waiting:level:${level}`,
          0,
          -1
        );
        stats.matchmaking[`level_${level}`] = waiting.length;
      }

      // Game states stats
      const gameStates = await this.redisClient.hGetAll('game_states');
      stats.gameStates.total = Object.keys(gameStates).length;
      stats.gameStates.rooms = Object.keys(gameStates);

      // Socket mappings stats
      const socketMappings = await this.redisClient.hGetAll('socket_mappings');
      const mappings = Object.values(socketMappings).map((m) => JSON.parse(m));
      const instanceGroups = mappings.reduce(
        (acc, mapping) => {
          acc[mapping.instanceId] = (acc[mapping.instanceId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      stats.socketMappings.total = Object.keys(socketMappings).length;
      stats.socketMappings.byInstance = instanceGroups;

      // Room stats
      const matches = await this.redisClient.hGetAll('matches');
      stats.rooms.total = Object.keys(matches).length;
      stats.rooms.active = Object.keys(matches);

      return stats;
    } catch (error) {
      console.error('Failed to get detailed stats:', error);
      return null;
    }
  }

  async cleanupOrphanedData(): Promise<{ cleaned: number; errors: number }> {
    let cleaned = 0;
    let errors = 0;

    try {
      // Clean up orphaned socket mappings (sockets that don't exist in any room)
      const socketMappings = await this.redisClient.hGetAll('socket_mappings');
      const gameStates = await this.redisClient.hGetAll('game_states');
      const matches = await this.redisClient.hGetAll('matches');

      const activeRooms = new Set(Object.keys(matches));
      const activeGameStates = new Set(Object.keys(gameStates));

      for (const [socketId, mappingStr] of Object.entries(socketMappings)) {
        try {
          const mapping = JSON.parse(mappingStr);

          // If socket is mapped to a room that doesn't exist, clean it up
          if (
            mapping.roomId &&
            !activeRooms.has(mapping.roomId) &&
            !activeGameStates.has(mapping.roomId)
          ) {
            await this.redisClient.hDel('socket_mappings', socketId);
            cleaned++;
          }
        } catch (error) {
          errors++;
          console.error(`Error processing socket mapping ${socketId}:`, error);
        }
      }

      console.log(
        `Cleanup completed: ${cleaned} items cleaned, ${errors} errors`
      );
    } catch (error) {
      console.error('Cleanup failed:', error);
      errors++;
    }

    return { cleaned, errors };
  }

  async disconnect() {
    await this.redisClient.quit();
    console.log('RedisHealthService Redis Disconnected');
  }
}
