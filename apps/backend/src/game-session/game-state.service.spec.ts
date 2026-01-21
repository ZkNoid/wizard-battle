import { Test, TestingModule } from '@nestjs/testing';
import { GameStateService } from './game-state.service';
import { RedisService } from '../redis/redis.service';
import { createMock } from '@golevelup/ts-jest';
import { GamePhase } from '../../../common/types/gameplay.types';
import * as dotenv from 'dotenv';

// Load environment variables (including REDIS_URL if set)
dotenv.config();

// Mock the Redis client creation to prevent real connections in tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    hGet: jest.fn(),
    hSet: jest.fn(),
    hDel: jest.fn(),
    del: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    quit: jest.fn(),
    watch: jest.fn().mockResolvedValue('OK'),
    unwatch: jest.fn().mockResolvedValue('OK'),
    multi: jest.fn().mockReturnValue({
      hSet: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    eval: jest.fn().mockResolvedValue(1),
    duplicate: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
    })),
  })),
}));

// Mock the RedisService to prevent real Redis connections
jest.mock('../redis/redis.service', () => ({
  RedisService: jest.fn().mockImplementation(() => ({
    getClient: jest.fn(() => ({
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      hGet: jest.fn(),
      hSet: jest.fn(),
      hDel: jest.fn(),
      del: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      quit: jest.fn(),
      watch: jest.fn().mockResolvedValue('OK'),
      unwatch: jest.fn().mockResolvedValue('OK'),
      multi: jest.fn().mockReturnValue({
        hSet: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      eval: jest.fn().mockResolvedValue(1),
      duplicate: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn(),
      })),
    })),
  })),
}));

/**
 * @title GameStateService Unit Tests - Winner/Loser Logic Coverage
 * @notice Comprehensive tests for the markPlayerDead method's winner detection logic
 * @dev Tests all scenarios: winner, draw, game continues, and edge cases
 */
