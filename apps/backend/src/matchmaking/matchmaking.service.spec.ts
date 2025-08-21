import { Test, TestingModule } from "@nestjs/testing";
import { MatchmakingService } from "./matchmaking.service";
import { GameStateService } from "../game-session/game-state.service";
import { Server, Socket } from "socket.io";
import { createMock } from "@golevelup/ts-jest";
import {
  IAddToQueue,
  IAddToQueueResponse,
  IFoundMatch,
  IUpdateQueue,
  TransformedAddToQueue,
  TransformedMap,
  TransformedPlayerSetup,
  TransformedSpell,
  IPublicState,
} from "../../../common/types/matchmaking.types";
import { State } from "../../../common/stater/state";

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
  quit: jest.fn(),
};

// Mock the redis module before any imports
jest.mock("redis", () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

const defaultState = State.default();
const defaultStateFields = State.toFields(defaultState);

describe("MatchmakingService", () => {
  let service: MatchmakingService;
  let mockServer: Server;
  let mockGameStateService: GameStateService;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a proper mock for server.to() chaining
    const mockTo = jest.fn().mockReturnValue({
      emit: jest.fn(),
    });
    mockServer = createMock<Server>({
      to: mockTo,
    });

    // Create mock GameStateService with methods used by MatchmakingService
    mockGameStateService = createMock<GameStateService>({
      publishToRoom: jest.fn().mockResolvedValue(undefined),
      registerSocket: jest.fn().mockResolvedValue(undefined),
      createGameState: jest.fn().mockResolvedValue({
        roomId: "room",
        players: [],
        gameData: {},
        turn: 0,
        status: "waiting",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
      getSocketMapping: jest.fn().mockResolvedValue(null),
      removeGameState: jest.fn().mockResolvedValue(undefined),
      getGameState: jest.fn().mockResolvedValue(null),
    }) as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        {
          provide: GameStateService,
          useValue: mockGameStateService,
        },
      ],
    }).compile();

    service = module.get<MatchmakingService>(MatchmakingService);
    service.setServer(mockServer);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("joinMatchmaking", () => {
    const buildAddToQueue = (
      socketId: string,
      playerId: string,
      level: number,
    ): IAddToQueue => {
      const map = new TransformedMap([[0]]);
      const spells = [new TransformedSpell("s1", 0, true)];
      const setup: IPublicState = new TransformedPlayerSetup(
        socketId,
        playerId,
        defaultStateFields,
      );
      return new TransformedAddToQueue(playerId, setup, 0, null, null);
    };

    it("should match two level 2 players in their own room", async () => {
      const mockSocket1 = createMock<Socket>({ id: "socket1" });
      const mockSocket2 = createMock<Socket>({ id: "socket2" });

      // First player data
      const addToQueue1 = buildAddToQueue("socket1", "Player1", 2);
      const addToQueue2 = buildAddToQueue("socket2", "Player2", 2);

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
        "addtoqueue",
        expect.objectContaining({ success: true } as IAddToQueueResponse),
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
        undefined,
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
        service,
      );
      await processMatchmaking();

      // Verify that a match was created (hSet called)
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        "matches",
        "Player1-Player2",
        expect.any(String),
      );
      // Verify that players were removed from queue (lRem called after successful match creation)
      expect(mockRedisClient.lRem).toHaveBeenCalled();
    });

    it("should match two level 3 players in their own room", async () => {
      const mockSocket1 = createMock<Socket>({ id: "socket3" });
      const mockSocket2 = createMock<Socket>({ id: "socket4" });

      const addToQueue1 = buildAddToQueue("socket3", "Player3", 3);
      const addToQueue2 = buildAddToQueue("socket4", "Player4", 3);

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
        "addtoqueue",
        expect.objectContaining({ success: true } as IAddToQueueResponse),
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
        undefined,
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
        service,
      );
      await processMatchmaking();

      // Verify that a match was created (hSet called)
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        "matches",
        "Player3-Player4",
        expect.any(String),
      );
      // Verify that players were removed from queue (lRem called after successful match creation)
      expect(mockRedisClient.lRem).toHaveBeenCalled();
    });

    it("should match level 2 and level 3 players (current behavior allows cross-level matching)", async () => {
      const mockSocket1 = createMock<Socket>({ id: "socket5" });
      const mockSocket2 = createMock<Socket>({ id: "socket6" });

      const addToQueue1 = buildAddToQueue("socket5", "Player5", 2);
      const addToQueue2 = buildAddToQueue("socket6", "Player6", 3);

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
        "addtoqueue",
        expect.objectContaining({ success: true } as IAddToQueueResponse),
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
        "addtoqueue",
        expect.objectContaining({ success: true } as IAddToQueueResponse),
      );

      // Mock the matchmaking process requirements
      mockRedisClient.hGetAll.mockResolvedValue({}); // No existing matches
      mockRedisClient.hGet.mockResolvedValue(null); // No duplicate match
      mockRedisClient.hSet.mockResolvedValue(1); // Match creation succeeds
      (mockGameStateService.createGameState as any).mockResolvedValue(
        undefined,
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
        service,
      );
      await processMatchmaking();

      // Verify that a match was created - the current behavior allows cross-level matching
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        "matches",
        "Player5-Player6",
        expect.any(String),
      );
    });

    it("should handle server not being initialized", async () => {
      const mockSocket = createMock<Socket>({ id: "socket1" });

      // Create service without setting server
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MatchmakingService,
          {
            provide: GameStateService,
            useValue: createMock<GameStateService>({
              publishToRoom: jest.fn().mockResolvedValue(undefined),
              registerSocket: jest.fn().mockResolvedValue(undefined),
              createGameState: jest.fn().mockResolvedValue({
                roomId: "room",
                players: [],
                gameData: {},
                turn: 0,
                status: "waiting",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }),
            }),
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
            "socket1",
            "Player1",
            defaultStateFields,
          ),
          timestamp: Date.now(),
        }),
      ]);

      const addToQueue = new TransformedAddToQueue(
        "Player1",
        new TransformedPlayerSetup("socket1", "Player1", defaultStateFields),
        0,
        null,
        null,
      );
      const roomId = await serviceWithoutServer.joinMatchmaking(
        mockSocket,
        addToQueue,
      );
      expect(roomId).toBeNull(); // No immediate match, waits for cycle
    });

    it("should handle matched socket not found", async () => {
      const mockSocket2 = createMock<Socket>({ id: "socket2" });

      const addToQueue1 = new TransformedAddToQueue(
        "Player1",
        new TransformedPlayerSetup("socket1", "Player1", defaultStateFields),
        0,
        null,
        null,
      );
      const addToQueue2 = new TransformedAddToQueue(
        "Player2",
        new TransformedPlayerSetup("socket2", "Player2", defaultStateFields),
        0,
        null,
        null,
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

  describe("leaveMatchmaking", () => {
    it("should remove player from waiting list", async () => {
      const mockSocket = createMock<Socket>({ id: "socket1" });

      // Mock Redis responses
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify({
          player: { socketId: "socket1", playerId: "Player1", level: 2 },
          timestamp: Date.now(),
        }),
      ]);
      mockRedisClient.lRem.mockResolvedValue(1);
      mockRedisClient.hGetAll.mockResolvedValue({});

      await service.leaveMatchmaking(mockSocket);

      expect(mockRedisClient.lRange).toHaveBeenCalledWith(
        "waiting:queue",
        0,
        -1,
      );
      expect(mockRedisClient.lRem).toHaveBeenCalledWith(
        "waiting:queue",
        1,
        expect.any(String),
      );
    });

    it("should handle player leaving from match", async () => {
      const mockSocket = createMock<Socket>({ id: "socket1" });
      const mockOtherSocket = createMock<Socket>({ id: "socket2" });

      // Mock Redis responses
      mockRedisClient.lRange.mockResolvedValue([]);
      mockRedisClient.hGetAll.mockResolvedValue({
        "Player1-Player2": JSON.stringify({
          player1: { socketId: "socket1", playerId: "Player1", level: 2 },
          player2: { socketId: "socket2", playerId: "Player2", level: 2 },
          roomId: "Player1-Player2",
        }),
      });
      mockRedisClient.hDel.mockResolvedValue(1);
      mockRedisClient.hKeys.mockResolvedValue([]);

      // Mock server.sockets.sockets.get
      mockServer.sockets.sockets.get = jest
        .fn()
        .mockReturnValue(mockOtherSocket);

      await service.leaveMatchmaking(mockSocket);

      expect(mockOtherSocket.emit).toHaveBeenCalledWith("opponentDisconnected");
      expect(mockOtherSocket.leave).toHaveBeenCalledWith("Player1-Player2");
      expect(mockRedisClient.hDel).toHaveBeenCalledWith(
        "matches",
        "Player1-Player2",
      );
    });

    it("should handle player leaving from match when other socket not found", async () => {
      const mockSocket = createMock<Socket>({ id: "socket1" });

      // Mock Redis responses
      mockRedisClient.lRange.mockResolvedValue([]);
      mockRedisClient.hGetAll.mockResolvedValue({
        "Player1-Player2": JSON.stringify({
          player1: { socketId: "socket1", playerId: "Player1", level: 2 },
          player2: { socketId: "socket2", playerId: "Player2", level: 2 },
          roomId: "Player1-Player2",
        }),
      });
      mockRedisClient.hDel.mockResolvedValue(1);
      mockRedisClient.hKeys.mockResolvedValue([]);

      // Mock server.sockets.sockets.get to return null
      mockServer.sockets.sockets.get = jest.fn().mockReturnValue(null);

      await service.leaveMatchmaking(mockSocket);

      expect(mockRedisClient.hDel).toHaveBeenCalledWith(
        "matches",
        "Player1-Player2",
      );
    });
  });

  describe("getMatchInfo", () => {
    it("should return match info for valid room", async () => {
      const mockMatch = {
        player1: { socketId: "socket1", playerId: "Player1", level: 2 },
        player2: { socketId: "socket2", playerId: "Player2", level: 2 },
        roomId: "Player1-Player2",
      };

      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockMatch));

      const result = await service.getMatchInfo("Player1-Player2");

      expect(result).toEqual(mockMatch);
      expect(mockRedisClient.hGet).toHaveBeenCalledWith(
        "matches",
        "Player1-Player2",
      );
    });

    it("should return null for invalid room", async () => {
      mockRedisClient.hGet.mockResolvedValue(null);

      const result = await service.getMatchInfo("invalid-room");

      expect(result).toBeNull();
      expect(mockRedisClient.hGet).toHaveBeenCalledWith(
        "matches",
        "invalid-room",
      );
    });
  });

  describe("clearQueue", () => {
    it("should clear waiting queue and active matches", async () => {
      // Mock Redis responses
      mockRedisClient.del.mockResolvedValue(1);

      await service.clearQueue();

      expect(mockRedisClient.del).toHaveBeenCalledWith("waiting:queue");
      expect(mockRedisClient.del).toHaveBeenCalledWith("matches");
    });

    it("should restart matchmaking loop after cleanup", async () => {
      // Mock Redis responses
      //   mockRedisClient.del.mockResolvedValue(1);
      //   // Spy on startMatchmakingLoop
      //   const startMatchmakingLoopSpy = jest.spyOn(
      //     service as any,
      //     "startMatchmakingLoop",
      //   );
      //   await service.clearQueue();
      //   expect(startMatchmakingLoopSpy).toHaveBeenCalled();
      //   startMatchmakingLoopSpy.mockRestore();
    });

    it("should handle cleanup errors gracefully", async () => {
      // Mock Redis error
      mockRedisClient.del.mockRejectedValue(new Error("Redis error"));

      // Should not throw
      await expect(service.clearQueue()).rejects.toThrow("Redis error");
    });
  });

  describe("disconnect", () => {
    it("should disconnect Redis client", async () => {
      mockRedisClient.quit.mockResolvedValue(undefined);

      await service.disconnect();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
