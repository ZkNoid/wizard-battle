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
  private processedTimeouts = new Set<string>(); // Track processed timeout rooms

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
   * @notice Enforce 5-minute timeout for SPELL_CASTING
   * @dev If no one submits → draw. If some submit and others don't → non-submitters lose.
   *
   * */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async enforceSpellCastingTimeouts() {
    try {
      const roomIds =
        await this.gameStateService.redisClient.hKeys('game_states');
      const now = Date.now();

      for (const roomId of roomIds) {
        const gameState = await this.gameStateService.getGameState(roomId);
        if (!gameState || gameState.status !== 'active') continue;
        if (gameState.currentPhase !== GamePhase.SPELL_CASTING) continue;

        const configuredTimeout =
          gameState.phaseTimeout ||
          Number(process.env.SPELL_CAST_TIMEOUT || 120000);
        const timeSincePhaseStart = now - gameState.phaseStartTime;
        if (timeSincePhaseStart < configuredTimeout) continue;

        const alivePlayers = gameState.players.filter((p) => p.isAlive);
        const submitters = alivePlayers.filter((p) => !!p.currentActions);
        const nonSubmitters = alivePlayers.filter((p) => !p.currentActions);

        // Only log timeout once per room to prevent spam
        if (!this.processedTimeouts.has(roomId)) {
          console.log(
            `⏰ SPELL_CASTING timeout in room ${roomId} after ${timeSincePhaseStart}ms`
          );
          this.processedTimeouts.add(roomId);
        }

        if (submitters.length === 0) {
          console.log(`🤝 No actions submitted in room ${roomId} → draw`);
          await this.gameStateService.updateGameState(roomId, {
            status: 'finished',
          });
          const gameEnd = { winnerId: 'draw' };
          this.gameSessionGateway.server.to(roomId).emit('gameEnd', gameEnd);
          await this.gameStateService.publishToRoom(roomId, 'gameEnd', gameEnd);
          await this.gameStateService.markRoomForCleanup(
            roomId,
            'spell_casting_timeout_draw'
          );
          // Remove match and game state to allow rematch
          try {
            await this.gameStateService.removeGameState(roomId);
            await this.gameStateService.redisClient.hDel('matches', roomId);
            console.log(
              `🗑️ Cleared match and state for timed-out room ${roomId}`
            );
          } catch (cleanupErr) {
            console.error(
              `Failed to clear room ${roomId} after timeout:`,
              cleanupErr
            );
          }
          // Clear timeout tracking for this room
          this.processedTimeouts.delete(roomId);
          continue;
        }

        if (nonSubmitters.length >= 1) {
          console.log(
            `🏁 SPELL_CASTING timeout: eliminating non-submitters in room ${roomId}: ${nonSubmitters
              .map((p) => p.id)
              .join(', ')}`
          );

          let winnerId: string | null = null;
          for (const p of nonSubmitters) {
            const res = await this.gameStateService.markPlayerDead(
              roomId,
              p.id
            );
            if (res) winnerId = res;
          }

          if (winnerId) {
            const gameEnd = { winnerId };
            console.log(
              `📢 Broadcasting game end for room ${roomId}, winner: ${winnerId}`
            );
            this.gameSessionGateway.server.to(roomId).emit('gameEnd', gameEnd);
            await this.gameStateService.publishToRoom(
              roomId,
              'gameEnd',
              gameEnd
            );
            await this.gameStateService.markRoomForCleanup(
              roomId,
              'spell_casting_timeout_winner_decided'
            );
            // Remove match and game state to allow rematch
            try {
              await this.gameStateService.removeGameState(roomId);
              await this.gameStateService.redisClient.hDel('matches', roomId);
              console.log(
                `🗑️ Cleared match and state for finished room ${roomId}`
              );
            } catch (cleanupErr) {
              console.error(
                `Failed to clear room ${roomId} after finish:`,
                cleanupErr
              );
            }
            // Clear timeout tracking for this room
            this.processedTimeouts.delete(roomId);
          } else {
            console.log(
              `🎮 Room ${roomId} continues after removing non-submitters (multiple submitters alive)`
            );
          }
        }
      }
    } catch (error) {
      console.error('Error enforcing SPELL_CASTING timeouts:', error);
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
   * @notice Purge stale matches every minute
   * @dev Ensures Redis 'matches' entries are removed when rooms are finished or missing
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async purgeStaleMatches() {
    try {
      const matches =
        await this.gameStateService.redisClient.hGetAll('matches');
      if (!matches || Object.keys(matches).length === 0) return;

      for (const [roomId, _] of Object.entries(matches)) {
        const state = await this.gameStateService.getGameState(roomId);
        const timeoutMs = Number(process.env.SPELL_CAST_TIMEOUT || 120000);

        if (!state) {
          // Only remove stale match entry; do not touch game state here
          await this.gameStateService.redisClient.hDel('matches', roomId);
          console.log(`🧽 Purged stale match with no state: ${roomId}`);
          continue;
        }

        const isInactive = state.status !== 'active';
        const isOld =
          Date.now() - (state.updatedAt || state.createdAt || 0) > timeoutMs;
        if (isInactive && isOld) {
          // Only purge stale match entry; avoid deleting game state here to prevent mid-game loss.
          // Room state cleanup should be handled by explicit cleanup flows (e.g., cleanupRoom, markRoomForCleanup, end-of-game paths).
          await this.gameStateService.redisClient.hDel('matches', roomId);
          console.log(
            `🧽 Purged stale match entry (state retained) for room: ${roomId}`
          );
        }
      }
    } catch (error) {
      console.error('Error purging stale matches:', error);
    }
  }

  /**
   * @notice Get rooms that need phase transitions
   */
  private async getPendingPhaseTransitions(): Promise<PhaseTransition[]> {
    const transitions: PhaseTransition[] = [];
    const now = Date.now();

    // Get all active rooms
    const roomIds =
      await this.gameStateService.redisClient.hKeys('game_states');

    for (const roomId of roomIds) {
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

        case GamePhase.END_OF_ROUND:
          // END_OF_ROUND - issue fix
          // Auto-advance to STATE_UPDATE if stuck for more than 10 seconds
          // This prevents games from getting stuck when players fail to submit trusted states
          if (timeSincePhaseStart >= 10000) {
            const alivePlayers = gameState.players.filter((p) => p.isAlive);
            const playersWithTrustedState = gameState.players.filter(
              (p) => p.isAlive && p.trustedState
            );
            const playersReady = gameState.playersReady.length;

            console.log(
              `⚠️ END_OF_ROUND timeout reached for room ${roomId} after ${timeSincePhaseStart}ms`
            );
            console.log(
              `📊 Timeout state: ${alivePlayers.length} alive, ${playersWithTrustedState.length} with trusted states, ${playersReady} ready`
            );
            console.log(
              `🚨 Force advancing room ${roomId} to STATE_UPDATE due to timeout`
            );

            transitions.push({
              roomId,
              currentPhase: GamePhase.END_OF_ROUND,
              nextPhase: GamePhase.STATE_UPDATE,
              delayMs: 0,
            });
          } else if (timeSincePhaseStart >= 5000) {
            // Log warning at 5 seconds to help with debugging
            const alivePlayers = gameState.players.filter((p) => p.isAlive);
            const playersWithTrustedState = gameState.players.filter(
              (p) => p.isAlive && p.trustedState
            );
            const playersWithoutTrustedStates = alivePlayers.filter(
              (p) => !p.trustedState
            );
            const playersNotReady = alivePlayers.filter(
              (p) => !gameState.playersReady.includes(p.id)
            );

            console.log(
              `⏰ END_OF_ROUND phase running for ${timeSincePhaseStart}ms in room ${roomId}`
            );
            console.log(
              `📊 Current state: ${alivePlayers.length} alive, ${playersWithTrustedState.length} with trusted states, ${gameState.playersReady.length} ready`
            );

            if (playersWithoutTrustedStates.length > 0) {
              console.log(
                `⏳ Missing trusted states from: ${playersWithoutTrustedStates.map((p) => p.id).join(', ')}`
              );
            }
            if (playersNotReady.length > 0) {
              console.log(
                `⏳ Not ready: ${playersNotReady.map((p) => p.id).join(', ')}`
              );
            }
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
      // Per-room distributed lock to avoid duplicate transitions across instances
      const owner = `${this.gameStateService.getInstanceId()}-${process.pid}-${Date.now()}`;
      const { ok, lockKey } = await this.gameStateService.acquireRoomLock(
        roomId,
        4000,
        owner,
        'lock:phase'
      );
      if (!ok) {
        console.log(
          `⏭️ Skipping transition for ${roomId} ${currentPhase}→${nextPhase} (lock held)`
        );
        return;
      }

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
        case GamePhase.STATE_UPDATE:
          // END_OF_ROUND - issue fix
          // Handle timeout from END_OF_ROUND - force advance to state update
          if (currentPhase === GamePhase.END_OF_ROUND) {
            console.log(
              `🚨 Force advancing ${roomId} from END_OF_ROUND timeout to STATE_UPDATE`
            );
            await this.gameSessionGateway.advanceToStateUpdate(roomId);
          } else {
            await this.gameStateService.advanceGamePhase(roomId);
          }
          break;
        case GamePhase.SPELL_CASTING:
          await this.gameSessionGateway.startNextTurn(roomId);
          break;
        default:
          await this.gameStateService.advanceGamePhase(roomId);
      }
      // Best-effort lock release
      await this.gameStateService.releaseRoomLock(lockKey, owner);
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

  /**
   * @notice Manually clear stuck rooms (for debugging/admin use)
   * @param roomIds Array of room IDs to clear
   */
  async clearStuckRooms(roomIds: string[]): Promise<void> {
    console.log(`🧹 Manually clearing ${roomIds.length} stuck rooms:`, roomIds);

    for (const roomId of roomIds) {
      try {
        // Clear timeout tracking
        this.processedTimeouts.delete(roomId);

        // Remove from matches
        await this.gameStateService.redisClient.hDel('matches', roomId);

        // Remove game state
        await this.gameStateService.removeGameState(roomId);

        console.log(`✅ Cleared stuck room ${roomId}`);
      } catch (error) {
        console.error(`❌ Failed to clear room ${roomId}:`, error);
      }
    }
  }
}

interface PhaseTransition {
  roomId: string;
  currentPhase: GamePhase;
  nextPhase: GamePhase;
  delayMs: number;
}
