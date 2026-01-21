import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { MatchmakingService } from './matchmaking.service';
import { GameStateService } from '../game-session/game-state.service';
import { BotClientService } from '../bot/bot-client.service';
import { RedisService } from '../redis/redis.service';
import { BotService } from '../bot/bot.service';
import { Server, Socket } from 'socket.io';
import { createMock } from '@golevelup/ts-jest';
import {
  IAddToQueue,
  IAddToQueueResponse,
  IFoundMatch,
  IUpdateQueue,
  TransformedAddToQueue,
  TransformedPlayerSetup,
  IPublicState,
} from '../../../common/types/matchmaking.types';
import { State } from '../../../common/stater/state';

// Mock Redis client
const mockRedisClient = {
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  lPush: jest.fn(),
  lRange: jest.fn(),
  lRem: jest.fn(),
  lLen: jest.fn(),
  hSet: jest.fn(),
  hKeys: jest.fn(),
  hGetAll: jest.fn(),
  hDel: jest.fn(),
  hGet: jest.fn(),
  del: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  quit: jest.fn(),
  watch: jest.fn().mockResolvedValue('OK'),
  unwatch: jest.fn().mockResolvedValue('OK'),
  multi: jest.fn().mockReturnValue({
    hSet: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([['OK']]),
  }),
  eval: jest.fn().mockResolvedValue(1),
};

// Mock the redis module before any imports
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

