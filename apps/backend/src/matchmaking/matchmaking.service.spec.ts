import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingService } from './matchmaking.service';
import { GameStateService } from '../game-session/game-state.service';
import { Server, Socket } from 'socket.io';
import { createMock } from '@golevelup/ts-jest';

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

        // Create mock GameStateService
        mockGameStateService = createMock<GameStateService>({
            publishToRoom: jest.fn().mockResolvedValue(undefined),
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
        it('should match two level 2 players in their own room', async () => {
            const mockSocket1 = createMock<Socket>({ id: 'player1' });
            const mockSocket2 = createMock<Socket>({ id: 'player2' });

            // Mock Redis responses for first player
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce(['{"id":"player1","level":2}']) // First player joins
                .mockResolvedValueOnce(['{"id":"player1","level":2}']); // Check for match - no match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['player1-player2']);

            // Mock server.sockets.sockets.get
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(mockSocket2);

            // First player joins
            const roomId1 = await service.joinMatchmaking(mockSocket1, 2);
            expect(roomId1).toBeNull();
            expect(mockSocket1.emit).toHaveBeenCalledWith('waiting', { message: 'Waiting for a match...' });

            // Reset mocks for second player
            jest.clearAllMocks();
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce(['{"id":"player1","level":2}', '{"id":"player2","level":2}']) // Second player joins
                .mockResolvedValueOnce(['{"id":"player1","level":2}', '{"id":"player2","level":2}']); // Check for match - found match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['player1-player2']);

            // Second player joins and should match with first
            const roomId2 = await service.joinMatchmaking(mockSocket2, 2);
            expect(roomId2).toBeDefined();
            expect(roomId2).toEqual('player1-player2');

            // Verify both players joined the room
            expect(mockSocket1.join).not.toHaveBeenCalled(); // First player already joined
            expect(mockSocket2.join).toHaveBeenCalledWith('player1-player2');

            // Verify match notification was sent to the socket
            expect(mockSocket2.emit).toHaveBeenCalledWith('matchFound', {
                roomId: 'player1-player2',
                players: [
                    { id: 'player1', level: 2 },
                    { id: 'player2', level: 2 },
                ],
            });
        });

        it('should match two level 3 players in their own room', async () => {
            const mockSocket1 = createMock<Socket>({ id: 'player3' });
            const mockSocket2 = createMock<Socket>({ id: 'player4' });

            // Mock Redis responses for first player
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce(['{"id":"player3","level":3}']) // First player joins
                .mockResolvedValueOnce(['{"id":"player3","level":3}']); // Check for match - no match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['player3-player4']);

            // Mock server.sockets.sockets.get
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(mockSocket2);

            // First player joins
            const roomId1 = await service.joinMatchmaking(mockSocket1, 3);
            expect(roomId1).toBeNull();
            expect(mockSocket1.emit).toHaveBeenCalledWith('waiting', { message: 'Waiting for a match...' });

            // Reset mocks for second player
            jest.clearAllMocks();
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce(['{"id":"player3","level":3}', '{"id":"player4","level":3}']) // Second player joins
                .mockResolvedValueOnce(['{"id":"player3","level":3}', '{"id":"player4","level":3}']); // Check for match - found match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['player3-player4']);

            // Second player joins and should match with first
            const roomId2 = await service.joinMatchmaking(mockSocket2, 3);
            expect(roomId2).toBeDefined();
            expect(roomId2).toEqual('player3-player4');

            // Verify both players joined the room
            expect(mockSocket1.join).not.toHaveBeenCalled(); // First player already joined
            expect(mockSocket2.join).toHaveBeenCalledWith('player3-player4');

            // Verify match notification was sent to the socket
            expect(mockSocket2.emit).toHaveBeenCalledWith('matchFound', {
                roomId: 'player3-player4',
                players: [
                    { id: 'player3', level: 3 },
                    { id: 'player4', level: 3 },
                ],
            });
        });

        it('should not match level 2 and level 3 players', async () => {
            const mockSocket1 = createMock<Socket>({ id: 'player5' });
            const mockSocket2 = createMock<Socket>({ id: 'player6' });

            // Mock Redis responses - no match found
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce(['{"id":"player5","level":2}']) // First player joins
                .mockResolvedValueOnce(['{"id":"player5","level":2}']); // Check for match - no match

            // Level 2 player joins
            const roomId1 = await service.joinMatchmaking(mockSocket1, 2);
            expect(roomId1).toBeNull();
            expect(mockSocket1.emit).toHaveBeenCalledWith('waiting', { message: 'Waiting for a match...' });

            // Reset mocks for second player
            jest.clearAllMocks();
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce(['{"id":"player6","level":3}']) // Second player joins
                .mockResolvedValueOnce(['{"id":"player6","level":3}']); // Check for match - no match

            // Level 3 player joins, should not match with level 2
            const roomId2 = await service.joinMatchmaking(mockSocket2, 3);
            expect(roomId2).toBeNull();
            expect(mockSocket2.emit).toHaveBeenCalledWith('waiting', { message: 'Waiting for a match...' });

            // Verify no room was created
            expect(mockSocket1.join).not.toHaveBeenCalled();
            expect(mockSocket2.join).not.toHaveBeenCalled();
        });

        it('should handle server not being initialized', async () => {
            const mockSocket = createMock<Socket>({ id: 'player1' });

            // Create service without setting server
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    MatchmakingService,
                    {
                        provide: GameStateService,
                        useValue: createMock<GameStateService>(),
                    },
                ],
            }).compile();
            const serviceWithoutServer = module.get<MatchmakingService>(MatchmakingService);

            // Mock Redis responses
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce(['{"id":"player1","level":2}', '{"id":"player2","level":2}']) // Player joins
                .mockResolvedValueOnce(['{"id":"player1","level":2}', '{"id":"player2","level":2}']); // Check for match - found match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['player1-player2']);

            // Mock server.sockets.sockets.get to return null (socket not found)
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(null);

            const roomId = await serviceWithoutServer.joinMatchmaking(mockSocket, 2);
            expect(roomId).toBeDefined();
            expect(roomId).toEqual('player1-player2');
        });

        it('should handle matched socket not found', async () => {
            const mockSocket1 = createMock<Socket>({ id: 'player1' });
            const mockSocket2 = createMock<Socket>({ id: 'player2' });

            // Mock Redis responses
            mockRedisClient.lPush.mockResolvedValue(1);
            mockRedisClient.lRange
                .mockResolvedValueOnce(['{"id":"player1","level":2}', '{"id":"player2","level":2}']) // Second player joins
                .mockResolvedValueOnce(['{"id":"player1","level":2}', '{"id":"player2","level":2}']); // Check for match - found match
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hSet.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue(['player1-player2']);

            // Mock server.sockets.sockets.get to return null (socket not found)
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(null);

            const roomId = await service.joinMatchmaking(mockSocket2, 2);
            expect(roomId).toBeDefined();
            expect(roomId).toEqual('player1-player2');
        });
    });

    describe('leaveMatchmaking', () => {
        it('should remove player from waiting list', async () => {
            const mockSocket = createMock<Socket>({ id: 'player1' });

            // Mock Redis responses
            mockRedisClient.lRange.mockResolvedValue(['{"id":"player1","level":2}']);
            mockRedisClient.lRem.mockResolvedValue(1);
            mockRedisClient.hGetAll.mockResolvedValue({});

            await service.leaveMatchmaking(mockSocket);

            expect(mockRedisClient.lRange).toHaveBeenCalledWith('waiting:level:2', 0, -1);
            expect(mockRedisClient.lRem).toHaveBeenCalledWith('waiting:level:2', 1, '{"id":"player1","level":2}');
        });

        it('should handle player leaving from match', async () => {
            const mockSocket = createMock<Socket>({ id: 'player1' });
            const mockOtherSocket = createMock<Socket>({ id: 'player2' });

            // Mock Redis responses
            mockRedisClient.lRange.mockResolvedValue([]);
            mockRedisClient.hGetAll.mockResolvedValue({
                'player1-player2': JSON.stringify({
                    player1: { id: 'player1', level: 2 },
                    player2: { id: 'player2', level: 2 },
                    roomId: 'player1-player2'
                })
            });
            mockRedisClient.hDel.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue([]);

            // Mock server.sockets.sockets.get
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(mockOtherSocket);

            await service.leaveMatchmaking(mockSocket);

            expect(mockOtherSocket.emit).toHaveBeenCalledWith('opponentDisconnected');
            expect(mockOtherSocket.leave).toHaveBeenCalledWith('player1-player2');
            expect(mockRedisClient.hDel).toHaveBeenCalledWith('matches', 'player1-player2');
        });

        it('should handle player leaving from match when other socket not found', async () => {
            const mockSocket = createMock<Socket>({ id: 'player1' });

            // Mock Redis responses
            mockRedisClient.lRange.mockResolvedValue([]);
            mockRedisClient.hGetAll.mockResolvedValue({
                'player1-player2': JSON.stringify({
                    player1: { id: 'player1', level: 2 },
                    player2: { id: 'player2', level: 2 },
                    roomId: 'player1-player2'
                })
            });
            mockRedisClient.hDel.mockResolvedValue(1);
            mockRedisClient.hKeys.mockResolvedValue([]);

            // Mock server.sockets.sockets.get to return null
            mockServer.sockets.sockets.get = jest.fn().mockReturnValue(null);

            await service.leaveMatchmaking(mockSocket);

            expect(mockRedisClient.hDel).toHaveBeenCalledWith('matches', 'player1-player2');
        });
    });

    describe('getMatchInfo', () => {
        it('should return match info for valid room', async () => {
            const mockMatch = {
                player1: { id: 'player1', level: 2 },
                player2: { id: 'player2', level: 2 },
                roomId: 'player1-player2'
            };

            mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockMatch));

            const result = await service.getMatchInfo('player1-player2');

            expect(result).toEqual(mockMatch);
            expect(mockRedisClient.hGet).toHaveBeenCalledWith('matches', 'player1-player2');
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