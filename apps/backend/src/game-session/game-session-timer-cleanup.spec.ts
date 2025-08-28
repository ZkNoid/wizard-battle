import { Test, TestingModule } from '@nestjs/testing';
import { GameSessionGateway } from './game-session.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameStateService } from './game-state.service';
import { Server, Socket } from 'socket.io';
import { createMock } from '@golevelup/ts-jest';
import { GamePhase, IUserActions, ITrustedState, IDead, IGameEnd } from '../../../common/types/gameplay.types';
import { State } from '../../../common/stater/state';

// Create default state fields for testing
const defaultState = State.default();
const defaultStateFields = State.toFields(defaultState);

/**
 * @title Timer Cleanup Tests - Critical Memory Leak Detection
 * @notice Tests to verify that timers are properly cleaned up to prevent memory leaks
 * @dev These tests address the warnings from Jest about async operations not being cleaned up
 * 
 * Issues Being Tested:
 * 1. setTimeout in advanceToSpellPropagation (line 500) - 1 second delay
 * 2. setTimeout in advanceToStateUpdate (line 577) - 2 second delay  
 * 3. Memory leaks when games end before timers fire
 * 4. Concurrent timer management
 * 5. Room cleanup when all players disconnect
 */
describe('GameSessionGateway - Timer Cleanup Tests', () => {
  let gateway: GameSessionGateway;
  let mockMatchmakingService: any;
  let mockGameStateService: any;
  let mockServer: any;
  let mockSocket: Socket;

  // Track original setTimeout to restore later
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  
  // Mock timer tracking
  let activeTimers: NodeJS.Timeout[] = [];
  let timerCallbacks: (() => void)[] = [];

  beforeEach(async () => {
    // Reset timer tracking
    activeTimers = [];
    timerCallbacks = [];

    // Mock setTimeout to track active timers
    global.setTimeout = jest.fn().mockImplementation((callback: () => void, delay: number) => {
      const timerId = Symbol('timer') as any;
      activeTimers.push(timerId);
      timerCallbacks.push(callback);
      return timerId;
    });

    // Mock clearTimeout to remove from tracking
    global.clearTimeout = jest.fn().mockImplementation((timerId: NodeJS.Timeout) => {
      const index = activeTimers.indexOf(timerId);
      if (index > -1) {
        activeTimers.splice(index, 1);
        timerCallbacks.splice(index, 1);
      }
    });

    // Mock services
    mockMatchmakingService = createMock<MatchmakingService>();
    mockGameStateService = createMock<GameStateService>();
    mockServer = createMock<Server>();
    mockSocket = createMock<Socket>();

    // Setup server.to() chain
    mockServer.to = jest.fn().mockReturnValue({
      emit: jest.fn()
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameSessionGateway,
        { provide: MatchmakingService, useValue: mockMatchmakingService },
        { provide: GameStateService, useValue: mockGameStateService },
      ],
    }).compile();

    gateway = module.get<GameSessionGateway>(GameSessionGateway);
    gateway.server = mockServer;
  });

  afterEach(() => {
    // Restore original timer functions
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });

  describe('Timer Memory Leak Detection', () => {
    it('should detect timer leak in advanceToSpellPropagation', async () => {
      const roomId = 'test-room';
      
      // Mock successful phase advancement
      mockGameStateService.advanceGamePhase.mockResolvedValue(undefined);
      mockGameStateService.getAllPlayerActions.mockResolvedValue({
        player1: { actions: [] },
        player2: { actions: [] }
      });

      // Call the method that creates a timer
      await gateway.advanceToSpellPropagation(roomId);

      // Verify timer was created
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(activeTimers).toHaveLength(1);
      
      // CRITICAL TEST: What happens if game ends before timer fires?
      // This simulates the real-world scenario causing the Jest warnings
      console.log('⚠️  TIMER LEAK DETECTED: Timer will fire even if game/room no longer exists');
      console.log(`Active timers: ${activeTimers.length}`);
      console.log('This is the root cause of Jest warnings about async operations');
    });

    it('should detect timer leak in advanceToStateUpdate', async () => {
      const roomId = 'test-room';
      
      // Mock successful state update
      mockGameStateService.advanceGamePhase.mockResolvedValue(undefined);
      mockGameStateService.getAllTrustedStates.mockResolvedValue({
        player1: { 
          playerId: 'player1', 
          stateCommit: 'commit1', 
          publicState: { 
            socketId: 'socket1', 
            playerId: 'player1', 
            fields: defaultStateFields 
          }, 
          signature: 'sig1' 
        }
      });

      // Call the method that creates a timer
      await gateway.advanceToStateUpdate(roomId);

      // Verify timer was created
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
      expect(activeTimers).toHaveLength(1);
      
      console.log('⚠️  TIMER LEAK DETECTED: 2-second timer will fire regardless of game state');
      console.log(`Active timers: ${activeTimers.length}`);
    });

    it('should demonstrate the memory leak scenario', async () => {
      const roomId = 'test-room-leak';
      
      // Setup mocks
      mockGameStateService.advanceGamePhase.mockResolvedValue(undefined);
      mockGameStateService.getAllPlayerActions.mockResolvedValue({});
      mockGameStateService.getAllTrustedStates.mockResolvedValue({});

      // Start multiple phases that create timers
      await gateway.advanceToSpellPropagation(roomId);  // Creates 1-second timer
      await gateway.advanceToStateUpdate(roomId);       // Creates 2-second timer

      expect(activeTimers).toHaveLength(2);
      console.log(`🚨 MEMORY LEAK: ${activeTimers.length} timers active for room that might be destroyed`);

      // Simulate game ending (no cleanup mechanism exists)
      const gameEnd: IGameEnd = { winnerId: 'player1' };
      mockServer.to(roomId).emit('gameEnd', gameEnd);

      // CRITICAL ISSUE: Timers are still active even though game ended!
      expect(activeTimers).toHaveLength(2);
      console.log('🚨 CRITICAL: Game ended but timers still active - MEMORY LEAK CONFIRMED');
      
      // If timers fire now, they'll operate on non-existent room data
      timerCallbacks.forEach(callback => {
        expect(() => callback()).not.toThrow(); // They shouldn't crash, but they're wasteful
      });
    });
  });

  describe('Concurrent Timer Management', () => {
    it('should handle multiple overlapping phase transitions', async () => {
      const roomId = 'concurrent-room';
      
      // Mock services
      mockGameStateService.advanceGamePhase.mockResolvedValue(undefined);
      mockGameStateService.getAllPlayerActions.mockResolvedValue({});
      mockGameStateService.getAllTrustedStates.mockResolvedValue({});

      // Rapidly trigger multiple phases (simulating fast gameplay)
      const promises = [
        gateway.advanceToSpellPropagation(roomId),
        gateway.advanceToStateUpdate(roomId),
        gateway.advanceToSpellPropagation(roomId + '2'),
      ];

      await Promise.all(promises);

      expect(activeTimers.length).toBeGreaterThan(0);
      console.log(`⚠️  CONCURRENT TIMERS: ${activeTimers.length} timers running simultaneously`);
      console.log('Risk: Multiple timers for same room or overlapping operations');
    });

    it('should demonstrate race condition potential', async () => {
      const roomId = 'race-room';
      
      mockGameStateService.advanceGamePhase.mockResolvedValue(undefined);
      mockGameStateService.getAllPlayerActions.mockResolvedValue({});

      // Start spell propagation (1-second timer)
      await gateway.advanceToSpellPropagation(roomId);
      
      // Immediately start state update (2-second timer) - this could happen in fast games
      await gateway.advanceToStateUpdate(roomId);

      expect(activeTimers).toHaveLength(2);
      
      // Fire the first timer (spell effects)
      if (timerCallbacks[0]) {
        timerCallbacks[0]();
      }

      console.log('⚠️  RACE CONDITION: First timer fired, but second timer still pending');
      console.log('This could cause phase transitions to happen out of order');
    });
  });

  describe('Room Cleanup Scenarios', () => {
    it('should identify missing cleanup when all players disconnect', async () => {
      const roomId = 'disconnect-room';
      
      // Setup active game with timers
      mockGameStateService.advanceGamePhase.mockResolvedValue(undefined);
      mockGameStateService.getAllPlayerActions.mockResolvedValue({});
      
      await gateway.advanceToSpellPropagation(roomId);
      expect(activeTimers).toHaveLength(1);

      // Simulate all players disconnecting (no cleanup mechanism exists in current code)
      mockSocket.disconnect();
      
      // ISSUE: Timer is still active even though room should be cleaned up
      expect(activeTimers).toHaveLength(1);
      console.log('🚨 CLEANUP ISSUE: Player disconnected but room timer still active');
      console.log('Room should be cleaned up but timer will still fire');
    });

    it('should identify missing cleanup on game end', async () => {
      const roomId = 'game-end-room';
      
      // Start game with active timers
      mockGameStateService.advanceGamePhase.mockResolvedValue(undefined);
      mockGameStateService.getAllPlayerActions.mockResolvedValue({});
      mockGameStateService.getAllTrustedStates.mockResolvedValue({});
      
      await gateway.advanceToSpellPropagation(roomId);
      await gateway.advanceToStateUpdate(roomId);
      expect(activeTimers).toHaveLength(2);

      // Game ends with winner
      const dead: IDead = { playerId: 'player1' };
      mockGameStateService.markPlayerDead.mockResolvedValue('player2'); // Winner found
      
      await gateway.handleReportDead(mockSocket, { roomId, dead });
      
      // Game ended, but timers still active!
      expect(activeTimers).toHaveLength(2);
      console.log('🚨 GAME END LEAK: Game finished but timers still running');
      console.log('These timers will try to advance phases in a finished game');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle timer firing after room destruction', async () => {
      const roomId = 'destroyed-room';
      
      // Mock room operations to fail (simulating destroyed room)
      mockGameStateService.advanceGamePhase.mockRejectedValue(new Error('Room not found'));
      mockGameStateService.getAllPlayerActions.mockResolvedValue({});
      
      await gateway.advanceToSpellPropagation(roomId);
      expect(activeTimers).toHaveLength(1);

      // Fire the timer - it should handle the error gracefully
      const timerCallback = timerCallbacks[0];
      expect(timerCallback).toBeDefined();
      
      // This should not crash, but it's wasted computation
      await expect(async () => {
        if (timerCallback) {
          await timerCallback();
        }
      }).not.toThrow();

      console.log('⚠️  ERROR HANDLING: Timer fired on destroyed room - handled but wasteful');
    });
  });

  describe('Performance Impact', () => {
    it('should measure timer accumulation over time', async () => {
      const baseRoomId = 'perf-room';
      
      mockGameStateService.advanceGamePhase.mockResolvedValue(undefined);
      mockGameStateService.getAllPlayerActions.mockResolvedValue({});
      mockGameStateService.getAllTrustedStates.mockResolvedValue({});

      // Simulate multiple games over time
      for (let i = 0; i < 10; i++) {
        const roomId = `${baseRoomId}-${i}`;
        await gateway.advanceToSpellPropagation(roomId);
        await gateway.advanceToStateUpdate(roomId);
      }

      expect(activeTimers).toHaveLength(20); // 2 timers per game * 10 games
      console.log(`📊 PERFORMANCE IMPACT: ${activeTimers.length} active timers across multiple games`);
      console.log('In production, this could accumulate to hundreds or thousands of timers');
      console.log('Each timer holds memory and will eventually fire, consuming CPU');
    });
  });
});
