import { Test, TestingModule } from "@nestjs/testing";
import { MatchmakingService } from "./matchmaking.service";
import { Socket } from "socket.io";
import {
  MatchPlayerData,
  Position,
  QueueEntry,
  TileType,
} from "../../../common/types/matchmaking.types";

describe("MatchmakingService", () => {
  let service: MatchmakingService;
  let mockSocket1: Partial<Socket>;
  let mockSocket2: Partial<Socket>;
  let mockSocket3: Partial<Socket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchmakingService],
    }).compile();

    service = module.get<MatchmakingService>(MatchmakingService);

    // Create mock sockets with more detailed emit tracking
    mockSocket1 = {
      id: "socket1",
      emit: jest.fn((event, data) => {
        console.log(`Socket1 emitted ${event}:`, data);
        return true;
      }),
    };
    mockSocket2 = {
      id: "socket2",
      emit: jest.fn((event, data) => {
        console.log(`Socket2 emitted ${event}:`, data);
        return true;
      }),
    };
    mockSocket3 = {
      id: "socket3",
      emit: jest.fn((event, data) => {
        console.log(`Socket3 emitted ${event}:`, data);
        return true;
      }),
    };
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("addToQueue", () => {
    it("should add player to queue when no opponent is available", () => {
      const matchData: MatchPlayerData = {
        playerId: "player1",
        wizardId: "Mage",
        skillsInfo: [],
        map: {
          matrix: [[TileType.VALLEY]],
        },
        position: new Position(0, 0),
        health: 100,
      };
      const result = service.addToQueue(mockSocket1 as Socket, matchData);

      expect(result).toBe(false);
      expect(mockSocket1.emit).not.toHaveBeenCalled();
    });

    it("should match players when opponent is available", () => {
      const matchData1: MatchPlayerData = {
        playerId: "player1",
        wizardId: "Mage",
        skillsInfo: [],
        map: {
          matrix: [[TileType.VALLEY]],
        },
        position: new Position(0, 0),
        health: 100,
      };
      const matchData2: MatchPlayerData = {
        playerId: "player2",
        wizardId: "Mage",
        skillsInfo: [],
        map: {
          matrix: [[TileType.ROCK]],
        },
        position: new Position(1, 1),
        health: 100,
      };

      // Add first player
      service.addToQueue(mockSocket1 as Socket, matchData1);

      // Add second player - should trigger match
      const result = service.addToQueue(mockSocket2 as Socket, matchData2);

      expect(result).toBe(true);

      // Verify the exact structure of the emitted data
      const player1EmitCall = (mockSocket1.emit as jest.Mock).mock.calls[0];
      expect(player1EmitCall[0]).toBe("matchFound");
      expect(player1EmitCall[1]).toMatchObject({
        matchId: expect.any(String),
        opponent: mockSocket2.id,
        opponentData: matchData2,
      });

      const player2EmitCall = (mockSocket2.emit as jest.Mock).mock.calls[0];
      expect(player2EmitCall[0]).toBe("matchFound");
      expect(player2EmitCall[1]).toMatchObject({
        matchId: expect.any(String),
        opponent: mockSocket1.id,
        opponentData: matchData1,
      });
    });
  });

  describe("removeFromQueue", () => {
    it("should remove player from queue", () => {
      const matchData: MatchPlayerData = {
        playerId: "player1",
        wizardId: "Mage",
        skillsInfo: [],
        map: {
          matrix: [[TileType.VALLEY]],
        },
        position: new Position(0, 0),
        health: 100,
      };

      // Add player to queue
      service.addToQueue(mockSocket1 as Socket, matchData);

      // Remove player
      service.removeFromQueue(mockSocket1 as Socket);

      // Try to match with another player - should not find a match
      const result = service.addToQueue(mockSocket2 as Socket, matchData);
      expect(result).toBe(false);
      expect(mockSocket2.emit).not.toHaveBeenCalled();
    });
  });

  describe("matchmaking flow", () => {
    it("should handle multiple players in queue correctly", () => {
      const matchData1: MatchPlayerData = {
        playerId: "player1",
        wizardId: "Mage",
        skillsInfo: [],
        map: {
          matrix: [[TileType.VALLEY]],
        },
        position: new Position(0, 0),
        health: 100,
      };
      const matchData2: MatchPlayerData = {
        playerId: "player2",
        wizardId: "Mage",
        skillsInfo: [],
        map: {
          matrix: [[TileType.ROCK]],
        },
        position: new Position(1, 1),
        health: 100,
      };
      const matchData3: MatchPlayerData = {
        playerId: "player3",
        wizardId: "Mage",
        skillsInfo: [],
        map: {
          matrix: [[TileType.WATER]],
        },
        position: new Position(2, 2),
        health: 100,
      };

      // Add three players
      service.addToQueue(mockSocket1 as Socket, matchData1);
      service.addToQueue(mockSocket2 as Socket, matchData2);
      service.addToQueue(mockSocket3 as Socket, matchData3);

      // Verify that only two players were matched
      expect(mockSocket1.emit).toHaveBeenCalledWith(
        "matchFound",
        expect.objectContaining({
          matchId: expect.any(String),
          opponent: mockSocket2.id,
          opponentData: matchData2,
        })
      );
      expect(mockSocket2.emit).toHaveBeenCalledWith(
        "matchFound",
        expect.objectContaining({
          matchId: expect.any(String),
          opponent: mockSocket1.id,
          opponentData: matchData1,
        })
      );
      expect(mockSocket3.emit).not.toHaveBeenCalled();
    });
  });
});
