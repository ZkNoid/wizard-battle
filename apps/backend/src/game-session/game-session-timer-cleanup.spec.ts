import { Test, TestingModule } from '@nestjs/testing';
import { GamePhaseSchedulerService } from './game-phase-scheduler.service';
import { GameStateService } from './game-state.service';
import { GameSessionGateway } from './game-session.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { createMock } from '@golevelup/ts-jest';
import { GamePhase } from '../../../common/types/gameplay.types';

/**
 * @title Game Phase Scheduler Tests - Cron-Based Phase Management
 * @notice Tests to verify that the cron-based phase scheduler works correctly
 * @dev These tests verify the current architecture using GamePhaseSchedulerService
 *
 * Current Architecture:
 * 1. GamePhaseSchedulerService handles phase transitions via cron jobs
 * 2. No setTimeout/clearTimeout usage (eliminates timer leak issues)
 * 3. Redis-based state management with automatic cleanup
 * 4. Cross-instance coordination via Redis pub/sub
 */
describe('GamePhaseSchedulerService - Cron-Based Phase Management', () => {
  let scheduler: GamePhaseSchedulerService;
  let mockGameStateService: any;
  let mockGameSessionGateway: any;

  beforeEach(async () => {
    // Mock services
    mockGameStateService = createMock<GameStateService>();
    mockGameSessionGateway = createMock<GameSessionGateway>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamePhaseSchedulerService,
        { provide: GameStateService, useValue: mockGameStateService },
        { provide: GameSessionGateway, useValue: mockGameSessionGateway },
      ],
    }).compile();

    scheduler = module.get<GamePhaseSchedulerService>(
      GamePhaseSchedulerService
    );
  });

  describe('Phase Transition Logic', () => {
    it('should identify SPELL_PROPAGATION rooms ready for SPELL_EFFECTS transition', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.SPELL_PROPAGATION,
        phaseStartTime: Date.now() - 1500, // 1.5 seconds ago (>1 second threshold)
        players: [{ id: 'player1', isAlive: true }],
      };

      // Mock Redis hash keys (list of roomIds) and game state
      mockGameStateService.redisClient = {
        hKeys: jest.fn().mockResolvedValue([roomId]),
      };
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameSessionGateway.advanceToSpellEffects.mockResolvedValue(undefined);

      // Call the private method via reflection for testing
      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(1);
      expect(pendingTransitions[0]).toEqual({
        roomId,
        currentPhase: GamePhase.SPELL_PROPAGATION,
        nextPhase: GamePhase.SPELL_EFFECTS,
        delayMs: 0,
      });
    });

    it('should identify SPELL_EFFECTS rooms ready for END_OF_ROUND transition', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.SPELL_EFFECTS,
        phaseStartTime: Date.now() - 2500, // 2.5 seconds ago (>2 second threshold)
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = {
        hKeys: jest.fn().mockResolvedValue([roomId]),
      };
      mockGameStateService.getGameState.mockResolvedValue(gameState);

      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(1);
      expect(pendingTransitions[0]).toEqual({
        roomId,
        currentPhase: GamePhase.SPELL_EFFECTS,
        nextPhase: GamePhase.END_OF_ROUND,
        delayMs: 0,
      });
    });

    it('should identify STATE_UPDATE rooms ready for new turn', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.STATE_UPDATE,
        phaseStartTime: Date.now() - 2500, // 2.5 seconds ago (>2 second threshold)
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = {
        hKeys: jest.fn().mockResolvedValue([roomId]),
      };
      mockGameStateService.getGameState.mockResolvedValue(gameState);

      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(1);
      expect(pendingTransitions[0]).toEqual({
        roomId,
        currentPhase: GamePhase.STATE_UPDATE,
        nextPhase: GamePhase.SPELL_CASTING,
        delayMs: 0,
      });
    });

    it('should not transition rooms that are not ready', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.SPELL_PROPAGATION,
        phaseStartTime: Date.now() - 500, // 0.5 seconds ago (<1 second threshold)
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = {
        hKeys: jest.fn().mockResolvedValue([roomId]),
      };
      mockGameStateService.getGameState.mockResolvedValue(gameState);

      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(0);
    });

    it('should ignore inactive rooms', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'finished', // Not active
        currentPhase: GamePhase.SPELL_PROPAGATION,
        phaseStartTime: Date.now() - 2000,
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = {
        hKeys: jest.fn().mockResolvedValue([roomId]),
      };
      mockGameStateService.getGameState.mockResolvedValue(gameState);

      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(0);
    });
  });

  describe('Phase Transition Execution', () => {
    it('should execute SPELL_EFFECTS transition correctly', async () => {
      const transition = {
        roomId: 'test-room',
        currentPhase: GamePhase.SPELL_PROPAGATION,
        nextPhase: GamePhase.SPELL_EFFECTS,
        delayMs: 0,
      };

      mockGameSessionGateway.advanceToSpellEffects.mockResolvedValue(undefined);

      await (scheduler as any).executePhaseTransition(transition);

      expect(mockGameSessionGateway.advanceToSpellEffects).toHaveBeenCalledWith(
        'test-room'
      );
    });

    it('should execute new turn transition correctly', async () => {
      const transition = {
        roomId: 'test-room',
        currentPhase: GamePhase.STATE_UPDATE,
        nextPhase: GamePhase.SPELL_CASTING,
        delayMs: 0,
      };

      mockGameSessionGateway.startNextTurn.mockResolvedValue(undefined);

      await (scheduler as any).executePhaseTransition(transition);

      expect(mockGameSessionGateway.startNextTurn).toHaveBeenCalledWith(
        'test-room'
      );
    });

    it('should handle transition errors by cleaning up room', async () => {
      const transition = {
        roomId: 'test-room',
        currentPhase: GamePhase.SPELL_PROPAGATION,
        nextPhase: GamePhase.SPELL_EFFECTS,
        delayMs: 0,
      };

      mockGameSessionGateway.advanceToSpellEffects.mockRejectedValue(
        new Error('Transition failed')
      );
      mockGameStateService.cleanupRoom.mockResolvedValue(undefined);

      await (scheduler as any).executePhaseTransition(transition);

      expect(mockGameStateService.cleanupRoom).toHaveBeenCalledWith(
        'test-room'
      );
    });
  });

  describe('Cleanup Operations', () => {
    it('should identify inactive rooms for cleanup', async () => {
      const oldRoomId = 'old-room';
      const recentRoomId = 'recent-room';

      const oldGameState = {
        roomId: oldRoomId,
        updatedAt: Date.now() - 2000000, // Very old
        players: [],
      };

      const recentGameState = {
        roomId: recentRoomId,
        updatedAt: Date.now() - 1000, // Recent
        players: [],
      };

      mockGameStateService.getInactiveRooms.mockResolvedValue([oldRoomId]);
      mockGameStateService.cleanupRoom.mockResolvedValue(undefined);
      mockGameSessionGateway.cleanupRoom.mockResolvedValue(undefined);

      await scheduler.cleanupInactiveRooms();

      expect(mockGameStateService.getInactiveRooms).toHaveBeenCalledWith(
        1800000
      ); // 30 minutes
      expect(mockGameStateService.cleanupRoom).toHaveBeenCalledWith(oldRoomId);
      expect(mockGameSessionGateway.cleanupRoom).toHaveBeenCalledWith(
        oldRoomId,
        'inactive'
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockGameStateService.getInactiveRooms.mockRejectedValue(
        new Error('Redis error')
      );

      // Should not throw
      await expect(scheduler.cleanupInactiveRooms()).resolves.toBeUndefined();
    });
  });

  describe('System Health Monitoring', () => {
    it('should update instance heartbeat', async () => {
      mockGameStateService.updateHeartbeat.mockResolvedValue(undefined);

      await scheduler.updateInstanceHeartbeat();

      expect(mockGameStateService.updateHeartbeat).toHaveBeenCalled();
    });

    it('should cleanup dead instances', async () => {
      mockGameStateService.cleanupDeadInstances.mockResolvedValue(undefined);

      await scheduler.cleanupDeadInstances();

      expect(mockGameStateService.cleanupDeadInstances).toHaveBeenCalled();
    });

    it('should handle heartbeat errors gracefully', async () => {
      mockGameStateService.updateHeartbeat.mockRejectedValue(
        new Error('Redis error')
      );

      // Should not throw
      await expect(
        scheduler.updateInstanceHeartbeat()
      ).resolves.toBeUndefined();
    });
  });
});