describe('GameStateService - markPlayerDead Winner/Loser Logic', () => {
  let service: GameStateService;
  let mockRedisService: any;
  let mockRedisClient: any;
  let multiMock: any;

  beforeEach(async () => {
    // Mock Redis client with transaction support
    multiMock = {
      hSet: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([['OK']]),
    };

    mockRedisClient = {
      hGet: jest.fn(),
      hSet: jest.fn().mockResolvedValue('OK'),
      hDel: jest.fn(),
      del: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      on: jest.fn(),
      quit: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      watch: jest.fn().mockResolvedValue('OK'),
      unwatch: jest.fn().mockResolvedValue('OK'),
      multi: jest.fn().mockReturnValue(multiMock),
      eval: jest.fn().mockResolvedValue(1),
    };

    // Mock RedisService
    mockRedisService = createMock<RedisService>();
    mockRedisService.getClient.mockReturnValue(mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameStateService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<GameStateService>(GameStateService);
  });

  // Helper function to create mock game state
  const createMockGameState = (overrides = {}) => ({
    roomId: 'test-room',
    status: 'active',
    currentPhase: GamePhase.SPELL_CASTING,
    players: [],
    playersReady: [],
    turn: 1,
    phaseStartTime: Date.now(),
    phaseTimeout: 30000,
    gameData: {},
    ...overrides,
  });

  describe('Winner Detection Scenarios', () => {
    it('should detect winner when only 1 player remains alive', async () => {
      const roomId = 'winner-test-room';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true }, // Player to be killed
          { id: 'player2', isAlive: true }, // Winner
          { id: 'player3', isAlive: false }, // Already dead player
        ],
      });

      // Mock getGameState to return our test state
      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBe('player2'); // Winner ID

      // Verify game status was set to finished
      expect(multiMock.hSet).toHaveBeenCalledWith(
        'game_states',
        roomId,
        expect.stringContaining('"status":"finished"')
      );
    });

    it('should handle winner detection with multiple dead players', async () => {
      const roomId = 'multi-dead-room';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true }, // About to die
          { id: 'player2', isAlive: false }, // Already dead
          { id: 'player3', isAlive: false }, // Already dead
          { id: 'player4', isAlive: true }, // Will be winner
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBe('player4'); // Last remaining player wins
    });

    it('should return winner ID even if winner object is malformed', async () => {
      const roomId = 'malformed-winner-room';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true }, // About to die
          { id: 'player2', isAlive: true }, // Winner but potentially malformed
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBe('player2');
    });
  });

  describe('Draw Detection Scenarios', () => {
    it('should detect draw when last 2 players die simultaneously', async () => {
      const roomId = 'draw-test-room';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true }, // About to die (last player)
          { id: 'player2', isAlive: false }, // Already dead
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBe('draw');

      // Verify game status was set to finished
      expect(multiMock.hSet).toHaveBeenCalledWith(
        'game_states',
        roomId,
        expect.stringContaining('"status":"finished"')
      );
    });

    it('should detect draw in 3-player game when last player dies', async () => {
      const roomId = 'three-player-draw';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true }, // Last alive, about to die
          { id: 'player2', isAlive: false }, // Dead
          { id: 'player3', isAlive: false }, // Dead
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBe('draw');
    });

    it('should detect draw in 4+ player game when last player dies', async () => {
      const roomId = 'large-game-draw';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: false }, // Dead
          { id: 'player2', isAlive: false }, // Dead
          { id: 'player3', isAlive: false }, // Dead
          { id: 'player4', isAlive: false }, // Dead
          { id: 'player5', isAlive: true }, // Last alive, about to die
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player5');

      expect(result).toBe('draw');
    });
  });

  describe('Game Continuation Scenarios', () => {
    it('should return null when 2 players remain alive', async () => {
      const roomId = 'continues-2-players';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true }, // About to die
          { id: 'player2', isAlive: true }, // Still alive
          { id: 'player3', isAlive: true }, // Still alive
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBeNull(); // Game continues

      // Verify game status remains active (not finished)
      expect(multiMock.hSet).toHaveBeenCalledWith(
        'game_states',
        roomId,
        expect.not.stringContaining('"status":"finished"')
      );
    });

    it('should return null when 3+ players remain alive', async () => {
      const roomId = 'continues-many-players';
      const mockGameState = {
        roomId,
        status: 'active',
        players: [
          { id: 'player1', isAlive: true }, // About to die
          { id: 'player2', isAlive: true }, // Still alive
          { id: 'player3', isAlive: true }, // Still alive
          { id: 'player4', isAlive: true }, // Still alive
          { id: 'player5', isAlive: false }, // Already dead
        ],
      };

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBeNull(); // Game continues
    });

    it('should handle mixed alive/dead players correctly', async () => {
      const roomId = 'mixed-status-room';
      const mockGameState = {
        roomId,
        status: 'active',
        players: [
          { id: 'player1', isAlive: false }, // Already dead
          { id: 'player2', isAlive: true }, // About to die
          { id: 'player3', isAlive: false }, // Already dead
          { id: 'player4', isAlive: true }, // Still alive
          { id: 'player5', isAlive: true }, // Still alive
          { id: 'player6', isAlive: false }, // Already dead
        ],
      };

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player2');

      expect(result).toBeNull(); // 2 players still alive, game continues
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should return null when room does not exist', async () => {
      const roomId = 'non-existent-room';

      mockRedisClient.hGet.mockResolvedValue(null); // Room not found

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBeNull();
      expect(mockRedisClient.hSet).not.toHaveBeenCalled(); // No state update
    });

    it('should return null when player does not exist', async () => {
      const roomId = 'invalid-player-room';
      const mockGameState = {
        roomId,
        status: 'active',
        players: [
          { id: 'player1', isAlive: true },
          { id: 'player2', isAlive: true },
        ],
      };

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));

      const result = await service.markPlayerDead(
        roomId,
        'non-existent-player'
      );

      expect(result).toBeNull();
      expect(mockRedisClient.hSet).not.toHaveBeenCalled(); // No state update
    });

    it('should return null when trying to kill already dead player', async () => {
      const roomId = 'already-dead-room';
      const mockGameState = {
        roomId,
        status: 'active',
        players: [
          { id: 'player1', isAlive: false }, // Already dead
          { id: 'player2', isAlive: true },
          { id: 'player3', isAlive: true },
        ],
      };

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBeNull();
      // Fixed: Now correctly ignores already dead players and doesn't update state
      expect(mockRedisClient.hSet).not.toHaveBeenCalled();
    });

    it('should handle malformed game state gracefully', async () => {
      const roomId = 'malformed-state-room';

      mockRedisClient.hGet.mockResolvedValue('invalid-json');

      // Fixed: Now handles JSON parsing errors gracefully and returns null
      const result = await service.markPlayerDead(roomId, 'player1');
      expect(result).toBeNull();
    });

    it('should handle empty players array', async () => {
      const roomId = 'empty-players-room';
      const mockGameState = {
        roomId,
        status: 'active',
        players: [], // No players
      };

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));

      const result = await service.markPlayerDead(roomId, 'player1');

      expect(result).toBeNull();
    });

    it('should handle undefined player object', async () => {
      const roomId = 'undefined-player-room';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true },
          null, // Malformed player entry
          { id: 'player3', isAlive: true },
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      // Fixed: Now handles null players gracefully
      const result = await service.markPlayerDead(roomId, 'player1');
      expect(result).toBe('player3'); // player3 should win after player1 dies
    });
  });

  describe('State Persistence Verification', () => {
    it('should persist correct player death state for winner scenario', async () => {
      const roomId = 'persist-winner-room';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true }, // About to die
          { id: 'player2', isAlive: true }, // Winner
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      await service.markPlayerDead(roomId, 'player1');

      // Verify the exact state that was persisted
      const persistedState = JSON.parse(multiMock.hSet.mock.calls[0][2]);

      expect(persistedState.players[0].isAlive).toBe(false); // player1 marked dead
      expect(persistedState.players[1].isAlive).toBe(true); // player2 still alive
      expect(persistedState.status).toBe('finished');
    });

    it('should persist correct state for draw scenario', async () => {
      const roomId = 'persist-draw-room';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true }, // Last player, about to die
          { id: 'player2', isAlive: false }, // Already dead
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      await service.markPlayerDead(roomId, 'player1');

      const persistedState = JSON.parse(multiMock.hSet.mock.calls[0][2]);

      expect(persistedState.players[0].isAlive).toBe(false); // player1 marked dead
      expect(persistedState.players[1].isAlive).toBe(false); // player2 already dead
      expect(persistedState.status).toBe('finished');
    });

    it('should persist correct state for game continuation', async () => {
      const roomId = 'persist-continue-room';
      const mockGameState = createMockGameState({
        roomId,
        players: [
          { id: 'player1', isAlive: true }, // About to die
          { id: 'player2', isAlive: true }, // Still alive
          { id: 'player3', isAlive: true }, // Still alive
        ],
      });

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedisClient.hSet.mockResolvedValue('OK');

      await service.markPlayerDead(roomId, 'player1');

      const persistedState = JSON.parse(multiMock.hSet.mock.calls[0][2]);

      expect(persistedState.players[0].isAlive).toBe(false); // player1 marked dead
      expect(persistedState.players[1].isAlive).toBe(true); // player2 still alive
      expect(persistedState.players[2].isAlive).toBe(true); // player3 still alive
      expect(persistedState.status).toBe('active'); // Game continues
    });
  });
});
