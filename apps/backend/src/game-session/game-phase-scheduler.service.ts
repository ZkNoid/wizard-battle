import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GameStateService } from './game-state.service';
import { GameSessionGateway } from './game-session.gateway';
import { GamePhase } from '../../../common/types/gameplay.types';

/**
 * @title Game Phase Scheduler - Cron-Based Phase Management
 * @notice Handles automatic phase transitions using NestJS cron jobs
 * @dev Replaces manual setTimeout calls with robust cron-based scheduling
 */
@Injectable()
export class GamePhaseSchedulerService {
  private lastMetricsLog = 0;

  constructor(
    private readonly gameStateService: GameStateService,
    @Inject(forwardRef(() => GameSessionGateway))
    private readonly gameSessionGateway: GameSessionGateway
  ) {}

  /**
   * @notice Process pending phase transitions every 5 seconds
   * @dev Checks Redis for rooms that need phase advancement
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processPhaseTransitions() {
    try {
      const pendingTransitions = await this.getPendingPhaseTransitions();

      for (const transition of pendingTransitions) {
        await this.executePhaseTransition(transition);
      }
    } catch (error) {
      console.error('Error processing phase transitions:', error);
    }
  }

  /**
   * @notice Clean up inactive rooms every 5 minutes
   * @dev Removes rooms with no activity for extended periods
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupInactiveRooms() {
    try {
      console.log('🧹 Running inactive room cleanup...');
      const inactiveRooms =
        await this.gameStateService.getInactiveRooms(1800000); // 30 minutes

      for (const roomId of inactiveRooms) {
        console.log(`🧹 Cleaning up inactive room: ${roomId}`);
        await this.gameStateService.cleanupRoom(roomId);
        await this.gameSessionGateway.cleanupRoom(roomId, 'inactive');
      }

      if (inactiveRooms.length > 0) {
        console.log(`✅ Cleaned up ${inactiveRooms.length} inactive rooms`);
      }
    } catch (error) {
      console.error('Error cleaning up inactive rooms:', error);
    }
  }

  /**
   * @notice Check for dead instances every minute
   * @dev Cleans up resources from crashed instances
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupDeadInstances() {
    try {
      await this.gameStateService.cleanupDeadInstances();
    } catch (error) {
      console.error('Error cleaning up dead instances:', error);
    }
  }

  /**
   * @notice Update instance heartbeat every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async updateInstanceHeartbeat() {
    try {
      await this.gameStateService.updateHeartbeat();
    } catch (error) {
      console.error('Error updating instance heartbeat:', error);
    }
  }

  /**
   * @notice Health monitoring every 30 seconds
   * @dev Logs system health metrics and detects issues
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorSystemHealth() {
    try {
      const health = await this.getSystemHealth();

      if (health.issues.length > 0) {
        console.warn('🚨 System health issues detected:', health.issues);
      }

      // Log metrics periodically (every 10 minutes)
      const now = Date.now();
      if (!this.lastMetricsLog || now - this.lastMetricsLog > 600000) {
        console.log('📊 System Metrics:', health.metrics);
        this.lastMetricsLog = now;
      }
    } catch (error) {
      console.error('Error monitoring system health:', error);
    }
  }

  /**
   * @notice Get rooms that need phase transitions
   */
  private async getPendingPhaseTransitions(): Promise<PhaseTransition[]> {
    const transitions: PhaseTransition[] = [];
    const now = Date.now();

    // Get all active rooms
    const roomKeys =
      await this.gameStateService.redisClient.keys('game_state:*');

    for (const key of roomKeys) {
      const roomId = key.replace('game_state:', '');
      const gameState = await this.gameStateService.getGameState(roomId);

      if (!gameState || gameState.status !== 'active') continue;

      const timeSincePhaseStart = now - gameState.phaseStartTime;

      // Check for specific phase transition conditions
      switch (gameState.currentPhase) {
        case GamePhase.SPELL_PROPAGATION:
          // Auto-advance to SPELL_EFFECTS after 1 second
          if (timeSincePhaseStart >= 1000) {
            transitions.push({
              roomId,
              currentPhase: GamePhase.SPELL_PROPAGATION,
              nextPhase: GamePhase.SPELL_EFFECTS,
              delayMs: 0,
            });
          }
          break;

        case GamePhase.SPELL_EFFECTS:
          // Auto-advance to END_OF_ROUND after 2 seconds
          if (timeSincePhaseStart >= 2000) {
            transitions.push({
              roomId,
              currentPhase: GamePhase.SPELL_EFFECTS,
              nextPhase: GamePhase.END_OF_ROUND,
              delayMs: 0,
            });
          }
          break;

        case GamePhase.STATE_UPDATE:
          // Auto-advance to next turn after 2 seconds
          if (timeSincePhaseStart >= 2000) {
            transitions.push({
              roomId,
              currentPhase: GamePhase.STATE_UPDATE,
              nextPhase: GamePhase.SPELL_CASTING,
              delayMs: 0,
            });
          }
          break;
      }
    }

    return transitions;
  }

  /**
   * @notice Execute a phase transition
   */
  private async executePhaseTransition(
    transition: PhaseTransition
  ): Promise<void> {
    const { roomId, currentPhase, nextPhase } = transition;

    try {
      console.log(
        `🔄 Phase transition: ${roomId} ${currentPhase} → ${nextPhase}`
      );

      // GameSessionGateway is now properly injected

      switch (nextPhase) {
        case GamePhase.SPELL_EFFECTS:
          await this.gameSessionGateway.advanceToSpellEffects(roomId);
          break;
        case GamePhase.END_OF_ROUND:
          // Advance phase directly since we don't have a specific method
          await this.gameStateService.advanceGamePhase(roomId);
          break;
        case GamePhase.SPELL_CASTING:
          await this.gameSessionGateway.startNextTurn(roomId);
          break;
        default:
          await this.gameStateService.advanceGamePhase(roomId);
      }
    } catch (error) {
      console.error(`Failed to execute phase transition for ${roomId}:`, error);
      // Clean up room on persistent errors
      await this.gameStateService.cleanupRoom(roomId);
    }
  }

  private async getSystemHealth() {
    const roomKeys =
      await this.gameStateService.redisClient.keys('game_state:*');
    const now = Date.now();
    const issues: string[] = [];

    let oldestRoom: { roomId: string; age: number } | null = null;
    let totalPlayers = 0;

    for (const key of roomKeys.slice(0, 100)) {
      // Sample for performance
      const roomId = key.replace('game_state:', '');
      const gameState = await this.gameStateService.getGameState(roomId);

      if (gameState) {
        const age = now - gameState.createdAt;
        totalPlayers += gameState.players.length;

        if (!oldestRoom || age > oldestRoom.age) {
          oldestRoom = { roomId, age };
        }

        if (age > 7200000) {
          // 2 hours
          issues.push(`Old room: ${roomId} (${Math.round(age / 60000)}min)`);
        }
      }
    }

    return {
      metrics: {
        activeRooms: roomKeys.length,
        totalPlayers,
        oldestRoom,
        memoryUsage: process.memoryUsage(),
      },
      issues,
    };
  }
}

interface PhaseTransition {
  roomId: string;
  currentPhase: GamePhase;
  nextPhase: GamePhase;
  delayMs: number;
}
