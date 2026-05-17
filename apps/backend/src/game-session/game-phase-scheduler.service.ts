import { Injectable, Inject, forwardRef, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GameStateService } from './game-state.service';
import { GameSessionGateway } from './game-session.gateway';
import { RewardService } from '../reward/reward.service';
import { TournamentResultRecorderService } from '../tournament/services/index.js';
import {
  GamePhase,
  IUserActions,
  ITrustedState,
  IDead,
  IGameEnd,
  IReward,
} from '../../../common/types/gameplay.types';

interface SchedulerWinnerData {
  wUserId: string | undefined;
  wPlayerId: string;
  lUserId: string | undefined;
  lPlayerId: string;
  wCharacter: string;
  lCharacter: string;
}

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
    private readonly gameSessionGateway: GameSessionGateway,
    private readonly rewardService: RewardService,
    @Optional()
    private readonly tournamentResultRecorder?: TournamentResultRecorderService
  ) {}

  /**
   * Persist a tournament match result if the room is a tournament room and a
   * winner is known. This is the scheduler's counterpart to the recording
   * performed by GameSessionGateway.handleReportDead — without it, matches
   * ended via cron timeouts (e.g., a player times out during SPELL_CASTING
   * because their proof generation overshot the deadline) never reach Mongo
   * and silently disappear from the tournament leaderboard.
   *
   * Draws are intentionally NOT recorded — the leaderboard schema does not
   * carry a winner-less row, matching the gateway behavior.
   */
  private async recordTournamentResultIfWinner(
    roomId: string,
    winnerData: SchedulerWinnerData | null,
    surrendered: boolean
  ): Promise<void> {
    if (!this.tournamentResultRecorder) return;
    if (!winnerData) return;
    if (!this.tournamentResultRecorder.isTournamentRoom(roomId)) return;

    try {
      const gameState = await this.gameStateService.getGameState(roomId);
      await this.tournamentResultRecorder.recordResult({
        roomId,
        winnerId: winnerData.wUserId ?? winnerData.wPlayerId,
        loserId: winnerData.lUserId ?? winnerData.lPlayerId,
        winnerPlayerId: winnerData.wPlayerId,
        loserPlayerId: winnerData.lPlayerId,
        rounds: gameState?.turn ?? 1,
        surrendered,
      });
    } catch (err) {
      console.error(
        `Failed to record tournament match result from scheduler for room ${roomId}:`,
        err
      );
    }
  }

  /**
   * Tournament rooms live in `tournament_matches_active`, regular rooms in
   * `matches`. Without choosing the right hash key, scheduler cleanup leaks
   * tournament match entries forever.
   */
  private matchesHashKey(roomId: string): string {
    return this.tournamentResultRecorder?.isTournamentRoom(roomId)
      ? 'tournament_matches_active'
      : 'matches';
  }

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
   * @notice Distribute rewards to the winner
   * @param winnerData Winner and loser information
   * @returns Game end object with rewards and experience
   */
  private async distributeRewards(
    winnerData: {
      wUserId: string | undefined;
      wPlayerId: string;
      lUserId: string | undefined;
      lPlayerId: string;
      wCharacter: string;
      lCharacter: string;
    } | null,
    winnerId: string
  ): Promise<IGameEnd> {
    let reward: {
      success: boolean;
      itemId: string;
      quantity: number;
      total: number;
    } | null = null;

    let rewardItems: {
      success: boolean;
      items: { itemId: string; quantity: number; total: number }[];
    } | null = null;

    let xpData: {
      success: boolean;
      winnerXP: number;
      looserXP: number;
    } | null = null;

    let gameEnd: IGameEnd = { winnerId: winnerData?.wPlayerId || '' };

    if (winnerData && winnerData.wUserId) {
      console.log(`winnerData.wCharacter: ${winnerData.wCharacter}`);
      console.log(`winnerData.lCharacter: ${winnerData.lCharacter}`);
      try {
        xpData = await this.rewardService.rewardXP(
          winnerData.wUserId,
          '0x0', //no reward to looser
          'win',
          winnerData.wCharacter,
          winnerData.lCharacter
        );

        reward = await this.rewardService.rewardGold(winnerData.wUserId);

        console.log(
          `💰 Rewarded ${reward?.quantity || 0} gold to winner ${winnerData.wPlayerId} (userId: ${winnerData.wUserId})`
        );

        rewardItems = await this.rewardService.rewardRandomItems(
          winnerData.wUserId,
          [
            {
              itemId: 'SoulStoneFragment',
              quantity: 1,
              chance: 0.2,
            },
            {
              itemId: 'SoulStoneShard',
              quantity: 2,
              chance: 0.5,
            },
          ]
        );
        console.log(`💰 Rewarded items: ${JSON.stringify(rewardItems)}`);

        const goldReward: IReward = {
          itemId: 'Gold',
          amount: reward ? reward.quantity : 0,
          total: reward ? reward.total : 0,
        };

        const itemRewards: IReward[] = rewardItems
          ? rewardItems.items.map((item) => ({
              itemId: item.itemId,
              amount: item.quantity,
              total: item.total,
            }))
          : [];

        gameEnd = {
          winnerId: winnerData.wPlayerId,
          experience: {
            winnerXP: xpData?.winnerXP ?? 0,
            looserXP: 0,
          },
          reward: [goldReward, ...itemRewards],
        };

        console.log(
          `📢 Broadcasting game end: ${winnerData ? winnerData.wPlayerId : 'no winner id data'} wins`
        );
      } catch (error) {
        console.error(
          `❌ Failed to reward gold to winner ${winnerData.wPlayerId}:`,
          error
        );
      }
    } else {
      console.log(
        `⚠️ Winner ${winnerData ? winnerData.wPlayerId : 'no winner id data'} has no userId (wallet not connected), skipping reward distribution`
      );
      console.log(`📢 Broadcasting game end: ${winnerId} wins`);
      gameEnd = { winnerId };
    }

    return gameEnd;
  }

  /**
   * @notice Process pending phase transitions every 5 seconds
   * @dev Checks Redis for rooms that need phase advancement
   */
  @Cron('*/5 * * * * *')
  async processPhaseTransitions() {
    const { ok, lockKey, owner } = await this.acquireLeadership();
    if (!ok) return;
    try {
      const pendingTransitions = await this.withRetry(() =>
        this.getPendingPhaseTransitions()
      );

      for (const transition of pendingTransitions) {
        await this.withRetry(() => this.executePhaseTransition(transition));
      }
    } catch (error) {
      console.error('Error processing phase transitions:', error);
    } finally {
      await this.gameStateService.releaseRoomLock(lockKey, owner);
    }
  }

  /**
   * @notice Enforce 5-minute timeout for SPELL_CASTING
   * @dev If no one submits → draw. If some submit and others don't → non-submitters lose.
   *
   * */
  @Cron('*/2 * * * * *')
  async enforceSpellCastingTimeouts() {
    const { ok, lockKey, owner } = await this.acquireLeadership();
    if (!ok) return;
    try {
      const roomIds = await this.withRetry(() => this.getAllRoomIdsWithScan());
      // console.log(`⏱️ [enforceSpellCastingTimeouts] Found ${roomIds.length} rooms`);
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
        // console.log(
        //   `⏱️ [enforceSpellCastingTimeouts] Room ${roomId}: ${timeSincePhaseStart}ms / ${configuredTimeout}ms`
        // );
        if (timeSincePhaseStart < configuredTimeout) continue;

        const timeoutMarker = `${roomId}:${gameState.turn}`;
        // console.log(
        //   `⏱️ [enforceSpellCastingTimeouts] Checking timeout marker: ${timeoutMarker}`
        // );
        // const isProcessed = await this.withRetry(() =>
        //   this.gameStateService.redisClient.sIsMember(
        //     this.processedTimeoutsKey,
        //     timeoutMarker
        //   )
        // );
        // console.log(
        //   `⏱️ [enforceSpellCastingTimeouts] isProcessed result: ${isProcessed}`
        // );
        // if (isProcessed) continue;

        const alivePlayers = gameState.players.filter((p) => p.isAlive);
        const submitters = alivePlayers.filter((p) => !!p.currentActions);
        const nonSubmitters = alivePlayers.filter((p) => !p.currentActions);

        // Only log action once per room to prevent spam
        console.log(
          `⏰ SPELL_CASTING timeout in room ${roomId} after ${timeSincePhaseStart}ms`
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
              this.gameStateService.redisClient.hDel(
                this.matchesHashKey(roomId),
                roomId
              )
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
          // Mark timeout as processed only after successful completion
          await this.withRetry(() =>
            this.gameStateService.redisClient.sAdd(
              this.processedTimeoutsKey,
              timeoutMarker
            )
          );
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
          let winnerData: {
            wUserId: string | undefined;
            wPlayerId: string;
            lUserId: string | undefined;
            lPlayerId: string;
            wCharacter: string;
            lCharacter: string;
          } | null = null;

          for (const p of nonSubmitters) {
            const res = await this.withRetry(() =>
              this.gameStateService.markPlayerDead(roomId, p.id)
            );
            if (res && typeof res === 'object' && 'wPlayerId' in res) {
              winnerId = res.wPlayerId; // If this was the last alive player, we have a winner
              winnerData = res;
            }
          }

          if (winnerId) {
            console.log(
              `🏆 Game finished - winner declared: ${winnerId} in room ${roomId}`
            );

            // distribute rewards
            const gameEnd = await this.distributeRewards(winnerData, winnerId);

            // Update game status to finished
            await this.withRetry(() =>
              this.gameStateService.updateGameState(roomId, {
                status: 'finished',
              })
            );
            console.log(
              `📢 Broadcasting game end for room ${roomId}, winner: ${winnerId}`
            );
            this.gameSessionGateway.server.to(roomId).emit('gameEnd', gameEnd);
            await this.withRetry(() =>
              this.gameStateService.publishToRoom(roomId, 'gameEnd', gameEnd)
            );
            // Persist tournament leaderboard entry. The losing player here is
            // a non-submitter (proof gen / network / tab freeze), treated as
            // a forfeit — record with surrendered=true so post-hoc analytics
            // can distinguish forfeits from in-combat losses.
            await this.recordTournamentResultIfWinner(
              roomId,
              winnerData,
              true
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
                this.gameStateService.redisClient.hDel(
                  this.matchesHashKey(roomId),
                  roomId
                )
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

              const result = await this.gameStateService.markPlayerDead(
                roomId,
                winnerId
              );

              let gameEnd: IGameEnd;
              let resolvedWinner:
                | SchedulerWinnerData
                | null = null;
              if (result === 'draw') {
                gameEnd = { winnerId: 'draw' };
              } else {
                resolvedWinner = result;
                gameEnd = await this.distributeRewards(result, winnerId);
              }

              this.gameSessionGateway.server
                .to(roomId)
                .emit('gameEnd', gameEnd);
              await this.withRetry(() =>
                this.gameStateService.publishToRoom(roomId, 'gameEnd', gameEnd)
              );
              await this.recordTournamentResultIfWinner(
                roomId,
                resolvedWinner,
                true
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
                this.gameStateService.redisClient.hDel(
                  this.matchesHashKey(roomId),
                  roomId
                )
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
          // Mark timeout as processed only after successful completion
          await this.withRetry(() =>
            this.gameStateService.redisClient.sAdd(
              this.processedTimeoutsKey,
              timeoutMarker
            )
          );
          // Expire the processed entry after some time
          await this.withRetry(() =>
            this.gameStateService.redisClient.expire(
              this.processedTimeoutsKey,
              3600
            )
          ); // 1 hour
        } else {
          // Case C: every alive player has submitted actions but the gateway
          // failed to advance SPELL_CASTING → SPELL_PROPAGATION (Redis hiccup,
          // unhandled exception, or process restart mid-call). Both actions are
          // already stored, so we just force the transition — the game resumes
          // as if the gateway had done it normally.
          console.log(
            `🚨 Room ${roomId}: all ${submitters.length} players submitted but SPELL_CASTING stuck after ${timeSincePhaseStart}ms — forcing SPELL_PROPAGATION`
          );
          await this.withRetry(() =>
            this.gameSessionGateway.advanceToSpellPropagation(roomId)
          );
        }
      }
    } catch (error) {
      console.error('❌ Error enforcing SPELL_CASTING timeouts:', error);
      console.error(
        'Stack trace:',
        error instanceof Error ? error.stack : 'Unknown'
      );
    } finally {
      await this.gameStateService.releaseRoomLock(lockKey, owner);
    }
  }

  /**
   * @notice Clean up inactive rooms every 5 minutes
   * @dev Removes rooms with no activity for extended periods
   */
  @Cron('0 */5 * * * *')
  async cleanupInactiveRooms() {
    const { ok, lockKey, owner } = await this.acquireLeadership();
    if (!ok) return;
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
    } finally {
      await this.gameStateService.releaseRoomLock(lockKey, owner);
    }
  }

  /**
   * @notice Check for dead instances every minute
   * @dev Cleans up resources from crashed instances
   */
  @Cron('0 * * * * *')
  async cleanupDeadInstances() {
    const { ok, lockKey, owner } = await this.acquireLeadership();
    if (!ok) return;
    try {
      await this.withRetry(() => this.gameStateService.cleanupDeadInstances());
    } catch (error) {
      console.error('Error cleaning up dead instances:', error);
    } finally {
      await this.gameStateService.releaseRoomLock(lockKey, owner);
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
   * @dev Ensures Redis match entries are removed when rooms are finished or
   * missing. Iterates BOTH the regular `matches` hash and the
   * `tournament_matches_active` hash so tournament rooms don't accumulate.
   */
  @Cron('0 * * * * *')
  async purgeStaleMatches() {
    const { ok, lockKey, owner } = await this.acquireLeadership();
    if (!ok) return;
    const timeoutMs = Number(process.env.SPELL_CAST_TIMEOUT || 120000);

    try {
      for (const hashKey of ['matches', 'tournament_matches_active']) {
        try {
          const matches = await this.withRetry(() =>
            this.getAllHashEntriesWithScan(hashKey)
          );
          if (!matches || Object.keys(matches).length === 0) continue;

          for (const [roomId] of Object.entries(matches)) {
            const state = await this.withRetry(() =>
              this.gameStateService.getGameState(roomId)
            );

            if (!state) {
              // Only remove stale match entry; do not touch game state here
              await this.withRetry(() =>
                this.gameStateService.redisClient.hDel(hashKey, roomId)
              );
              console.log(
                `🧽 Purged stale match with no state from ${hashKey}: ${roomId}`
              );
              continue;
            }

            const isInactive = state.status !== 'active';
            const isOld =
              Date.now() - (state.updatedAt || state.createdAt || 0) > timeoutMs;
            if (isInactive && isOld) {
              // Only purge stale match entry; avoid deleting game state here to prevent mid-game loss.
              // Room state cleanup should be handled by explicit cleanup flows (e.g., cleanupRoom, markRoomForCleanup, end-of-game paths).
              await this.withRetry(() =>
                this.gameStateService.redisClient.hDel(hashKey, roomId)
              );
              console.log(
                `🧽 Purged stale match entry (state retained) from ${hashKey} for room: ${roomId}`
              );
            }
          }
        } catch (error) {
          console.error(`Error purging stale matches (${hashKey}):`, error);
        }
      }
    } finally {
      await this.gameStateService.releaseRoomLock(lockKey, owner);
    }
  }

  /**
   * Try to become the scheduler leader for this cron invocation.
   * Returns the lock handle so the caller can release it when done,
   * allowing the next cron tick to run at its configured interval
   * instead of waiting the full TTL.
   */
  private async acquireLeadership(): Promise<{
    ok: boolean;
    lockKey: string;
    owner: string;
  }> {
    const owner = this.gameStateService.getInstanceId();
    return this.gameStateService.acquireRoomLock(
      'global',
      10000,
      owner,
      'lock:scheduler'
    );
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
      //
      // NOTE: Happy-path transitions (SPELL_PROPAGATION→SPELL_EFFECTS,
      // SPELL_EFFECTS→END_OF_ROUND, STATE_UPDATE→SPELL_CASTING) are driven
      // exclusively by GameSessionGateway (event-driven, inline). The cron
      // is STUCK-RECOVERY ONLY — thresholds below are far above any normal
      // gateway transit time so the cron does not race the happy path.
      // The CAS guard in GameStateService.advanceGamePhase additionally
      // ensures any concurrent attempt is a no-op when the phase already
      // advanced.
      //
      // Without these recovery branches, a process restart between the
      // gateway's `emit applySpellEffects` and its `setTimeout(2000)` (or
      // mid-fire-and-forget on SPELL_PROPAGATION/STATE_UPDATE) leaves the
      // room wedged until the 30-min `cleanupInactiveRooms` sweeper kills
      // it. With recovery, the cron rescues the room within ~25s.
      const STUCK_RECOVERY_MS = 20_000;
      switch (gameState.currentPhase) {
        case GamePhase.SPELL_PROPAGATION:
          if (timeSincePhaseStart >= STUCK_RECOVERY_MS) {
            console.log(
              `🚨 SPELL_PROPAGATION stuck for ${timeSincePhaseStart}ms in room ${roomId} — forcing recovery`
            );
            transitions.push({
              roomId,
              currentPhase: GamePhase.SPELL_PROPAGATION,
              nextPhase: GamePhase.SPELL_EFFECTS,
              delayMs: 0,
            });
          }
          break;

        case GamePhase.SPELL_EFFECTS:
          if (timeSincePhaseStart >= STUCK_RECOVERY_MS) {
            console.log(
              `🚨 SPELL_EFFECTS stuck for ${timeSincePhaseStart}ms in room ${roomId} — forcing recovery`
            );
            transitions.push({
              roomId,
              currentPhase: GamePhase.SPELL_EFFECTS,
              nextPhase: GamePhase.END_OF_ROUND,
              delayMs: 0,
            });
          }
          break;

        case GamePhase.STATE_UPDATE:
          if (timeSincePhaseStart >= STUCK_RECOVERY_MS) {
            console.log(
              `🚨 STATE_UPDATE stuck for ${timeSincePhaseStart}ms in room ${roomId} — forcing recovery`
            );
            transitions.push({
              roomId,
              currentPhase: GamePhase.STATE_UPDATE,
              nextPhase: GamePhase.SPELL_CASTING,
              delayMs: 0,
            });
          }
          break;

        case GamePhase.END_OF_ROUND:
          // Auto-advance to STATE_UPDATE if stuck for more than 15 seconds.
          // Threshold is intentionally larger than any reasonable client
          // proof-generation + submission time so that the gateway's
          // event-driven path (storeTrustedStateAndMarkReady →
          // advanceToStateUpdate) wins under normal conditions and this
          // only fires when one or more clients failed to submit.
          if (timeSincePhaseStart >= 15000) {
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

      // Stuck-recovery dispatch. Each branch delegates to the same gateway
      // method that drives the happy path; the CAS guard in
      // GameStateService.advanceGamePhase makes the call a no-op if the
      // gateway already advanced the phase between our `getGameState` read
      // and now. Recovery thresholds (see getPendingPhaseTransitions) are
      // wide enough that this code only runs on real wedges (process
      // restart mid-setTimeout, redis hiccup, unhandled rejection).
      if (
        currentPhase === GamePhase.SPELL_PROPAGATION &&
        nextPhase === GamePhase.SPELL_EFFECTS
      ) {
        console.log(
          `🚨 Force advancing ${roomId} from SPELL_PROPAGATION wedge to SPELL_EFFECTS`
        );
        await this.gameSessionGateway.advanceToSpellEffects(roomId);
      } else if (
        currentPhase === GamePhase.SPELL_EFFECTS &&
        nextPhase === GamePhase.END_OF_ROUND
      ) {
        // No dedicated gateway method — emit endOfRound directly so
        // clients submit their trusted state, then the END_OF_ROUND
        // recovery branch (15s) handles the rest if they don't.
        console.log(
          `🚨 Force advancing ${roomId} from SPELL_EFFECTS wedge to END_OF_ROUND`
        );
        const advanced = await this.gameStateService.advanceGamePhase(
          roomId,
          GamePhase.SPELL_EFFECTS
        );
        if (advanced === GamePhase.END_OF_ROUND) {
          const payload = { phase: GamePhase.END_OF_ROUND };
          this.gameSessionGateway.server
            .to(roomId)
            .emit('endOfRound', payload);
          await this.gameStateService.publishToRoom(
            roomId,
            'endOfRound',
            payload
          );
        }
      } else if (
        currentPhase === GamePhase.END_OF_ROUND &&
        nextPhase === GamePhase.STATE_UPDATE
      ) {
        console.log(
          `🚨 Force advancing ${roomId} from END_OF_ROUND timeout to STATE_UPDATE`
        );
        await this.gameSessionGateway.advanceToStateUpdate(roomId);
      } else if (
        currentPhase === GamePhase.STATE_UPDATE &&
        nextPhase === GamePhase.SPELL_CASTING
      ) {
        console.log(
          `🚨 Force advancing ${roomId} from STATE_UPDATE wedge to SPELL_CASTING`
        );
        await this.gameSessionGateway.startNextTurn(roomId);
      } else {
        console.warn(
          `⚠️ Ignoring unexpected scheduler transition ${currentPhase}→${nextPhase} for ${roomId}`
        );
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