const defaultState = State.default();
const defaultStateFields = State.toFields(defaultState);

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let mockServer: Server;
  let mockGameStateService: GameStateService;
  let mockBotClientService: any;
  let mockRedisService: RedisService;
  let mockBotService: BotService;

  beforeEach(async () => {
    jest.useFakeTimers();
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a proper mock for server.to() chaining
    const mockTo = jest.fn().mockReturnValue({
      emit: jest.fn(),
    });
    mockServer = createMock<Server>({
      to: mockTo,
    });

    // Create mock RedisService
    mockRedisService = createMock<RedisService>({
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      isRedisConnected: jest.fn().mockReturnValue(true),
    }) as any;

    // Default Redis behaviors to prevent null/undefined issues
    mockRedisClient.hGetAll.mockResolvedValue({});

    // Create mock BotService
    mockBotService = createMock<BotService>({
      generateBotSetup: jest.fn().mockReturnValue({
        socketId: 'mock-bot-socket',
        playerId: 'mock-bot-id',
        fields: defaultStateFields,
      }),
      generateBotActions: jest.fn().mockReturnValue([]),
      generateBotTrustedState: jest.fn().mockReturnValue({
        publicState: {
          socketId: 'mock-bot-socket',
          playerId: 'mock-bot-id',
          fields: defaultStateFields,
        },
      }),
    }) as any;

    // Create mock GameStateService with methods used by MatchmakingService
    mockGameStateService = createMock<GameStateService>({
      publishToRoom: jest.fn().mockResolvedValue(undefined),
      registerSocket: jest.fn().mockResolvedValue(undefined),
      unregisterSocket: jest.fn().mockResolvedValue(undefined),
      createGameState: jest.fn().mockResolvedValue({
        roomId: 'room',
        players: [
          {
            id: 'player1',
            socketId: 'socket1',
            instanceId: 'test',
            state: null,
            isAlive: true,
          },
          {
            id: 'player2',
            socketId: 'socket2',
            instanceId: 'test',
            state: null,
            isAlive: true,
          },
        ],
        gameData: {},
        turn: 0,
        currentPhase: 'spell_casting',
        phaseStartTime: Date.now(),
        phaseTimeout: 30000,
        playersReady: [],
        status: 'waiting',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
      getSocketMapping: jest.fn().mockResolvedValue(null),
      removeGameState: jest.fn().mockResolvedValue(undefined),
      getGameState: jest.fn().mockResolvedValue(null),
      advanceGamePhase: jest.fn().mockResolvedValue('spell_propagation'),
      markPlayerReady: jest.fn().mockResolvedValue(true),
      storePlayerActions: jest.fn().mockResolvedValue(undefined),
      storeTrustedState: jest.fn().mockResolvedValue(undefined),
      markPlayerDead: jest.fn().mockResolvedValue(null),
      updateGameState: jest.fn().mockResolvedValue(undefined),
    }) as any;

    // Mock BotClientService
    mockBotClientService = {
      createBotClient: jest.fn().mockResolvedValue({
        getCurrentState: jest.fn().mockReturnValue({
          socketId: 'mock-bot-socket',
          playerId: 'mock-bot-id',
          fields: defaultStateFields, // Use fields only - consistent with our updates
        }),
        getSocketId: jest.fn().mockReturnValue('mock-bot-socket'),
      }),
      disconnectBot: jest.fn().mockResolvedValue(undefined),
      getBot: jest.fn().mockReturnValue(undefined),
      getAllBots: jest.fn().mockReturnValue([]),
      disconnectAllBots: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        MatchmakingService,
        {
          provide: GameStateService,
          useValue: mockGameStateService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: BotClientService,
          useValue: mockBotClientService,
        },
        {
          provide: BotService,
          useValue: mockBotService,
        },
      ],
    }).compile();

    service = module.get<MatchmakingService>(MatchmakingService);
    service.setServer(mockServer);
  });

  afterEach(async () => {
    // Flush any pending timers from setTimeout callbacks in service code
    try {
      // Advance enough time to execute delayed callbacks
      if ((jest as any).advanceTimersByTimeAsync) {
        await (jest as any).advanceTimersByTimeAsync(3000);
      } else {
        jest.advanceTimersByTime(3000);
      }
      if ((jest as any).runOnlyPendingTimersAsync) {
        await (jest as any).runOnlyPendingTimersAsync();
      } else {
        jest.runOnlyPendingTimers();
      }
    } catch (e) {
      console.error('Error running pending timers:', e);
    }
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('joinMatchmaking', () => {
    const buildAddToQueue = (
      socketId: string,
      playerId: string,
      level: number // Note: level parameter not used anymore
    ): IAddToQueue => {
      const setup: IPublicState = new TransformedPlayerSetup(
        socketId,
        playerId,
        JSON.stringify(defaultStateFields.map((field) => field.toString())) // Convert Field[] to string
      );
      return new TransformedAddToQueue(playerId, setup, 0, null, null);
    };

    it('should match two level 2 players in their own room', async () => {
      const mockSocket1 = createMock<Socket>({ id: 'socket1' });
      const mockSocket2 = createMock<Socket>({ id: 'socket2' });

      // First player data
      const addToQueue1 = buildAddToQueue('socket1', 'Player1', 2);
      const addToQueue2 = buildAddToQueue('socket2', 'Player2', 2);

      // Mock Redis responses for first player
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.lLen.mockResolvedValue(1);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      // First player joins
      const roomId1 = await service.joinMatchmaking(mockSocket1, addToQueue1);
      expect(roomId1).toBeNull();
      expect(mockSocket1.emit).toHaveBeenCalledWith(
        'addtoqueue',
        expect.objectContaining({ success: true } as IAddToQueueResponse)
      );

      // Reset mocks for second player
      jest.clearAllMocks();
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.lLen.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
        JSON.stringify({
          player: addToQueue2.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      // Second player joins
      const roomId2 = await service.joinMatchmaking(mockSocket2, addToQueue2);
      expect(roomId2).toBeNull();

      // Mock the matchmaking process requirements
      mockRedisClient.hGetAll.mockResolvedValue({}); // No existing matches
      mockRedisClient.hGet.mockResolvedValue(null); // No duplicate match
      mockRedisClient.hSet.mockResolvedValue(1); // Match creation succeeds
      (mockGameStateService.createGameState as any).mockResolvedValue(
        undefined
      ); // Game state creation succeeds
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
        JSON.stringify({
          player: addToQueue2.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      // Now manually trigger the matchmaking cycle to test the matching logic
      const processMatchmaking = (service as any).processMatchmaking.bind(
        service
      );
      await processMatchmaking();
      // Allow delayed first turn start timer to run within the test
      if ((jest as any).advanceTimersByTimeAsync) {
        await (jest as any).advanceTimersByTimeAsync(2500);
      } else {
        jest.advanceTimersByTime(2500);
      }

      // Verify that a match was created (hSet called)
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'matches',
        'Player1-Player2',
        expect.any(String)
      );
      // Verify that players were removed from queue (lRem called after successful match creation)
      expect(mockRedisClient.lRem).toHaveBeenCalled();
    });

    it('should match two level 3 players in their own room', async () => {
      const mockSocket1 = createMock<Socket>({ id: 'socket3' });
      const mockSocket2 = createMock<Socket>({ id: 'socket4' });

      const addToQueue1 = buildAddToQueue('socket3', 'Player3', 3);
      const addToQueue2 = buildAddToQueue('socket4', 'Player4', 3);

      // Mock Redis responses for first player
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.lLen.mockResolvedValue(1);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      // First player joins
      const roomId1 = await service.joinMatchmaking(mockSocket1, addToQueue1);
      expect(roomId1).toBeNull();
      expect(mockSocket1.emit).toHaveBeenCalledWith(
        'addtoqueue',
        expect.objectContaining({ success: true } as IAddToQueueResponse)
      );

      // Reset mocks for second player
      jest.clearAllMocks();
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.lLen.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
        JSON.stringify({
          player: addToQueue2.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      // Second player joins
      const roomId2 = await service.joinMatchmaking(mockSocket2, addToQueue2);
      expect(roomId2).toBeNull();

      // Mock the matchmaking process requirements
      mockRedisClient.hGetAll.mockResolvedValue({}); // No existing matches
      mockRedisClient.hGet.mockResolvedValue(null); // No duplicate match
      mockRedisClient.hSet.mockResolvedValue(1); // Match creation succeeds
      (mockGameStateService.createGameState as any).mockResolvedValue(
        undefined
      ); // Game state creation succeeds
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
        JSON.stringify({
          player: addToQueue2.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      // Now manually trigger the matchmaking cycle to test the matching logic
      const processMatchmaking = (service as any).processMatchmaking.bind(
        service
      );
      await processMatchmaking();
      if ((jest as any).advanceTimersByTimeAsync) {
        await (jest as any).advanceTimersByTimeAsync(2500);
      } else {
        jest.advanceTimersByTime(2500);
      }

      // Verify that a match was created (hSet called)
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'matches',
        'Player3-Player4',
        expect.any(String)
      );
      // Verify that players were removed from queue (lRem called after successful match creation)
      expect(mockRedisClient.lRem).toHaveBeenCalled();
    });

    it('should match level 2 and level 3 players (current behavior allows cross-level matching)', async () => {
      const mockSocket1 = createMock<Socket>({ id: 'socket5' });
      const mockSocket2 = createMock<Socket>({ id: 'socket6' });

      const addToQueue1 = buildAddToQueue('socket5', 'Player5', 2);
      const addToQueue2 = buildAddToQueue('socket6', 'Player6', 3);

      // Mock Redis responses for first player
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.lLen.mockResolvedValue(1);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      // Level 2 player joins
      const roomId1 = await service.joinMatchmaking(mockSocket1, addToQueue1);
      expect(roomId1).toBeNull();
      expect(mockSocket1.emit).toHaveBeenCalledWith(
        'addtoqueue',
        expect.objectContaining({ success: true } as IAddToQueueResponse)
      );

      // Reset mocks for second player
      jest.clearAllMocks();
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.lLen.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
        JSON.stringify({
          player: addToQueue2.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      // Level 3 player joins, should match with level 2 (current behavior)
      const roomId2 = await service.joinMatchmaking(mockSocket2, addToQueue2);
      expect(roomId2).toBeNull();
      expect(mockSocket2.emit).toHaveBeenCalledWith(
        'addtoqueue',
        expect.objectContaining({ success: true } as IAddToQueueResponse)
      );

      // Mock the matchmaking process requirements
      mockRedisClient.hGetAll.mockResolvedValue({}); // No existing matches
      mockRedisClient.hGet.mockResolvedValue(null); // No duplicate match
      mockRedisClient.hSet.mockResolvedValue(1); // Match creation succeeds
      (mockGameStateService.createGameState as any).mockResolvedValue(
        undefined
      ); // Game state creation succeeds
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
        JSON.stringify({
          player: addToQueue2.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      // Now manually trigger the matchmaking cycle to test that a match is created
      const processMatchmaking = (service as any).processMatchmaking.bind(
        service
      );
      await processMatchmaking();
      if ((jest as any).advanceTimersByTimeAsync) {
        await (jest as any).advanceTimersByTimeAsync(2500);
      } else {
        jest.advanceTimersByTime(2500);
      }

      // Verify that a match was created - the current behavior allows cross-level matching
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'matches',
        'Player5-Player6',
        expect.any(String)
      );
    });

    it('should handle server not being initialized', async () => {
      const mockSocket = createMock<Socket>({ id: 'socket1' });

      // Create service without setting server
      const module: TestingModule = await Test.createTestingModule({
        imports: [ScheduleModule.forRoot()],
        providers: [
          MatchmakingService,
          {
            provide: GameStateService,
            useValue: createMock<GameStateService>({
              publishToRoom: jest.fn().mockResolvedValue(undefined),
              registerSocket: jest.fn().mockResolvedValue(undefined),
              unregisterSocket: jest.fn().mockResolvedValue(undefined),
              createGameState: jest.fn().mockResolvedValue({
                roomId: 'room',
                players: [],
                gameData: {},
                turn: 0,
                status: 'waiting',
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }),
            }),
          },
          {
            provide: RedisService,
            useValue: mockRedisService,
          },
          {
            provide: BotClientService,
            useValue: mockBotClientService,
          },
          {
            provide: BotService,
            useValue: mockBotService,
          },
        ],
      }).compile();
      const serviceWithoutServer =
        module.get<MatchmakingService>(MatchmakingService);

      // Mock Redis responses
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.lLen.mockResolvedValue(1);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: new TransformedPlayerSetup(
            'socket1',
            'Player1',
            JSON.stringify(defaultStateFields.map((field) => field.toString()))
          ),
          timestamp: Date.now(),
        }),
      ]);

      const addToQueue = new TransformedAddToQueue(
        'Player1',
        new TransformedPlayerSetup(
          'socket1',
          'Player1',
          JSON.stringify(defaultStateFields.map((field) => field.toString()))
        ),
        0,
        null,
        null
      );
      const roomId = await serviceWithoutServer.joinMatchmaking(
        mockSocket,
        addToQueue
      );
      expect(roomId).toBeNull(); // No immediate match, waits for cycle
    });

    it('should handle matched socket not found', async () => {
      const mockSocket2 = createMock<Socket>({ id: 'socket2' });

      const addToQueue1 = new TransformedAddToQueue(
        'Player1',
        new TransformedPlayerSetup(
          'socket1',
          'Player1',
          JSON.stringify(defaultStateFields.map((field) => field.toString()))
        ),
        0,
        null,
        null
      );
      const addToQueue2 = new TransformedAddToQueue(
        'Player2',
        new TransformedPlayerSetup(
          'socket2',
          'Player2',
          JSON.stringify(defaultStateFields.map((field) => field.toString()))
        ),
        0,
        null,
        null
      );

      // Mock Redis responses
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.lLen.mockResolvedValue(1);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: addToQueue1.playerSetup,
          timestamp: Date.now(),
        }),
      ]);

      const roomId = await service.joinMatchmaking(mockSocket2, addToQueue2);
      expect(roomId).toBeNull(); // No immediate match, waits for cycle
    });
  });

  describe('leaveMatchmaking', () => {
    it('should remove player from waiting list', async () => {
      const mockSocket = createMock<Socket>({ id: 'socket1' });

      // Mock Redis responses
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: { socketId: 'socket1', playerId: 'Player1', level: 2 },
          timestamp: Date.now(),
        }),
      ]);
      mockRedisClient.lRem.mockResolvedValue(1);
      mockRedisClient.hGetAll.mockResolvedValue({});

      await service.leaveMatchmaking(mockSocket);

      expect(mockRedisClient.lRange).toHaveBeenCalledWith(
        'waiting:queue',
        0,
        -1
      );
      expect(mockRedisClient.lRem).toHaveBeenCalledWith(
        'waiting:queue',
        1,
        expect.any(String)
      );
    });

    it('should handle player leaving from match (rejoin-friendly behavior)', async () => {
      const mockSocket = createMock<Socket>({ id: 'socket1' });
      const mockOtherSocket = createMock<Socket>({ id: 'socket2' });

      // Mock Redis responses
      mockRedisClient.lRange.mockResolvedValue([]);
      mockRedisClient.hGetAll.mockResolvedValue({
        'Player1-Player2': JSON.stringify({
          player1: { socketId: 'socket1', playerId: 'Player1', level: 2 },
          player2: { socketId: 'socket2', playerId: 'Player2', level: 2 },
          roomId: 'Player1-Player2',
        }),
      });
      mockRedisClient.hSet.mockResolvedValue(1);
      mockRedisClient.hKeys.mockResolvedValue(['Player1-Player2']);

      // Mock server.sockets.sockets.get
      mockServer.sockets.sockets.get = jest
        .fn()
        .mockReturnValue(mockOtherSocket);

      await service.leaveMatchmaking(mockSocket);

      // Opponent is notified
      expect(mockOtherSocket.emit).toHaveBeenCalledWith('opponentDisconnected');
      // Match is NOT deleted; instead updated to allow rejoin
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'matches',
        'Player1-Player2',
        expect.any(String)
      );
      expect(mockRedisClient.hDel).not.toHaveBeenCalledWith(
        'matches',
        'Player1-Player2'
      );
    });

    it('should handle player leaving from match when other socket not found (keep match for rejoin)', async () => {
      const mockSocket = createMock<Socket>({ id: 'socket1' });

      // Mock Redis responses
      mockRedisClient.lRange.mockResolvedValue([]);
      mockRedisClient.hGetAll.mockResolvedValue({
        'Player1-Player2': JSON.stringify({
          player1: { socketId: 'socket1', playerId: 'Player1', level: 2 },
          player2: { socketId: 'socket2', playerId: 'Player2', level: 2 },
          roomId: 'Player1-Player2',
        }),
      });
      mockRedisClient.hSet.mockResolvedValue(1);
      mockRedisClient.hKeys.mockResolvedValue(['Player1-Player2']);

      // Mock server.sockets.sockets.get to return null
      mockServer.sockets.sockets.get = jest.fn().mockReturnValue(null);

      await service.leaveMatchmaking(mockSocket);

      // Match should not be removed; updated instead
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'matches',
        'Player1-Player2',
        expect.any(String)
      );
      expect(mockRedisClient.hDel).not.toHaveBeenCalledWith(
        'matches',
        'Player1-Player2'
      );
    });
  });

  describe('getMatchInfo', () => {
    it('should return match info for valid room', async () => {
      const mockMatch = {
        player1: { socketId: 'socket1', playerId: 'Player1', level: 2 },
        player2: { socketId: 'socket2', playerId: 'Player2', level: 2 },
        roomId: 'Player1-Player2',
      };

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockMatch));

      const result = await service.getMatchInfo('Player1-Player2');

      expect(result).toEqual(mockMatch);
      expect(mockRedisClient.hGet).toHaveBeenCalledWith(
        'matches',
        'Player1-Player2'
      );
    });

    it('should return null for invalid room', async () => {
      mockRedisClient.hGet.mockResolvedValue(null);

      const result = await service.getMatchInfo('invalid-room');

      expect(result).toBeNull();
      expect(mockRedisClient.hGet).toHaveBeenCalledWith(
        'matches',
        'invalid-room'
      );
    });
  });

  describe('clearQueue', () => {
    it('should clear waiting queue and active matches', async () => {
      // Mock Redis responses
      mockRedisClient.del.mockResolvedValue(1);

      await service.clearQueue();

      expect(mockRedisClient.del).toHaveBeenCalledWith('waiting:queue');
      expect(mockRedisClient.del).toHaveBeenCalledWith('matches');
    });

    it('should not restart matchmaking loop after cleanup (cron job handles scheduling)', async () => {
      // Mock Redis responses
      mockRedisClient.del.mockResolvedValue(1);

      // With cron job implementation, clearQueue no longer manages intervals
      await service.clearQueue();

      // Verify cleanup operations were called
      expect(mockRedisClient.del).toHaveBeenCalledWith('waiting:queue');
      expect(mockRedisClient.del).toHaveBeenCalledWith('matches');
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock Redis error
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      // Should throw since the error is not caught in clearQueue
      await expect(service.clearQueue()).rejects.toThrow('Redis error');
    });
  });

  describe('disconnect', () => {
    it('should disconnect Redis client', async () => {
      mockRedisClient.quit.mockResolvedValue(undefined);

      await service.disconnect();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('processMatchmaking (cron job)', () => {
    it('should be callable directly for testing', async () => {
      // Mock Redis responses for empty queue
      mockRedisClient.set.mockResolvedValue('OK'); // Lock acquired
      mockRedisClient.lRange.mockResolvedValue([]);
      mockRedisClient.del.mockResolvedValue(1); // Lock released

      // Call the private method directly for testing
      const processMatchmaking = (service as any).processMatchmaking.bind(
        service
      );

      // Should not throw and should handle empty queue gracefully
      await expect(processMatchmaking()).resolves.toBeUndefined();

      expect(mockRedisClient.lRange).toHaveBeenCalledWith(
        'waiting:queue',
        0,
        -1
      );
    });

    it('should process two players and create a match', async () => {
      const player1 = new TransformedPlayerSetup(
        'socket1',
        'Player1',
        JSON.stringify(defaultStateFields.map((field) => field.toString()))
      );
      const player2 = new TransformedPlayerSetup(
        'socket2',
        'Player2',
        JSON.stringify(defaultStateFields.map((field) => field.toString()))
      );

      // Mock Redis responses
      mockRedisClient.set.mockResolvedValue('OK'); // Lock acquired
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({ player: player1, timestamp: Date.now() - 1000 }),
        JSON.stringify({ player: player2, timestamp: Date.now() }),
      ]);
      mockRedisClient.hGetAll.mockResolvedValue({}); // No active matches
      mockRedisClient.hGet.mockResolvedValue(null); // No duplicate match
      mockRedisClient.hSet.mockResolvedValue(1);
      mockRedisClient.lLen.mockResolvedValue(2);
      mockRedisClient.del.mockResolvedValue(1); // Lock released

      // Call processMatchmaking directly
      const processMatchmaking = (service as any).processMatchmaking.bind(
        service
      );
      await processMatchmaking();

      // Verify match was created
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'matches',
        'Player1-Player2',
        expect.any(String)
      );
    });

    it('should handle insufficient players gracefully', async () => {
      // Mock Redis responses for single player
      mockRedisClient.set.mockResolvedValue('OK'); // Lock acquired
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: new TransformedPlayerSetup(
            'socket1',
            'Player1',
            JSON.stringify(defaultStateFields.map((field) => field.toString()))
          ),
          timestamp: Date.now(),
        }),
      ]);
      mockRedisClient.del.mockResolvedValue(1); // Lock released

      const processMatchmaking = (service as any).processMatchmaking.bind(
        service
      );

      // Should not throw with only one player
      await expect(processMatchmaking()).resolves.toBeUndefined();

      // Should not attempt to create matches
      expect(mockRedisClient.hSet).not.toHaveBeenCalled();
    });
  });
});
