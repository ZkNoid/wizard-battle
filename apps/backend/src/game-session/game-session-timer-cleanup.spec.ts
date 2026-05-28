import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { GamePhaseSchedulerService } from './game-phase-scheduler.service';
import { GameStateService } from './game-state.service';
import { GameSessionGateway } from './game-session.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { createMock } from '@golevelup/ts-jest';
import { GamePhase } from '../../../common/types/gameplay.types';

// Helper to create Redis client mock with transaction support
const createRedisClientMock = (overrides: any = {}) => {
  const multiMock = {
    hSet: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([['OK']]),
  };
  return {
    hKeys: jest.fn().mockResolvedValue([]),
    scan: jest.fn().mockResolvedValue({ cursor: '0', keys: [] }),
    watch: jest.fn().mockResolvedValue('OK'),
    unwatch: jest.fn().mockResolvedValue('OK'),
    multi: jest.fn().mockReturnValue(multiMock),
    eval: jest.fn().mockResolvedValue(1),
    ...overrides,
  };
};

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
  let mockMatchmakingService: any;

  beforeEach(async () => {
    // Mock services
    mockGameStateService = createMock<GameStateService>();
    mockGameSessionGateway = createMock<GameSessionGateway>();
    mockMatchmakingService = createMock<MatchmakingService>();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        GamePhaseSchedulerService,
        { provide: GameStateService, useValue: mockGameStateService },
        { provide: GameSessionGateway, useValue: mockGameSessionGateway },
        { provide: MatchmakingService, useValue: mockMatchmakingService },
      ],
    }).compile();

    scheduler = module.get<GamePhaseSchedulerService>(
      GamePhaseSchedulerService
    );
  });

  describe('Phase Transition Logic', () => {
    // The scheduler is STUCK-RECOVERY ONLY for the happy-path phases.
    // Gateway drives SPELL_PROPAGATION→SPELL_EFFECTS, SPELL_EFFECTS→
    // END_OF_ROUND, and STATE_UPDATE→SPELL_CASTING inline. The cron uses
    // a 20s threshold per phase so it cannot realistically race the
    // gateway's happy path (which transitions in <2s). The CAS guard in
    // GameStateService.advanceGamePhase additionally makes any concurrent
    // attempt a no-op when the gateway already advanced the phase.
    it('should NOT transition SPELL_PROPAGATION rooms below 20s recovery threshold', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.SPELL_PROPAGATION,
        phaseStartTime: Date.now() - 5000, // 5s — well below 20s recovery threshold
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = createRedisClientMock({
        scan: jest
          .fn()
          .mockResolvedValue({ cursor: '0', keys: [`game_states:${roomId}`] }),
      });
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.isLeader.mockResolvedValue(true);

      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(0);
    });

    it('should recover SPELL_PROPAGATION rooms stuck >20s', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.SPELL_PROPAGATION,
        phaseStartTime: Date.now() - 21000, // 21s — past 20s recovery threshold
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = createRedisClientMock({
        scan: jest
          .fn()
          .mockResolvedValue({ cursor: '0', keys: [`game_states:${roomId}`] }),
      });
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.isLeader.mockResolvedValue(true);

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

    it('should NOT transition SPELL_EFFECTS rooms below 20s recovery threshold', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.SPELL_EFFECTS,
        phaseStartTime: Date.now() - 5000,
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = createRedisClientMock({
        scan: jest
          .fn()
          .mockResolvedValue({ cursor: '0', keys: [`game_states:${roomId}`] }),
      });
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.isLeader.mockResolvedValue(true);

      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(0);
    });

    it('should recover SPELL_EFFECTS rooms stuck >20s', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.SPELL_EFFECTS,
        phaseStartTime: Date.now() - 21000,
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = createRedisClientMock({
        scan: jest
          .fn()
          .mockResolvedValue({ cursor: '0', keys: [`game_states:${roomId}`] }),
      });
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.isLeader.mockResolvedValue(true);

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

    it('should NOT transition STATE_UPDATE rooms below 20s recovery threshold', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.STATE_UPDATE,
        phaseStartTime: Date.now() - 5000,
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = createRedisClientMock({
        scan: jest
          .fn()
          .mockResolvedValue({ cursor: '0', keys: [`game_states:${roomId}`] }),
      });
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.isLeader.mockResolvedValue(true);

      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(0);
    });

    it('should recover STATE_UPDATE rooms stuck >20s', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.STATE_UPDATE,
        phaseStartTime: Date.now() - 21000,
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.redisClient = createRedisClientMock({
        scan: jest
          .fn()
          .mockResolvedValue({ cursor: '0', keys: [`game_states:${roomId}`] }),
      });
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.isLeader.mockResolvedValue(true);

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

    it('should identify END_OF_ROUND rooms stuck >15s for STATE_UPDATE recovery', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.END_OF_ROUND,
        phaseStartTime: Date.now() - 16000, // 16s — past 15s recovery threshold
        players: [{ id: 'player1', isAlive: true }],
        playersReady: [],
      };

      mockGameStateService.redisClient = createRedisClientMock({
        scan: jest
          .fn()
          .mockResolvedValue({ cursor: '0', keys: [`game_states:${roomId}`] }),
      });
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.isLeader.mockResolvedValue(true);

      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(1);
      expect(pendingTransitions[0]).toEqual({
        roomId,
        currentPhase: GamePhase.END_OF_ROUND,
        nextPhase: GamePhase.STATE_UPDATE,
        delayMs: 0,
      });
    });

    it('should not transition END_OF_ROUND rooms below 15s threshold', async () => {
      const roomId = 'test-room';
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.END_OF_ROUND,
        phaseStartTime: Date.now() - 1000, // 1s — well below recovery threshold
        players: [{ id: 'player1', isAlive: true }],
        playersReady: [],
      };

      mockGameStateService.redisClient = createRedisClientMock({
        scan: jest
          .fn()
          .mockResolvedValue({ cursor: '0', keys: [`game_states:${roomId}`] }),
      });
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.isLeader.mockResolvedValue(true);

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

      mockGameStateService.redisClient = createRedisClientMock({
        scan: jest
          .fn()
          .mockResolvedValue({ cursor: '0', keys: [`game_states:${roomId}`] }),
      });
      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.isLeader.mockResolvedValue(true);

      const pendingTransitions = await (
        scheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(0);
    });
  });

  describe('Phase Transition Execution', () => {
    it('should execute END_OF_ROUND→STATE_UPDATE recovery via gateway', async () => {
      const transition = {
        roomId: 'test-room',
        currentPhase: GamePhase.END_OF_ROUND,
        nextPhase: GamePhase.STATE_UPDATE,
        delayMs: 0,
      };

      mockGameStateService.acquireRoomLock.mockResolvedValue({
        ok: true,
        lockKey: 'lock-key',
        owner: 'test-owner',
      });
      mockGameStateService.releaseRoomLock.mockResolvedValue(true);
      mockGameSessionGateway.advanceToStateUpdate.mockResolvedValue(undefined);

      await (scheduler as any).executePhaseTransition(transition);

      expect(mockGameSessionGateway.advanceToStateUpdate).toHaveBeenCalledWith(
        'test-room'
      );
    });

    it('should execute SPELL_PROPAGATION→SPELL_EFFECTS recovery via gateway', async () => {
      const transition = {
        roomId: 'test-room',
        currentPhase: GamePhase.SPELL_PROPAGATION,
        nextPhase: GamePhase.SPELL_EFFECTS,
        delayMs: 0,
      };

      mockGameStateService.acquireRoomLock.mockResolvedValue({
        ok: true,
        lockKey: 'lock-key',
        owner: 'test-owner',
      });
      mockGameStateService.releaseRoomLock.mockResolvedValue(true);
      mockGameSessionGateway.advanceToSpellEffects.mockResolvedValue(undefined);

      await (scheduler as any).executePhaseTransition(transition);

      expect(mockGameSessionGateway.advanceToSpellEffects).toHaveBeenCalledWith(
        'test-room'
      );
    });

    it('should execute STATE_UPDATE→SPELL_CASTING recovery via gateway', async () => {
      const transition = {
        roomId: 'test-room',
        currentPhase: GamePhase.STATE_UPDATE,
        nextPhase: GamePhase.SPELL_CASTING,
        delayMs: 0,
      };

      mockGameStateService.acquireRoomLock.mockResolvedValue({
        ok: true,
        lockKey: 'lock-key',
        owner: 'test-owner',
      });
      mockGameStateService.releaseRoomLock.mockResolvedValue(true);
      mockGameSessionGateway.startNextTurn.mockResolvedValue(undefined);

      await (scheduler as any).executePhaseTransition(transition);

      expect(mockGameSessionGateway.startNextTurn).toHaveBeenCalledWith(
        'test-room'
      );
    });

    it('should execute SPELL_EFFECTS→END_OF_ROUND recovery via direct emit', async () => {
      const transition = {
        roomId: 'test-room',
        currentPhase: GamePhase.SPELL_EFFECTS,
        nextPhase: GamePhase.END_OF_ROUND,
        delayMs: 0,
      };

      const emitMock = jest.fn();
      mockGameSessionGateway.server = {
        to: jest.fn().mockReturnValue({ emit: emitMock }),
      };
      mockGameStateService.acquireRoomLock.mockResolvedValue({
        ok: true,
        lockKey: 'lock-key',
        owner: 'test-owner',
      });
      mockGameStateService.releaseRoomLock.mockResolvedValue(true);
      mockGameStateService.advanceGamePhase.mockResolvedValue(
        GamePhase.END_OF_ROUND
      );
      mockGameStateService.publishToRoom.mockResolvedValue(undefined);

      await (scheduler as any).executePhaseTransition(transition);

      expect(mockGameStateService.advanceGamePhase).toHaveBeenCalledWith(
        'test-room',
        GamePhase.SPELL_EFFECTS
      );
      expect(emitMock).toHaveBeenCalledWith('endOfRound', {
        phase: GamePhase.END_OF_ROUND,
      });
      expect(mockGameStateService.publishToRoom).toHaveBeenCalledWith(
        'test-room',
        'endOfRound',
        { phase: GamePhase.END_OF_ROUND }
      );
    });

    it('should NOT emit endOfRound if CAS guard rejects SPELL_EFFECTS recovery', async () => {
      const transition = {
        roomId: 'test-room',
        currentPhase: GamePhase.SPELL_EFFECTS,
        nextPhase: GamePhase.END_OF_ROUND,
        delayMs: 0,
      };

      const emitMock = jest.fn();
      mockGameSessionGateway.server = {
        to: jest.fn().mockReturnValue({ emit: emitMock }),
      };
      mockGameStateService.acquireRoomLock.mockResolvedValue({
        ok: true,
        lockKey: 'lock-key',
        owner: 'test-owner',
      });
      mockGameStateService.releaseRoomLock.mockResolvedValue(true);
      // Gateway already advanced past SPELL_EFFECTS — CAS returns the
      // current actual phase which is NOT END_OF_ROUND in this case.
      mockGameStateService.advanceGamePhase.mockResolvedValue(
        GamePhase.STATE_UPDATE
      );

      await (scheduler as any).executePhaseTransition(transition);

      expect(emitMock).not.toHaveBeenCalled();
      expect(mockGameStateService.publishToRoom).not.toHaveBeenCalled();
    });

    it('should handle transition errors by cleaning up room', async () => {
      const transition = {
        roomId: 'test-room',
        currentPhase: GamePhase.END_OF_ROUND,
        nextPhase: GamePhase.STATE_UPDATE,
        delayMs: 0,
      };

      mockGameStateService.acquireRoomLock.mockResolvedValue({
        ok: true,
        lockKey: 'lock-key',
        owner: 'test-owner',
      });
      mockGameStateService.releaseRoomLock.mockResolvedValue(true);
      mockGameSessionGateway.advanceToStateUpdate.mockRejectedValue(
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
      jest.useRealTimers();
      mockGameStateService.isLeader.mockResolvedValue(false); // Not leader, skip retry
      mockGameStateService.getInactiveRooms.mockRejectedValue(
        new Error('Redis error')
      );

      // Should not throw
      await expect(scheduler.cleanupInactiveRooms()).resolves.toBeUndefined();
      jest.useFakeTimers();
    }, 10000);
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
      jest.useRealTimers();
      mockGameStateService.isLeader.mockResolvedValue(false); // Not leader, skip processing
      mockGameStateService.updateHeartbeat.mockRejectedValue(
        new Error('Redis error')
      );

      // Should not throw - just updates heartbeat, no retry on this
      await expect(
        scheduler.updateInstanceHeartbeat()
      ).resolves.toBeUndefined();
      jest.useFakeTimers();
    }, 10000);
  });
});
