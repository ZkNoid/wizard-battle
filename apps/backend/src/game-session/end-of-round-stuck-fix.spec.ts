import { Test, TestingModule } from '@nestjs/testing';
import { GameSessionGateway } from './game-session.gateway';
import { GameStateService } from './game-state.service';
import { GamePhaseSchedulerService } from './game-phase-scheduler.service';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GamePhase, ITrustedState } from '../../../common/types/gameplay.types';
import { Socket } from 'socket.io';
import { createMock } from '@golevelup/ts-jest';

/**
 * @title END_OF_ROUND Stuck Issue Fix Verification Tests
 * @notice Core tests to verify the fixes for the END_OF_ROUND phase getting stuck
 * @dev Tests the essential race condition scenarios that were causing issues
 */
describe('END_OF_ROUND Stuck Issue Fix', () => {
  let gateway: GameSessionGateway;
  let gameStateService: GameStateService;
  let phaseScheduler: GamePhaseSchedulerService;
  let mockSocket: Partial<Socket>;

  const mockMatchmakingService = createMock<MatchmakingService>({
    setServer: jest.fn(),
    leaveMatchmaking: jest.fn(),
    joinMatchmaking: jest.fn(),
    getMatchInfo: jest.fn(),
  });

  const mockGameStateService = createMock<GameStateService>({
    getGameState: jest.fn(),
    storeTrustedState: jest.fn(),
    storeTrustedStateAndMarkReady: jest.fn(),
    markPlayerReady: jest.fn(),
    clearTurnData: jest.fn(),
    advanceGamePhase: jest.fn(),
    updateGameState: jest.fn(),
    publishToRoom: jest.fn(),
    subscribeToRoomEvents: jest.fn(),
    registerSocket: jest.fn(),
    unregisterSocket: jest.fn(),
    getAllPlayerActions: jest.fn(),
    getAllTrustedStates: jest.fn(),
    markPlayerDead: jest.fn(),
    getInstanceId: jest.fn().mockReturnValue('test-instance'),
    redisClient: {
      keys: jest.fn(),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameSessionGateway,
        {
          provide: MatchmakingService,
          useValue: mockMatchmakingService,
        },
        {
          provide: GameStateService,
          useValue: mockGameStateService,
        },
        {
          provide: GamePhaseSchedulerService,
          useFactory: () =>
            new GamePhaseSchedulerService(mockGameStateService, null as any),
        },
      ],
    }).compile();

    gateway = module.get<GameSessionGateway>(GameSessionGateway);
    gameStateService = module.get<GameStateService>(GameStateService);
    phaseScheduler = module.get<GamePhaseSchedulerService>(
      GamePhaseSchedulerService
    );

    // Mock socket
    mockSocket = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    // Mock server
    (gateway as any).server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up all mocks between tests
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Race Condition Fix - Dual Validation', () => {
    it('should NOT advance when players are ready but missing trusted states', async () => {
      const roomId = 'test-room-race-1';
      const trustedState: ITrustedState = {
        playerId: 'player1',
        stateCommit: 'test-commit',
        publicState: {
          playerId: 'player1',
          socketId: 'test-socket',
          fields: [],
        },
        signature: 'test-signature',
      };

      // Initial state: all players ready but player2 missing trusted state
      const initialGameState = {
        roomId,
        currentPhase: GamePhase.END_OF_ROUND,
        players: [
          { id: 'player1', isAlive: true, trustedState: undefined },
          { id: 'player2', isAlive: true, trustedState: undefined },
        ],
        playersReady: ['player1', 'player2'], // All ready
      };

      // After player1 submits trusted state
      const updatedGameState = {
        ...initialGameState,
        players: [
          { id: 'player1', isAlive: true, trustedState: trustedState },
          { id: 'player2', isAlive: true, trustedState: undefined }, // Still missing
        ],
        playersReady: ['player1', 'player2'], // Still all ready
      };

      mockGameStateService.getGameState
        .mockResolvedValueOnce(initialGameState)
        .mockResolvedValueOnce(updatedGameState);
      mockGameStateService.storeTrustedStateAndMarkReady.mockResolvedValue({
        allReady: true,
        allHaveTrustedStates: false, // player2 still missing
        updatedGameState: updatedGameState,
      });

      const advanceToStateUpdateSpy = jest.spyOn(
        gateway,
        'advanceToStateUpdate'
      );

      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState,
      });

      // Should NOT advance because not all have trusted states
      expect(advanceToStateUpdateSpy).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('trustedStateResult', {
        success: true,
      });
    });

    it('should ADVANCE when all players have trusted states AND are ready', async () => {
      const roomId = 'test-room-success';
      const trustedState: ITrustedState = {
        playerId: 'player1',
        stateCommit: 'test-commit',
        publicState: {
          playerId: 'player1',
          socketId: 'test-socket',
          fields: [],
        },
        signature: 'test-signature',
      };

      // Initial state: player2 has trusted state but player1 doesn't
      const initialGameState = {
        roomId,
        currentPhase: GamePhase.END_OF_ROUND,
        players: [
          { id: 'player1', isAlive: true, trustedState: undefined },
          {
            id: 'player2',
            isAlive: true,
            trustedState: { playerId: 'player2' },
          },
        ],
        playersReady: ['player2'], // Only player2 ready
      };

      // After player1 submits - now both have trusted states and are ready
      const updatedGameState = {
        ...initialGameState,
        players: [
          { id: 'player1', isAlive: true, trustedState: trustedState },
          {
            id: 'player2',
            isAlive: true,
            trustedState: { playerId: 'player2' },
          },
        ],
        playersReady: ['player2', 'player1'], // Both ready
      };

      mockGameStateService.getGameState
        .mockResolvedValueOnce(initialGameState)
        .mockResolvedValueOnce(updatedGameState);
      mockGameStateService.storeTrustedStateAndMarkReady.mockResolvedValue({
        allReady: true,
        allHaveTrustedStates: true,
        updatedGameState: updatedGameState,
      });

      const advanceToStateUpdateSpy = jest.spyOn(
        gateway,
        'advanceToStateUpdate'
      );
      advanceToStateUpdateSpy.mockResolvedValue();

      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState,
      });

      // Should advance because both conditions are met
      expect(advanceToStateUpdateSpy).toHaveBeenCalledWith(roomId);
      expect(mockSocket.emit).toHaveBeenCalledWith('trustedStateResult', {
        success: true,
      });
    });
  });

  describe('Turn Data Cleanup Fix', () => {
    it('should clear turn data before starting new turn', async () => {
      const roomId = 'test-room-cleanup';

      const clearTurnDataSpy = jest.spyOn(gameStateService, 'clearTurnData');
      clearTurnDataSpy.mockResolvedValue();

      await gateway.startNextTurn(roomId);

      expect(clearTurnDataSpy).toHaveBeenCalledWith(roomId);
    });
  });

  describe('Enhanced Logging Fix', () => {
    it('should provide detailed logging about missing states vs readiness', async () => {
      const roomId = 'test-room-logging';
      const trustedState: ITrustedState = {
        playerId: 'player1',
        stateCommit: 'test-commit',
        publicState: {
          playerId: 'player1',
          socketId: 'test-socket',
          fields: [],
        },
        signature: 'test-signature',
      };

      const gameState = {
        roomId,
        currentPhase: GamePhase.END_OF_ROUND,
        players: [
          { id: 'player1', isAlive: true, trustedState: undefined },
          { id: 'player2', isAlive: true, trustedState: undefined },
        ],
        playersReady: [],
      };

      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.storeTrustedStateAndMarkReady.mockResolvedValue({
        allReady: false,
        allHaveTrustedStates: false,
        updatedGameState: gameState,
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState,
      });

      // Should log detailed information about what's missing
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('END_OF_ROUND state BEFORE')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('END_OF_ROUND state AFTER')
      );

      consoleSpy.mockRestore();
    });
  });
});
