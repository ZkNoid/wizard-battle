import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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
  private processedTimeoutsKey = 'processed_timeouts'; // Redis key for shared set
  private transitioning = new Set<string>();

  constructor(
    private readonly gameStateService: GameStateService,
    @Inject(forwardRef(() => GameSessionGateway))
    private readonly gameSessionGateway: GameSessionGateway
  ) {}

  /**
   * Retry wrapper with circuit breaker
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError || new Error('Operation failed after max retries');
  }

  /**
   * @notice Process pending phase transitions every 5 seconds
   * @dev Checks Redis for rooms that need phase advancement
   */
  @Cron('*/5 * * * * *')
  async processPhaseTransitions() {
    if (!(await this.withRetry(() => this.isLeader()))) return;
    try {
      const pendingTransitions = await this.withRetry(() =>
        this.getPendingPhaseTransitions()
      );

      for (const transition of pendingTransitions) {
        await this.withRetry(() => this.executePhaseTransition(transition));
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
  @Cron('*/2 * * * * *')
  async enforceSpellCastingTimeouts() {
    if (!(await this.withRetry(() => this.isLeader()))) return;
    try {
      const roomIds = await this.withRetry(() => this.getAllRoomIdsWithScan());
      const now = Date.now();

      for (const roomId of roomIds) {
        const gameState = await this.withRetry(() =>
          this.gameStateService.getGameState(roomId)
        );
        if (!gameState || gameState.status !== 'active') continue;
        if (gameState.currentPhase !== GamePhase.SPELL_CASTING) continue;

        const configuredTimeout =
          gameState.phaseTimeout ||
          Number(process.env.SPELL_CAST_TIMEOUT || 120000);
        const timeSincePhaseStart = now - gameState.phaseStartTime;
        if (timeSincePhaseStart < configuredTimeout) continue;

        const timeoutMarker = `${roomId}:${gameState.turn}`;
        const isProcessed = await this.withRetry(() =>
          this.gameStateService.redisClient.sIsMember(
            this.processedTimeoutsKey,
            timeoutMarker
          )
        );
        if (isProcessed) continue;

        const alivePlayers = gameState.players.filter((p) => p.isAlive);
        const submitters = alivePlayers.filter((p) => !!p.currentActions);
        const nonSubmitters = alivePlayers.filter((p) => !p.currentActions);

        // Only log action once per room to prevent spam
        console.log(
          `⏰ SPELL_CASTING timeout in room ${roomId} after ${timeSincePhaseStart}ms`
        );
        await this.withRetry(() =>
          this.gameStateService.redisClient.sAdd(
            this.processedTimeoutsKey,
            timeoutMarker
          )
        );
        // New turn has been started and no one submited any acctions -> no rewards!
        if (submitters.length === 0) {
          console.log(`🤝 No actions submitted in room ${roomId} → draw`);
          await this.withRetry(() =>
            this.gameStateService.updateGameState(roomId, {
              status: 'finished',
            })
          );
          const gameEnd = { winnerId: 'draw' };
          this.gameSessionGateway.server.to(roomId).emit('gameEnd', gameEnd);
          await this.withRetry(() =>
            this.gameStateService.publishToRoom(roomId, 'gameEnd', gameEnd)
          );
          await this.withRetry(() =>
            this.gameStateService.markRoomForCleanup(
              roomId,
              'spell_casting_timeout_draw'
            )
          );

          console.log(
            `⚠️ gameEnd event submited for room ${roomId}, with valuw draw`
          );
          // Remove match and game state to allow rematch
          try {
            await this.withRetry(() =>
              this.gameStateService.removeGameState(roomId)
            );
            await this.withRetry(() =>
              this.gameStateService.redisClient.hDel('matches', roomId)
            );
            console.log(
              `🗑️ Cleared match and state for timed-out room ${roomId}`
            );
          } catch (cleanupErr) {
            console.error(
              `Failed to clear room ${roomId} after timeout:`,
              cleanupErr
            );
          }
          // Expire the processed entry after some time
          await this.withRetry(() =>
            this.gameStateService.redisClient.expire(
              this.processedTimeoutsKey,
              3600
            )
          ); // 1 hour
          continue;
        }

        if (nonSubmitters.length >= 1) {
          console.log(
            `🏁 SPELL_CASTING timeout: eliminating non-submitters in room ${roomId}: ${nonSubmitters
              .map((p) => p.id)
              .join(', ')}`
          );
          console.log(
            `🤝 Only one player has submited action in room ${roomId}!`
          );

          let winnerId: string | null = null;

          for (const p of nonSubmitters) {
            const res = await this.withRetry(() =>
              this.gameStateService.markPlayerDead(roomId, p.id)
            );
            if (res && typeof res === 'object' && 'wPlayerId' in res) {
              winnerId = res.wPlayerId; // If this was the last alive player, we have a winner
            }
          }

          if (winnerId) {
            console.log(
              `🏆 Game finished - winner declared: ${winnerId} in room ${roomId}`
            );
            // Update game status to finished
            await this.withRetry(() =>
              this.gameStateService.updateGameState(roomId, {
                status: 'finished',
              })
            );
            const gameEnd = { winnerId };
            console.log(
              `📢 Broadcasting game end for room ${roomId}, winner: ${winnerId}`
            );
            this.gameSessionGateway.server.to(roomId).emit('gameEnd', gameEnd);
            await this.withRetry(() =>
              this.gameStateService.publishToRoom(roomId, 'gameEnd', gameEnd)
            );
            await this.withRetry(() =>
              this.gameStateService.markRoomForCleanup(
                roomId,
                'spell_casting_timeout_winner_decided'
              )
            );
            // Remove match and game state to allow rematch
            try {
              await this.withRetry(() =>
                this.gameStateService.removeGameState(roomId)
              );
              await this.withRetry(() =>
                this.gameStateService.redisClient.hDel('matches', roomId)
              );
              console.log(
                `🗑️ Cleared match and state for finished room ${roomId}`
              );
            } catch (cleanupErr) {
              console.error(
                `Failed to clear room ${roomId} after finish:`,
                cleanupErr
              );
            }
          } else {
            console.log(
              '⚠️ should not be called, only possible if previus winner determination is not valid'
            );
            // Multiple submitters still alive - determine winner from remaining players
            const remainingPlayers = gameState.players.filter((p) => p.isAlive);
            if (remainingPlayers.length === 1) {
              // Should have been caught above, but safety check
              winnerId = remainingPlayers[0]!.id;
              console.log(
                `🏆 Game finished - last player remaining: ${winnerId} in room ${roomId}`
              );
              await this.withRetry(() =>
                this.gameStateService.updateGameState(roomId, {
                  status: 'finished',
                })
              );
              const gameEnd = { winnerId };
              this.gameSessionGateway.server
                .to(roomId)
                .emit('gameEnd', gameEnd);
              await this.withRetry(() =>
                this.gameStateService.publishToRoom(roomId, 'gameEnd', gameEnd)
              );
            } else {
              // Multiple players still alive - it's a draw
              console.log(
                `🤝 Game finished as draw - multiple players still alive in room ${roomId}`
              );
              await this.withRetry(() =>
                this.gameStateService.updateGameState(roomId, {
                  status: 'finished',
                })
              );
              const gameEnd = { winnerId: 'draw' };
              this.gameSessionGateway.server
                .to(roomId)
                .emit('gameEnd', gameEnd);
              await this.withRetry(() =>
                this.gameStateService.publishToRoom(roomId, 'gameEnd', gameEnd)
              );
            }
            await this.withRetry(() =>
              this.gameStateService.markRoomForCleanup(
                roomId,
                'spell_casting_timeout_completed'
              )
            );
            // Remove match and game state to allow rematch
            try {
              await this.withRetry(() =>
                this.gameStateService.removeGameState(roomId)
              );
              await this.withRetry(() =>
                this.gameStateService.redisClient.hDel('matches', roomId)
              );
              console.log(
                `🗑️ Cleared match and state for completed game in room ${roomId}`
              );
            } catch (cleanupErr) {
              console.error(
                `Failed to clear room ${roomId} after completion:`,
                cleanupErr
              );
            }
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
  @Cron('0 */5 * * * *')
  async cleanupInactiveRooms() {
    if (!(await this.withRetry(() => this.isLeader()))) return;
    try {
      console.log('🧹 Running inactive room cleanup...');
      const inactiveRooms = await this.withRetry(() =>
        this.gameStateService.getInactiveRooms(1800000)
      ); // 30 minutes

      for (const roomId of inactiveRooms) {
        console.log(`🧹 Cleaning up inactive room: ${roomId}`);
        await this.withRetry(() => this.gameStateService.cleanupRoom(roomId));
        await this.withRetry(() =>
          this.gameSessionGateway.cleanupRoom(roomId, 'inactive')
        );
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
  @Cron('0 * * * * *')
  async cleanupDeadInstances() {
    if (!(await this.withRetry(() => this.isLeader()))) return;
    try {
      await this.withRetry(() => this.gameStateService.cleanupDeadInstances());
    } catch (error) {
      console.error('Error cleaning up dead instances:', error);
    }
  }

  /**
   * @notice Update instance heartbeat every 30 seconds
   */
  @Cron('*/30 * * * * *')
  async updateInstanceHeartbeat() {
    try {
      await this.withRetry(() => this.gameStateService.updateHeartbeat());
    } catch (error) {
      console.error('Error updating instance heartbeat:', error);
    }
  }

  /**
   * @notice Health monitoring every 30 seconds
   * @dev Logs system health metrics and detects issues
   */
  @Cron('*/30 * * * * *')
  async monitorSystemHealth() {
    try {
      const health = await this.withRetry(() => this.getSystemHealth());

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
  @Cron('0 * * * * *')
  async purgeStaleMatches() {
    if (!(await this.withRetry(() => this.isLeader()))) return;
    try {
      const matches = await this.withRetry(() =>
        this.getAllHashEntriesWithScan('matches')
      );
      if (!matches || Object.keys(matches).length === 0) return;

      for (const [roomId] of Object.entries(matches)) {
        const state = await this.withRetry(() =>
          this.gameStateService.getGameState(roomId)
        );
        const timeoutMs = Number(process.env.SPELL_CAST_TIMEOUT || 120000);

        if (!state) {
          // Only remove stale match entry; do not touch game state here
          await this.withRetry(() =>
            this.gameStateService.redisClient.hDel('matches', roomId)
          );
          console.log(`🧽 Purged stale match with no state: ${roomId}`);
          continue;
        }

        const isInactive = state.status !== 'active';
        const isOld =
          Date.now() - (state.updatedAt || state.createdAt || 0) > timeoutMs;
        if (isInactive && isOld) {
          // Only purge stale match entry; avoid deleting game state here to prevent mid-game loss.
          // Room state cleanup should be handled by explicit cleanup flows (e.g., cleanupRoom, markRoomForCleanup, end-of-game paths).
          await this.withRetry(() =>
            this.gameStateService.redisClient.hDel('matches', roomId)
          );
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
   * Check if this instance is the leader
   */
  private async isLeader(): Promise<boolean> {
    const owner = this.gameStateService.getInstanceId();
    const { ok } = await this.gameStateService.acquireRoomLock(
      'global',
      10000, // 10s TTL
      owner,
      'lock:scheduler'
    );
    return ok;
  }

  /**
   * Get all room IDs using SCAN for scalability
   */
  private async getAllRoomIdsWithScan(): Promise<string[]> {
    const roomIds: string[] = [];
    let cursor = '0';
    do {
      const reply = await this.gameStateService.redisClient.hScan(
        'game_states',
        cursor,
        { COUNT: 1000 }
      );
      cursor = reply.cursor;
      for (const entry of reply.entries) {
        roomIds.push(entry.field as string);
      }
    } while (cursor !== '0');
    return roomIds;
  }

  /**
   * Get all hash entries using HSCAN for scalability
   */
  private async getAllHashEntriesWithScan(
    hashKey: string
  ): Promise<Record<string, string>> {
    const entries: Record<string, string> = {};
    let cursor = '0';
    do {
      const reply = await this.gameStateService.redisClient.hScan(
        hashKey,
        cursor,
        { COUNT: 1000 }
      );
      cursor = reply.cursor;
      for (const entry of reply.entries) {
        entries[entry.field] = entry.value;
      }
    } while (cursor !== '0');
    return entries;
  }

  /**
   * @notice Get rooms that need phase transitions
   */
  private async getPendingPhaseTransitions(): Promise<PhaseTransition[]> {
    const transitions: PhaseTransition[] = [];
    const now = Date.now();

    // Get all active rooms
    const roomIds = await this.getAllRoomIdsWithScan();

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

    if (this.transitioning.has(roomId)) {
      console.log(`Skipping reentrant phase transition for ${roomId}`);
      return;
    }

    this.transitioning.add(roomId);

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
    } finally {
      this.transitioning.delete(roomId);
    }
  }
  /**
   * @notice Get system health metrics and detect issues
   * @return System health data including metrics and issues
   */
  private async getSystemHealth(): Promise<{ metrics: any; issues: string[] }> {
    const roomKeys = await this.getAllRoomIdsWithScan();
    const now = Date.now();
    const issues: string[] = [];

    let oldestRoom: { roomId: string; age: number } | null = null;
    let totalPlayers = 0;

    for (const key of roomKeys) {
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
        await this.gameStateService.redisClient.sRem(
          this.processedTimeoutsKey,
          roomId
        );

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
