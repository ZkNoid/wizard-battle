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
 * @notice Comprehensive tests to verify the fixes for the END_OF_ROUND phase getting stuck
 * @dev Tests the specific race condition and timeout scenarios that were causing issues
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
        GamePhaseSchedulerService,
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

      // Initial state: player1 submitting, player2 already ready but missing trusted state
      const initialGameState = {
        roomId,
        currentPhase: GamePhase.END_OF_ROUND,
        players: [
          { id: 'player1', isAlive: true, trustedState: undefined },
          { id: 'player2', isAlive: true, trustedState: undefined }, // Missing trusted state!
        ],
        playersReady: ['player2'], // Player2 already marked ready somehow
      };

      // After player1 submits trusted state
      const updatedGameState = {
        ...initialGameState,
        players: [
          { id: 'player1', isAlive: true, trustedState: trustedState },
          { id: 'player2', isAlive: true, trustedState: undefined }, // Still missing!
        ],
        playersReady: ['player2', 'player1'], // Both ready now
      };

      mockGameStateService.getGameState
        .mockResolvedValueOnce(initialGameState)
        .mockResolvedValueOnce(updatedGameState);
      mockGameStateService.storeTrustedStateAndMarkReady.mockResolvedValue(
        true
      ); // Says all ready

      const advanceToStateUpdateSpy = jest.spyOn(
        gateway,
        'advanceToStateUpdate'
      );

      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState,
      });

      // Should NOT advance because player2 doesn't have trusted state
      expect(advanceToStateUpdateSpy).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('trustedStateResult', {
        success: true,
      });
    });

    it('should NOT advance when all have trusted states but not all are ready', async () => {
      const roomId = 'test-room-race-2';
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

      // Initial state: both have trusted states but player2 not ready
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
        playersReady: [], // Nobody ready yet
      };

      // After player1 submits
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
        playersReady: ['player1'], // Only player1 ready
      };

      mockGameStateService.getGameState
        .mockResolvedValueOnce(initialGameState)
        .mockResolvedValueOnce(updatedGameState);
      mockGameStateService.storeTrustedStateAndMarkReady.mockResolvedValue(
        false
      ); // Not all ready

      const advanceToStateUpdateSpy = jest.spyOn(
        gateway,
        'advanceToStateUpdate'
      );

      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState,
      });

      // Should NOT advance because not all players are ready
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

      // Initial state: player2 already has trusted state and is ready
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
        playersReady: ['player2'],
      };

      // After player1 submits - both conditions met
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
        playersReady: ['player2', 'player1'],
      };

      mockGameStateService.getGameState
        .mockResolvedValueOnce(initialGameState)
        .mockResolvedValueOnce(updatedGameState);
      mockGameStateService.storeTrustedStateAndMarkReady.mockResolvedValue(
        true
      );

      const advanceToStateUpdateSpy = jest.spyOn(
        gateway,
        'advanceToStateUpdate'
      );
      advanceToStateUpdateSpy.mockResolvedValue();

      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState,
      });

      // Should ADVANCE because both conditions are met
      expect(advanceToStateUpdateSpy).toHaveBeenCalledWith(roomId);
      expect(mockSocket.emit).toHaveBeenCalledWith('trustedStateResult', {
        success: true,
      });
    });
  });

  describe('Dead Player Cleanup Fix', () => {
    it('should ignore dead players when checking readiness', async () => {
      const roomId = 'test-room-dead-players';
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

      // Game state with dead player in ready list (should be cleaned up)
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
          { id: 'player3', isAlive: false, trustedState: undefined }, // Dead player
        ],
        playersReady: ['player2', 'player3'], // Dead player in ready list!
      };

      const updatedGameState = {
        ...initialGameState,
        players: [
          { id: 'player1', isAlive: true, trustedState: trustedState },
          {
            id: 'player2',
            isAlive: true,
            trustedState: { playerId: 'player2' },
          },
          { id: 'player3', isAlive: false, trustedState: undefined },
        ],
        playersReady: ['player2', 'player1'], // Should be cleaned up
      };

      mockGameStateService.getGameState
        .mockResolvedValueOnce(initialGameState)
        .mockResolvedValueOnce(updatedGameState);
      mockGameStateService.storeTrustedStateAndMarkReady.mockResolvedValue(
        true
      );

      const advanceToStateUpdateSpy = jest.spyOn(
        gateway,
        'advanceToStateUpdate'
      );
      advanceToStateUpdateSpy.mockResolvedValue();

      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState,
      });

      // Should advance because only alive players count
      expect(advanceToStateUpdateSpy).toHaveBeenCalledWith(roomId);
    });
  });

  describe('Timeout Mechanism Fix', () => {
    it('should force advance after 10 second timeout', async () => {
      const roomId = 'test-room-timeout';
      const now = Date.now();

      // Game stuck in END_OF_ROUND for more than 10 seconds
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.END_OF_ROUND,
        phaseStartTime: now - 12000, // 12 seconds ago
        players: [
          {
            id: 'player1',
            isAlive: true,
            trustedState: { playerId: 'player1' },
          },
          { id: 'player2', isAlive: true, trustedState: undefined }, // Missing trusted state
        ],
        playersReady: ['player1'], // Only one ready
      };

      mockGameStateService.redisClient.keys.mockResolvedValue([
        `game_state:${roomId}`,
      ]);
      mockGameStateService.getGameState.mockResolvedValue(gameState);

      const executePhaseTransitionSpy = jest.spyOn(
        phaseScheduler as any,
        'executePhaseTransition'
      );
      executePhaseTransitionSpy.mockResolvedValue();

      // Call the scheduler method directly
      const pendingTransitions = await (
        phaseScheduler as any
      ).getPendingPhaseTransitions();

      expect(pendingTransitions).toHaveLength(1);
      expect(pendingTransitions[0]).toEqual({
        roomId,
        currentPhase: GamePhase.END_OF_ROUND,
        nextPhase: GamePhase.STATE_UPDATE,
        delayMs: 0,
      });
    });

    it('should log warning at 5 seconds but not advance', async () => {
      const roomId = 'test-room-warning';
      const now = Date.now();

      // Game in END_OF_ROUND for 7 seconds (>5 but <10)
      const gameState = {
        roomId,
        status: 'active',
        currentPhase: GamePhase.END_OF_ROUND,
        phaseStartTime: now - 7000, // 7 seconds ago
        players: [
          {
            id: 'player1',
            isAlive: true,
            trustedState: { playerId: 'player1' },
          },
          { id: 'player2', isAlive: true, trustedState: undefined },
        ],
        playersReady: ['player1'],
      };

      mockGameStateService.redisClient.keys.mockResolvedValue([
        `game_state:${roomId}`,
      ]);
      mockGameStateService.getGameState.mockResolvedValue(gameState);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const pendingTransitions = await (
        phaseScheduler as any
      ).getPendingPhaseTransitions();

      // Should not create transition but should log warning
      expect(pendingTransitions).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⏰ END_OF_ROUND phase running for 7')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Turn Data Cleanup Fix', () => {
    it('should clear turn data before starting new turn', async () => {
      const roomId = 'test-room-cleanup';

      const gameState = {
        roomId,
        players: [
          {
            id: 'player1',
            isAlive: true,
            currentActions: { spells: [] }, // Should be cleared
            trustedState: { playerId: 'player1' }, // Should be cleared
          },
          {
            id: 'player2',
            isAlive: true,
            currentActions: { spells: [] },
            trustedState: { playerId: 'player2' },
          },
        ],
        playersReady: ['player1', 'player2'], // Should be cleared
      };

      mockGameStateService.getGameState.mockResolvedValue(gameState);
      mockGameStateService.clearTurnData.mockResolvedValue();
      mockGameStateService.advanceGamePhase.mockResolvedValue(
        GamePhase.SPELL_CASTING
      );
      mockGameStateService.publishToRoom.mockResolvedValue();

      await gateway.startNextTurn(roomId);

      // Should clear turn data before advancing
      expect(mockGameStateService.clearTurnData).toHaveBeenCalledWith(roomId);
      expect(mockGameStateService.advanceGamePhase).toHaveBeenCalledWith(
        roomId
      );
      expect(mockGameStateService.publishToRoom).toHaveBeenCalledWith(
        roomId,
        'newTurn',
        { phase: GamePhase.SPELL_CASTING }
      );
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

      const initialGameState = {
        roomId,
        currentPhase: GamePhase.END_OF_ROUND,
        players: [
          { id: 'player1', isAlive: true, trustedState: undefined },
          { id: 'player2', isAlive: true, trustedState: undefined },
          {
            id: 'player3',
            isAlive: true,
            trustedState: { playerId: 'player3' },
          },
        ],
        playersReady: ['player3'],
      };

      const updatedGameState = {
        ...initialGameState,
        players: [
          { id: 'player1', isAlive: true, trustedState: trustedState },
          { id: 'player2', isAlive: true, trustedState: undefined }, // Missing trusted state
          {
            id: 'player3',
            isAlive: true,
            trustedState: { playerId: 'player3' },
          },
        ],
        playersReady: ['player3', 'player1'], // player2 not ready
      };

      mockGameStateService.getGameState
        .mockResolvedValueOnce(initialGameState)
        .mockResolvedValueOnce(updatedGameState);
      mockGameStateService.storeTrustedStateAndMarkReady.mockResolvedValue(
        false
      );

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState,
      });

      // Should log specific missing states and readiness
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '⏳ Still waiting for trusted states from: player2'
        )
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '⏳ Still waiting for readiness confirmation from: player2'
        )
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Test - Complete Flow', () => {
    it('should handle complete END_OF_ROUND flow without getting stuck', async () => {
      const roomId = 'test-room-integration';

      // Simulate both players submitting trusted states in sequence
      const player1TrustedState: ITrustedState = {
        playerId: 'player1',
        stateCommit: 'commit1',
        publicState: { playerId: 'player1', socketId: 'socket1', fields: [] },
        signature: 'sig1',
      };

      const player2TrustedState: ITrustedState = {
        playerId: 'player2',
        stateCommit: 'commit2',
        publicState: { playerId: 'player2', socketId: 'socket2', fields: [] },
        signature: 'sig2',
      };

      // Initial state - no trusted states
      const initialGameState = {
        roomId,
        currentPhase: GamePhase.END_OF_ROUND,
        players: [
          { id: 'player1', isAlive: true, trustedState: undefined },
          { id: 'player2', isAlive: true, trustedState: undefined },
        ],
        playersReady: [],
      };

      // After player1 submits
      const afterPlayer1State = {
        ...initialGameState,
        players: [
          { id: 'player1', isAlive: true, trustedState: player1TrustedState },
          { id: 'player2', isAlive: true, trustedState: undefined },
        ],
        playersReady: ['player1'],
      };

      // After player2 submits - both ready
      const finalGameState = {
        ...initialGameState,
        players: [
          { id: 'player1', isAlive: true, trustedState: player1TrustedState },
          { id: 'player2', isAlive: true, trustedState: player2TrustedState },
        ],
        playersReady: ['player1', 'player2'],
      };

      // Mock the sequence of calls
      mockGameStateService.getGameState
        .mockResolvedValueOnce(initialGameState) // Initial call for player1
        .mockResolvedValueOnce(afterPlayer1State) // Updated state after player1
        .mockResolvedValueOnce(afterPlayer1State) // Initial call for player2
        .mockResolvedValueOnce(finalGameState); // Final state after player2

      mockGameStateService.storeTrustedStateAndMarkReady
        .mockResolvedValueOnce(false) // After player1 - not all ready
        .mockResolvedValueOnce(true); // After player2 - all ready

      const advanceToStateUpdateSpy = jest.spyOn(
        gateway,
        'advanceToStateUpdate'
      );
      advanceToStateUpdateSpy.mockResolvedValue();

      // Player1 submits
      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState: player1TrustedState,
      });

      // Should not advance yet
      expect(advanceToStateUpdateSpy).not.toHaveBeenCalled();

      // Player2 submits
      await gateway.handleSubmitTrustedState(mockSocket as Socket, {
        roomId,
        trustedState: player2TrustedState,
      });

      // Now should advance
      expect(advanceToStateUpdateSpy).toHaveBeenCalledWith(roomId);
      expect(advanceToStateUpdateSpy).toHaveBeenCalledTimes(1);
    });
  });
});
