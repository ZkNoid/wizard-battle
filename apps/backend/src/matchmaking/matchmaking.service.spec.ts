import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingService } from './matchmaking.service';
import { GameStateService } from '../game-session/game-state.service';
import { Server, Socket } from 'socket.io';
import { createMock } from '@golevelup/ts-jest';
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
} from '../../../common/types/matchmaking.types';

// Mock Redis client
const mockRedisClient = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    lPush: jest.fn(),
    lRange: jest.fn(),
    lRem: jest.fn(),
    hSet: jest.fn(),
    hKeys: jest.fn(),
    hGetAll: jest.fn(),
    hDel: jest.fn(),
    hGet: jest.fn(),
    quit: jest.fn(),
};

// Mock the redis module before any imports
jest.mock('redis', () => ({
    createClient: jest.fn(() => mockRedisClient),
}));

describe('MatchmakingService', () => {
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
            createGameState: jest.fn().mockResolvedValue({ roomId: 'room', players: [], gameData: {}, turn: 0, status: 'waiting', createdAt: Date.now(), updatedAt: Date.now() }),
            getSocketMapping: jest.fn().mockResolvedValue(null),
            removeGameState: jest.fn().mockResolvedValue(undefined),
            getGameState: jest.fn().mockResolvedValue(null),
        });

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

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('joinMatchmaking', () => {
        const buildAddToQueue = (socketId: string, playerId: string, level: number): IAddToQueue => {
            const map = new TransformedMap([[0]]);
            const spells = [new TransformedSpell('s1', 0, true)];
            const setup: IPublicState = new TransformedPlayerSetup(socketId, playerId, 'WZ', 100, map, spells, level);
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
            mockRedisClient.lRange
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup)]) // First player joins
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup)]); // Check for match - no match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['Player1-Player2']);

            // Mock server.sockets.sockets.get
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(mockSocket2);

            // First player joins
            const roomId1 = await service.joinMatchmaking(mockSocket1, addToQueue1);
            expect(roomId1).toBeNull();
            expect(mockSocket1.emit).toHaveBeenCalledWith('addtoqueue', expect.objectContaining({ success: true } as IAddToQueueResponse));

            // Reset mocks for second player
            jest.clearAllMocks();
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup), JSON.stringify(addToQueue2.playerSetup)]) // Second player joins
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup), JSON.stringify(addToQueue2.playerSetup)]); // Check for match - found match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['Player1-Player2']);

            // Second player joins and should match with first
            const roomId2 = await service.joinMatchmaking(mockSocket2, addToQueue2);
            expect(roomId2).toBeDefined();
            expect(roomId2).toEqual('Player1-Player2');

            // Verify both players joined the room
            expect(mockSocket2.join).toHaveBeenCalledWith('Player1-Player2');

            // Verify match notification was sent to the local socket (mockSocket2)
            expect(mockSocket2.emit).toHaveBeenCalledWith('matchFound', expect.objectContaining({
                roomId: 'Player1-Player2',
                opponentId: 'Player1',
            } as Partial<IFoundMatch>));
        });

        it('should match two level 3 players in their own room', async () => {
            const mockSocket1 = createMock<Socket>({ id: 'socket3' });
            const mockSocket2 = createMock<Socket>({ id: 'socket4' });

            const addToQueue1 = buildAddToQueue('socket3', 'Player3', 3);
            const addToQueue2 = buildAddToQueue('socket4', 'Player4', 3);

            // Mock Redis responses for first player
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup)]) // First player joins
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup)]); // Check for match - no match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['Player3-Player4']);

            // Mock server.sockets.sockets.get
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(mockSocket2);

            // First player joins
            const roomId1 = await service.joinMatchmaking(mockSocket1, addToQueue1);
            expect(roomId1).toBeNull();
            expect(mockSocket1.emit).toHaveBeenCalledWith('addtoqueue', expect.objectContaining({ success: true } as IAddToQueueResponse));

            // Reset mocks for second player
            jest.clearAllMocks();
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup), JSON.stringify(addToQueue2.playerSetup)]) // Second player joins
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup), JSON.stringify(addToQueue2.playerSetup)]); // Check for match - found match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['Player3-Player4']);

            // Second player joins and should match with first
            const roomId2 = await service.joinMatchmaking(mockSocket2, addToQueue2);
            expect(roomId2).toBeDefined();
            expect(roomId2).toEqual('Player3-Player4');

            // Verify both players joined the room
            expect(mockSocket2.join).toHaveBeenCalledWith('Player3-Player4');

            // Verify match notification was sent to the socket
            expect(mockSocket2.emit).toHaveBeenCalledWith('matchFound', expect.objectContaining({
                roomId: 'Player3-Player4',
                opponentId: 'Player3',
            } as Partial<IFoundMatch>));
        });

        it('should not match level 2 and level 3 players', async () => {
            const mockSocket1 = createMock<Socket>({ id: 'socket5' });
            const mockSocket2 = createMock<Socket>({ id: 'socket6' });

            const addToQueue1 = buildAddToQueue('socket5', 'Player5', 2);
            const addToQueue2 = buildAddToQueue('socket6', 'Player6', 3);

            // Mock Redis responses - no match found
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup)]) // First player joins
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup)]); // Check for match - no match

            // Level 2 player joins
            const roomId1 = await service.joinMatchmaking(mockSocket1, addToQueue1);
            expect(roomId1).toBeNull();
            expect(mockSocket1.emit).toHaveBeenCalledWith('addtoqueue', expect.objectContaining({ success: true } as IAddToQueueResponse));

            // Reset mocks for second player
            jest.clearAllMocks();
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce([JSON.stringify(addToQueue2.playerSetup)]) // Second player joins
                .mockResolvedValueOnce([JSON.stringify(addToQueue2.playerSetup)]); // Check for match - no match

            // Level 3 player joins, should not match with level 2
            const roomId2 = await service.joinMatchmaking(mockSocket2, addToQueue2);
            expect(roomId2).toBeNull();
            expect(mockSocket2.emit).toHaveBeenCalledWith('addtoqueue', expect.objectContaining({ success: true } as IAddToQueueResponse));

            // Verify no room was created
            expect(mockSocket1.join).not.toHaveBeenCalled();
            expect(mockSocket2.join).not.toHaveBeenCalled();
        });

        it('should handle server not being initialized', async () => {
            const mockSocket = createMock<Socket>({ id: 'socket1' });

            // Create service without setting server
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    MatchmakingService,
                    {
                        provide: GameStateService,
                        useValue: createMock<GameStateService>({
                            publishToRoom: jest.fn().mockResolvedValue(undefined),
                            registerSocket: jest.fn().mockResolvedValue(undefined),
                            createGameState: jest.fn().mockResolvedValue({ roomId: 'room', players: [], gameData: {}, turn: 0, status: 'waiting', createdAt: Date.now(), updatedAt: Date.now() }),
                        }),
                    },
                ],
            }).compile();
            const serviceWithoutServer = module.get<MatchmakingService>(MatchmakingService);

            // Mock Redis responses
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce([JSON.stringify(new TransformedPlayerSetup('socket1', 'Player1', 'WZ', 100, new TransformedMap([[0]]), [new TransformedSpell('s', 0, true)], 2)), JSON.stringify(new TransformedPlayerSetup('socket2', 'Player2', 'WZ', 100, new TransformedMap([[0]]), [new TransformedSpell('s', 0, true)], 2))]) // Player joins
                .mockResolvedValueOnce([JSON.stringify(new TransformedPlayerSetup('socket1', 'Player1', 'WZ', 100, new TransformedMap([[0]]), [new TransformedSpell('s', 0, true)], 2)), JSON.stringify(new TransformedPlayerSetup('socket2', 'Player2', 'WZ', 100, new TransformedMap([[0]]), [new TransformedSpell('s', 0, true)], 2))]); // Check for match - found match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['Player1-Player2']);

            // Mock server.sockets.sockets.get to return null (socket not found)
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(null);

            const addToQueue = new TransformedAddToQueue('Player1', new TransformedPlayerSetup('socket1', 'Player1', 'WZ', 100, new TransformedMap([[0]]), [new TransformedSpell('s', 0, true)], 2), 0, null, null);
            const roomId = await serviceWithoutServer.joinMatchmaking(mockSocket, addToQueue);
            expect(roomId).toBeDefined();
            expect(roomId).toEqual('Player1-Player2');
        });

        it('should handle matched socket not found', async () => {
            const mockSocket2 = createMock<Socket>({ id: 'socket2' });

            const addToQueue1 = new TransformedAddToQueue('Player1', new TransformedPlayerSetup('socket1', 'Player1', 'WZ', 100, new TransformedMap([[0]]), [new TransformedSpell('s', 0, true)], 2), 0, null, null);
            const addToQueue2 = new TransformedAddToQueue('Player2', new TransformedPlayerSetup('socket2', 'Player2', 'WZ', 100, new TransformedMap([[0]]), [new TransformedSpell('s', 0, true)], 2), 0, null, null);

            // Mock Redis responses
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup), JSON.stringify(addToQueue2.playerSetup)]) // Second player joins
                .mockResolvedValueOnce([JSON.stringify(addToQueue1.playerSetup), JSON.stringify(addToQueue2.playerSetup)]); // Check for match - found match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['Player1-Player2']);

            // Mock server.sockets.sockets.get to return null (socket not found)
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(null);

            const roomId = await service.joinMatchmaking(mockSocket2, addToQueue2);
            expect(roomId).toBeDefined();
            expect(roomId).toEqual('Player1-Player2');
        });
    });

    describe('leaveMatchmaking', () => {
        it('should remove player from waiting list', async () => {
            const mockSocket = createMock<Socket>({ id: 'socket1' });

            // Mock Redis responses
            mockRedisClient.lRange.mockResolvedValue([JSON.stringify({ socketId: 'socket1', playerId: 'Player1', level: 2 })]);
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hGetAll.mockResolvedValue({});

            await service.leaveMatchmaking(mockSocket);

            expect(mockRedisClient.lRange).toHaveBeenCalledWith('waiting:level:2', 0, -1);
            expect(mockRedisClient.lRem).toHaveBeenCalledWith('waiting:level:2', 1, JSON.stringify({ socketId: 'socket1', playerId: 'Player1', level: 2 }));
        });

        it('should handle player leaving from match', async () => {
            const mockSocket = createMock<Socket>({ id: 'socket1' });
            const mockOtherSocket = createMock<Socket>({ id: 'socket2' });

            // Mock Redis responses
            mockRedisClient.lRange.mockResolvedValue([]);
            mockRedisClient.hGetAll.mockResolvedValue({
                'Player1-Player2': JSON.stringify({
                    player1: { socketId: 'socket1', playerId: 'Player1', level: 2 },
                    player2: { socketId: 'socket2', playerId: 'Player2', level: 2 },
                    roomId: 'Player1-Player2'
                })
            });
            mockRedisClient.hDel.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue([]);

            // Mock server.sockets.sockets.get
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(mockOtherSocket);

            await service.leaveMatchmaking(mockSocket);

            expect(mockOtherSocket.emit).toHaveBeenCalledWith('opponentDisconnected');
            expect(mockOtherSocket.leave).toHaveBeenCalledWith('Player1-Player2');
            expect(mockRedisClient.hDel).toHaveBeenCalledWith('matches', 'Player1-Player2');
        });

        it('should handle player leaving from match when other socket not found', async () => {
            const mockSocket = createMock<Socket>({ id: 'socket1' });

            // Mock Redis responses
            mockRedisClient.lRange.mockResolvedValue([]);
            mockRedisClient.hGetAll.mockResolvedValue({
                'Player1-Player2': JSON.stringify({
                    player1: { socketId: 'socket1', playerId: 'Player1', level: 2 },
                    player2: { socketId: 'socket2', playerId: 'Player2', level: 2 },
                    roomId: 'Player1-Player2'
                })
            });
            mockRedisClient.hDel.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue([]);

            // Mock server.sockets.sockets.get to return null
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(null);

            await service.leaveMatchmaking(mockSocket);

            expect(mockRedisClient.hDel).toHaveBeenCalledWith('matches', 'Player1-Player2');
        });
    });

    describe('getMatchInfo', () => {
        it('should return match info for valid room', async () => {
            const mockMatch = {
                player1: { socketId: 'socket1', playerId: 'Player1', level: 2 },
                player2: { socketId: 'socket2', playerId: 'Player2', level: 2 },
                roomId: 'Player1-Player2'
            };

            mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockMatch));

            const result = await service.getMatchInfo('Player1-Player2');

            expect(result).toEqual(mockMatch);
            expect(mockRedisClient.hGet).toHaveBeenCalledWith('matches', 'Player1-Player2');
        });

        it('should return null for invalid room', async () => {
            mockRedisClient.hGet.mockResolvedValue(null);

            const result = await service.getMatchInfo('invalid-room');

            expect(result).toBeNull();
            expect(mockRedisClient.hGet).toHaveBeenCalledWith('matches', 'invalid-room');
        });
    });

    describe('disconnect', () => {
        it('should disconnect Redis client', async () => {
            mockRedisClient.quit.mockResolvedValue(undefined);

            await service.disconnect();

            expect(mockRedisClient.quit).toHaveBeenCalled();
        });
    });
});