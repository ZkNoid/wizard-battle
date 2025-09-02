import { Test, TestingModule } from '@nestjs/testing';
import { GameSessionGateway } from './game-session.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameStateService } from './game-state.service';
import { Server, Socket } from 'socket.io';
import { createMock } from '@golevelup/ts-jest';
import {
  GamePhase,
  IUserActions,
  ITrustedState,
  IDead,
} from '../../../common/types/gameplay.types';
import { State } from '../../../common/stater/state';

// Create default state fields for testing
const defaultState = State.default();
const defaultStateFields = State.toFields(defaultState);

describe('GameSessionGateway', () => {
  let gateway: GameSessionGateway;
  let mockMatchmakingService: jest.Mocked<MatchmakingService>;
  let mockGameStateService: jest.Mocked<GameStateService>;
  let mockServer: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(async () => {
    // Create mocks
    mockMatchmakingService = createMock<MatchmakingService>({
      setServer: jest.fn(),
      leaveMatchmaking: jest.fn(),
      joinMatchmaking: jest.fn(),
      getMatchInfo: jest.fn(),
    });

    mockGameStateService = createMock<GameStateService>({
      subscribeToRoomEvents: jest.fn(),
      registerSocket: jest.fn(),
      unregisterSocket: jest.fn(),
      getGameState: jest.fn(),
      storePlayerActions: jest.fn(),
      markPlayerReady: jest.fn(),
      storeTrustedStateAndMarkReady: jest.fn(),
      advanceGamePhase: jest.fn(),
      getAllPlayerActions: jest.fn(),
      storeTrustedState: jest.fn(),
      getAllTrustedStates: jest.fn(),
      markPlayerDead: jest.fn(),
      publishToRoom: jest.fn(),
      getInstanceId: jest.fn().mockReturnValue('test-instance'),
    });

    mockServer = createMock<Server>({
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
      sockets: {
        sockets: new Map(),
      },
    });

    mockSocket = createMock<Socket>({
      id: 'test-socket-id',
      emit: jest.fn(),
      join: jest.fn(),
    });

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
      ],
    }).compile();

    gateway = module.get<GameSessionGateway>(GameSessionGateway);
    (gateway as any).server = mockServer;
  });

  describe('handleSubmitActions', () => {
    it('should successfully submit actions in SPELL_CASTING phase', async () => {
      const roomId = 'test-room';
      const actions: IUserActions = {
        actions: [
          { playerId: 'player1', spellId: 'fireball', spellCastInfo: {} },
        ],
        signature: 'test-signature',
      };

      const mockGameState = {
        roomId,
        currentPhase: GamePhase.SPELL_CASTING,
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.getGameState.mockResolvedValue(mockGameState as any);
      mockGameStateService.storePlayerActions.mockResolvedValue();
      mockGameStateService.markPlayerReady.mockResolvedValue(true);
      mockGameStateService.getAllPlayerActions.mockResolvedValue({
        player1: actions,
      });
      mockGameStateService.advanceGamePhase.mockResolvedValue(
        GamePhase.SPELL_PROPAGATION
      );

      await gateway.handleSubmitActions(mockSocket, { roomId, actions });

      expect(mockGameStateService.storePlayerActions).toHaveBeenCalledWith(
        roomId,
        'player1',
        actions
      );
      expect(mockGameStateService.markPlayerReady).toHaveBeenCalledWith(
        roomId,
        'player1'
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('actionSubmitResult', {
        success: true,
      });
    });

    it('should reject actions in wrong phase', async () => {
      const roomId = 'test-room';
      const actions: IUserActions = {
        actions: [
          { playerId: 'player1', spellId: 'fireball', spellCastInfo: {} },
        ],
        signature: 'test-signature',
      };

      const mockGameState = {
        roomId,
        currentPhase: GamePhase.SPELL_PROPAGATION, // Wrong phase
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.getGameState.mockResolvedValue(mockGameState as any);

      await gateway.handleSubmitActions(mockSocket, { roomId, actions });

      expect(mockSocket.emit).toHaveBeenCalledWith('actionSubmitResult', {
        success: false,
        error: 'Invalid phase for action submission',
      });
      expect(mockGameStateService.storePlayerActions).not.toHaveBeenCalled();
    });

    it('should handle empty actions gracefully by finding player via socket', async () => {
      const roomId = 'test-room';
      const actions: IUserActions = {
        actions: [],
        signature: 'test-signature',
      };

      const mockGameState = {
        roomId,
        currentPhase: GamePhase.SPELL_CASTING,
        players: [{ id: 'player1', isAlive: true, socketId: 'test-socket-id' }],
      };

      mockGameStateService.getGameState.mockResolvedValue(mockGameState as any);
      mockGameStateService.storePlayerActions.mockResolvedValue();
      mockGameStateService.markPlayerReady.mockResolvedValue(true);

      // Mock socket.id to match player
      (mockSocket as any).id = 'test-socket-id';

      await gateway.handleSubmitActions(mockSocket, { roomId, actions });

      expect(mockGameStateService.storePlayerActions).toHaveBeenCalledWith(
        roomId,
        'player1',
        actions
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('actionSubmitResult', {
        success: true,
      });
    });
  });

  describe('handleSubmitTrustedState', () => {
    it('should successfully submit trusted state in END_OF_ROUND phase', async () => {
      const roomId = 'test-room';
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

      const mockGameState = {
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
        playersReady: ['player2'], // Add playersReady field
      };

      // Updated state after both operations (for our new validation logic)
      const updatedGameState = {
        roomId,
        currentPhase: GamePhase.END_OF_ROUND,
        players: [
          { id: 'player1', isAlive: true, trustedState: trustedState },
          {
            id: 'player2',
            isAlive: true,
            trustedState: { playerId: 'player2' },
          },
        ],
        playersReady: ['player2', 'player1'], // Both players ready after submission
      };

      mockGameStateService.getGameState
        .mockResolvedValueOnce(mockGameState as any)
        .mockResolvedValueOnce(updatedGameState as any);
      mockGameStateService.storeTrustedStateAndMarkReady.mockResolvedValue(
        true
      );
      mockGameStateService.advanceGamePhase.mockResolvedValue(
        GamePhase.STATE_UPDATE
      );

      // Mock the advanceToStateUpdate method since our new logic calls it
      const advanceToStateUpdateSpy = jest.spyOn(
        gateway,
        'advanceToStateUpdate'
      );
      advanceToStateUpdateSpy.mockResolvedValue();

      await gateway.handleSubmitTrustedState(mockSocket, {
        roomId,
        trustedState,
      });

      expect(
        mockGameStateService.storeTrustedStateAndMarkReady
      ).toHaveBeenCalledWith(roomId, 'player1', trustedState);
      expect(mockSocket.emit).toHaveBeenCalledWith('trustedStateResult', {
        success: true,
      });

      // Should advance to state update since both players have trusted states and are ready
      expect(advanceToStateUpdateSpy).toHaveBeenCalledWith(roomId);
    });

    it('should reject trusted state in wrong phase', async () => {
      const roomId = 'test-room';
      const trustedState: ITrustedState = {
        playerId: 'player1',
        stateCommit: 'test-commit',
        publicState: {
          playerId: 'player1',
          socketId: 'test-socket',
          fields: defaultStateFields, // Use proper fields array - consistent with our updates
        },
        signature: 'test-signature',
      };

      const mockGameState = {
        roomId,
        currentPhase: GamePhase.SPELL_CASTING, // Wrong phase
        players: [{ id: 'player1', isAlive: true }],
      };

      mockGameStateService.getGameState.mockResolvedValue(mockGameState as any);

      await gateway.handleSubmitTrustedState(mockSocket, {
        roomId,
        trustedState,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('trustedStateResult', {
        success: false,
        error: 'Invalid phase for trusted state submission',
      });
      expect(mockGameStateService.storeTrustedState).not.toHaveBeenCalled();
    });
  });

  describe('handleReportDead', () => {
    it('should handle player death and announce winner', async () => {
      const roomId = 'test-room';
      const dead: IDead = { playerId: 'player1' };
      const winnerId = 'player2';

      mockGameStateService.markPlayerDead.mockResolvedValue(winnerId);

      await gateway.handleReportDead(mockSocket, { roomId, dead });

      expect(mockGameStateService.markPlayerDead).toHaveBeenCalledWith(
        roomId,
        'player1'
      );
      expect(mockServer.to(roomId).emit).toHaveBeenCalledWith('gameEnd', {
        winnerId,
      });
      expect(mockGameStateService.publishToRoom).toHaveBeenCalledWith(
        roomId,
        'gameEnd',
        { winnerId }
      );
    });

    it('should handle player death without ending game', async () => {
      const roomId = 'test-room';
      const dead: IDead = { playerId: 'player1' };

      mockGameStateService.markPlayerDead.mockResolvedValue(null); // Game continues

      await gateway.handleReportDead(mockSocket, { roomId, dead });

      expect(mockGameStateService.markPlayerDead).toHaveBeenCalledWith(
        roomId,
        'player1'
      );
      expect(mockServer.to(roomId).emit).not.toHaveBeenCalledWith(
        'gameEnd',
        expect.anything()
      );
    });
  });

  describe('phase advancement', () => {
    it('should advance from spell casting to spell propagation when all players ready', async () => {
      const roomId = 'test-room';
      const allActions = {
        player1: {
          actions: [
            { playerId: 'player1', spellId: 'fireball', spellCastInfo: {} },
          ],
          signature: 'sig1',
        },
        player2: {
          actions: [
            { playerId: 'player2', spellId: 'heal', spellCastInfo: {} },
          ],
          signature: 'sig2',
        },
      };

      mockGameStateService.getAllPlayerActions.mockResolvedValue(allActions);
      mockGameStateService.advanceGamePhase.mockResolvedValue(
        GamePhase.SPELL_PROPAGATION
      );

      // Call the private method via reflection for testing
      await (gateway as any).advanceToSpellPropagation(roomId);

      expect(mockGameStateService.getAllPlayerActions).toHaveBeenCalledWith(
        roomId
      );
      expect(mockGameStateService.advanceGamePhase).toHaveBeenCalledWith(
        roomId
      );
      expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(
        'allPlayerActions',
        allActions
      );
      expect(mockGameStateService.publishToRoom).toHaveBeenCalledWith(
        roomId,
        'allPlayerActions',
        allActions
      );
    });

    it('should advance to state update and broadcast trusted states', async () => {
      const roomId = 'test-room';
      const trustedStates = [
        {
          playerId: 'player1',
          stateCommit: 'commit1',
          publicState: {},
          signature: 'sig1',
        },
        {
          playerId: 'player2',
          stateCommit: 'commit2',
          publicState: {},
          signature: 'sig2',
        },
      ];

      const mockGameState = {
        roomId,
        players: [
          { id: 'player1', isAlive: true, trustedState: trustedStates[0] },
          { id: 'player2', isAlive: true, trustedState: trustedStates[1] },
        ],
      };

      mockGameStateService.getGameState.mockResolvedValue(mockGameState as any);
      mockGameStateService.advanceGamePhase.mockResolvedValue(
        GamePhase.STATE_UPDATE
      );

      // Call the private method via reflection for testing
      await (gateway as any).advanceToStateUpdate(roomId);

      expect(mockGameStateService.advanceGamePhase).toHaveBeenCalledWith(
        roomId
      );
      expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(
        'updateUserStates',
        { states: trustedStates }
      );
      expect(mockGameStateService.publishToRoom).toHaveBeenCalledWith(
        roomId,
        'updateUserStates',
        { states: trustedStates }
      );
    });
  });

  describe('cross-instance events', () => {
    it('should handle allPlayerActions cross-instance event', async () => {
      const data = {
        roomId: 'test-room',
        event: 'allPlayerActions',
        data: { player1: { actions: [], signature: 'sig' } },
        originInstanceId: 'other-instance',
        timestamp: Date.now(),
      };

      await (gateway as any).handleCrossInstanceEvent(data);

      expect(mockServer.to(data.roomId).emit).toHaveBeenCalledWith(
        'allPlayerActions',
        data.data
      );
    });

    it('should handle gameEnd cross-instance event', async () => {
      const data = {
        roomId: 'test-room',
        event: 'gameEnd',
        data: { winnerId: 'player1' },
        originInstanceId: 'other-instance',
        timestamp: Date.now(),
      };

      await (gateway as any).handleCrossInstanceEvent(data);

      expect(mockServer.to(data.roomId).emit).toHaveBeenCalledWith(
        'gameEnd',
        data.data
      );
    });

    it('should ignore events from same instance', async () => {
      const data = {
        roomId: 'test-room',
        event: 'gameEnd',
        data: { winnerId: 'player1' },
        originInstanceId: 'test-instance', // Same as mock return value
        timestamp: Date.now(),
      };

      await (gateway as any).handleCrossInstanceEvent(data);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });
});
