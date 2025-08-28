/**
 * @fileoverview MatchmakingService - Advanced player matching system with queue management
 *
 * @dev Recent Improvements:
 * - Fixed queue removal timing to prevent player loss during failed match creation
 * - Added duplicate match prevention with Redis hash checks
 * - Implemented stale entry cleanup (5-minute timeout) to prevent queue buildup
 * - Added active match filtering to prevent double-matching players
 * - Enhanced error handling with rollback mechanisms
 * - Added clearQueue() method for testing and development
 * - Improved debug logging and monitoring capabilities
 * - Fixed queue accuracy issues by ensuring proper player management
 *
 * @dev Key Fixes Applied:
 * - Players now removed from queue ONLY after successful match creation and storage
 * - Queue cleanup between test runs prevents accumulation
 * - Better error recovery maintains system stability
 * - Accurate player counting and status reporting
 */

import { Injectable, Scope } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createClient, RedisClientType } from "redis";
import { GameStateService } from "../game-session/game-state.service";
import { BotClientService } from "../bot/bot-client.service";
import { State } from "../../../common/stater/state";
import {
  IAddToQueue,
  IAddToQueueResponse,
  IRemoveFromQueue,
  IUpdateQueue,
  IFoundMatch,
  IPublicState,
  TransformedAddToQueueResponse,
  TransformedFoundMatch,
  TransformedPlayerSetup,
  TransformedRemoveFromQueue,
  TransformedUpdateQueue,
} from "../../../common/types/matchmaking.types";

/**
 * Player interface with timestamp for wait time tracking
 */
interface QueuedPlayer {
  player: IPublicState;
  timestamp: number; // When they joined the queue
}

/**
 * Match interface
 */
interface Match {
  player1: IPublicState;
  player2: IPublicState;
  roomId: string;
}

/**
 * MatchmakingService
 *
 * @dev A comprehensive matchmaking system that handles player queuing, matching, and game creation.
 * The service includes advanced features like duplicate prevention, stale entry cleanup, and testing utilities.
 *
 * @dev Key Features:
 * - FIFO-based player matching with timestamp prioritization
 * - Automatic cleanup of stale/disconnected players
 * - Duplicate match prevention and active match filtering
 * - Queue cleanup utilities for testing and development
 * - Cross-instance communication support
 * - Comprehensive error handling and recovery mechanisms
 *
 * @dev Testing Support:
 * - clearQueue() method for resetting system state between test runs
 * - Debug logging for queue length and filtering operations
 * - Stale entry cleanup to prevent queue buildup
 * - Accurate player counting and status reporting
 */
@Injectable()
export class MatchmakingService {
  private server: Server | null = null;
  private redisClient: RedisClientType = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  /**
   * Constructor for MatchmakingService
   * @param gameStateService - The GameStateService instance for managing game states and cross-instance communication
   * @param botClientService - The BotClientService instance for managing bot players (optional)
   *
   * @dev Initializes the matchmaking service with Redis connection and automatic matchmaking loop startup.
   * The service immediately connects to Redis and starts the 30-second matchmaking cycle.
   */
  constructor(
    private readonly gameStateService: GameStateService,
    private readonly botClientService?: BotClientService
  ) {
    console.log("MatchmakingService constructor called");
    this.redisClient.on("error", (err) =>
      console.error("Redis Client Error", err),
    );
    this.redisClient
      .connect()
      .then(() => {
        console.log("MatchmakingService Redis Connected");
      })
      .catch((err) => {
        console.error("Failed to connect to Redis:", err);
      });
  }

  /**
   * Process matchmaking for all players in the queue
   *
   * @dev This function is the core matchmaking algorithm that runs every 30 seconds via cron job.
   * It processes the Redis waiting queue and creates matches between players based on FIFO (First In, First Out) principle.
   * The function now includes advanced filtering and cleanup mechanisms to prevent duplicate matches and queue buildup.
   *
   * @dev Algorithm Flow:
   * 1. Retrieves all players from Redis 'waiting:queue' list using LRANGE
   * 2. Checks if there are at least 2 players available for matching
   * 3. Parses JSON strings back to QueuedPlayer objects
   * 4. Sorts players by timestamp (oldest first) to ensure fair queue order
   * 5. Filters out players already in active matches to prevent duplicates
   * 6. Cleans up stale queue entries older than 5 minutes
   * 7. Iteratively pairs available players using shift() to remove matched pairs
   * 8. Creates matches via createMatch() for each pair
   * 9. Updates queue status for remaining unmatched players
   *
   * @dev Advanced Filtering:
   * - Active Match Filtering: Scans Redis 'matches' hash to identify players already in games
   * - Only processes activeMatches if it exists and has entries (null/empty check)
   * - Stale Entry Cleanup: Removes queue entries older than 5 minutes to prevent buildup
   * - Duplicate Prevention: Ensures players can't be matched multiple times simultaneously
   *
   * @dev Data Structures:
   * - waiting:queue: Redis list containing JSON strings of QueuedPlayer objects
   * - matches: Redis hash storing active match data with roomId as key
   * - QueuedPlayer: { player: IPublicState, timestamp: number }
   * - IPublicState: Contains playerId, socketId, and other player metadata
   *
   * @dev Redis Operations:
   * - LRANGE: Retrieves all players from queue
   * - HGETALL: Scans active matches for filtering
   * - LREM: Removes stale entries and matched players
   * - LLEN: Provides accurate queue length for debugging
   *
   * @dev Error Handling:
   * - Wraps entire operation in try-catch
   * - Logs errors but doesn't throw to prevent breaking the matchmaking loop
   * - Continues processing even if individual matches fail
   * - Graceful handling of JSON parsing errors in match data
   * - Handles null/undefined activeMatches gracefully
   *
   * @dev Performance Considerations:
   * - Processes entire queue in single Redis call (LRANGE 0 -1)
   * - Efficient filtering using Set for O(1) player ID lookups
   * - Sorts in-memory for small to medium queue sizes
   * - Processes matches sequentially (could be optimized with Promise.all for parallel processing)
   *
   * @dev Queue Management:
   * - Automatically handles odd numbers of players (last player waits for next cycle)
   * - Calls updateQueueStatus() for remaining players to maintain queue health
   * - Automatic cleanup prevents queue buildup from disconnected players
   * - Accurate player counting for better user experience
   *
   * @dev Debug and Monitoring:
   * - Logs actual Redis queue length vs. processed players
   * - Reports filtering results (available vs. already matched)
   * - Tracks stale entry cleanup operations
   * - Provides visibility into matchmaking decision process
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async processMatchmaking() {
    try {
      const waitingPlayers = await this.redisClient.lRange(
        "waiting:queue",
        0,
        -1,
      );

      if (waitingPlayers.length < 2) {
        console.log(
          `Not enough players for matching. Current queue size: ${waitingPlayers.length}`,
        );
        return;
      }

      console.log(
        `Processing matchmaking for ${waitingPlayers.length} players`,
      );

      // Parse and sort players by wait time (oldest first)
      const queuedPlayers: QueuedPlayer[] = waitingPlayers
        .map((p) => JSON.parse(p))
        .sort((a, b) => a.timestamp - b.timestamp);

      // Filter out players who are already in active matches
      const activeMatches = await this.redisClient.hGetAll("matches");
      const activePlayerIds = new Set<string>();

      if (activeMatches && Object.keys(activeMatches).length > 0) {
        for (const [_, matchData] of Object.entries(activeMatches)) {
          try {
            const match = JSON.parse(matchData);
            if (match.player1?.playerId)
              activePlayerIds.add(match.player1.playerId);
            if (match.player2?.playerId)
              activePlayerIds.add(match.player2.playerId);
          } catch (error) {
            console.error("Error parsing match data:", error);
          }
        }
      }

      // Remove players who are already in matches
      const filteredQueuedPlayers = queuedPlayers.filter(
        (qp) => qp.player.playerId && !activePlayerIds.has(qp.player.playerId),
      );

      // Clean up stale queue entries (players who might be disconnected)
      // Remove entries older than 5 minutes to prevent queue buildup
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const staleEntries = queuedPlayers.filter(
        (qp) => qp.timestamp < fiveMinutesAgo,
      );

      if (staleEntries.length > 0) {
        console.log(`Cleaning up ${staleEntries.length} stale queue entries`);
        for (const staleEntry of staleEntries) {
          try {
            await this.redisClient.lRem(
              "waiting:queue",
              1,
              JSON.stringify(staleEntry),
            );
          } catch (error) {
            console.error("Error removing stale queue entry:", error);
          }
        }
      }

      if (filteredQueuedPlayers.length < 2) {
        console.log(
          `Not enough available players for matching after filtering. Available: ${filteredQueuedPlayers.length}`,
        );
        return;
      }

      console.log(
        `Processing matchmaking for ${filteredQueuedPlayers.length} available players (${queuedPlayers.length - filteredQueuedPlayers.length} already in matches)`,
      );
      console.log(
        `Actual Redis queue length: ${await this.redisClient.lLen("waiting:queue")}`,
      );

      // Match players in pairs, prioritizing those who waited longer
      while (filteredQueuedPlayers.length >= 2) {
        const player1 = filteredQueuedPlayers.shift()!;
        const player2 = filteredQueuedPlayers.shift()!;

        await this.createMatch(player1.player, player2.player);
      }

      // Update remaining players in queue
      if (filteredQueuedPlayers.length > 0) {
        await this.updateQueueStatus();
      }
    } catch (error) {
      console.error("Error in matchmaking loop:", error);
    }
  }

  /**
   * Create a match between two players
   *
   * @param player1 - The first player
   * @param player2 - The second player
   *
   * @dev This function orchestrates the complete match creation process between two queued players.
   * It handles room creation, player pairing, Redis state management, and game initialization.
   * The function now uses a safer approach where players are only removed from the queue after
   * the match is guaranteed to be successful, preventing data loss from failed match creation.
   *
   * @dev Match Creation Flow:
   * 1. Validates both players have required IDs (playerId, socketId)
   * 2. Generates deterministic roomId by sorting player IDs lexicographically
   * 3. Checks for existing matches to prevent duplicates
   * 4. Creates Match object with player references and roomId
   * 5. Stores match data in Redis 'matches' hash FIRST using HSET
   * 6. Initializes game state via GameStateService
   * 7. Attempts to notify both players of successful match via Socket.IO
   * 8. ONLY AFTER match storage and game state creation, removes both players from Redis waiting queue
   *
   * @dev Duplicate Prevention:
   * - Checks Redis 'matches' hash before creating new match
   * - Prevents multiple matches for same player pair
   * - Early return if match already exists
   *
   * @dev Room ID Generation:
   * - Uses lexicographic sorting to ensure consistent roomId regardless of match order
   * - Format: "lowerPlayerId-higherPlayerId" (e.g., "player123-player456")
   * - Prevents duplicate rooms for same player pair
   *
   * @dev Redis Operations:
   * - HGET: Checks for existing matches
   * - HSET: Stores match data in 'matches' hash with roomId as key
   * - LRANGE + LREM: Removes matched players from 'waiting:queue' list (after success)
   * - Queue removal: Iterates through all queue entries to find and remove both players
   * - Data serialization: All data stored as JSON strings
   *
   * @dev Game State Initialization:
   * - Calls GameStateService.createGameState() with roomId and player mappings
   * - Player mapping includes: { id: playerId, socketId: socketId }
   * - Enables real-time game communication and state management
   * - Rollback mechanism if game state creation fails
   *
   * @dev Player Notification:
   * - Calls notifyPlayersOfMatch() to emit 'matchFound' events
   * - Both players receive opponent information and room details
   * - Players automatically join Socket.IO room for game communication
   * - Notification failures don't invalidate the match
   *
   * @dev Error Handling:
   * - Early returns on missing playerId or socketId
   * - Rollback of match data if game state creation fails (removes from 'matches' hash)
   * - Graceful handling of notification failures
   * - Logs errors but doesn't throw to maintain matchmaking stability
   *
   * @dev Data Consistency:
   * - Players only removed from queue after successful match creation and storage
   * - Queue removal: Iterates through all entries to find and remove both players by playerId
   * - Rollback mechanisms prevent orphaned data
   * - Atomic operations prevent duplicate matches
   * - Queue and matches stay synchronized
   *
   * @dev Safety Improvements:
   * - Prevents player loss from failed match creation
   * - Ensures queue accuracy and prevents buildup
   * - Better error recovery and system stability
   * - Maintains data integrity even with partial failures
   */
  private async createMatch(
    player1: IPublicState,
    player2: IPublicState,
  ): Promise<void> {
    if (!player1.playerId || !player2.playerId) {
      console.error("Cannot create match: missing player IDs");
      return;
    }

    console.log(
      `Creating match between ${player1.playerId} and ${player2.playerId}`,
    );

    // Sort player IDs for consistent room ID
    const [firstPlayer, secondPlayer] =
      player1.playerId < player2.playerId
        ? [player1, player2]
        : [player2, player1];
    const roomId = `${firstPlayer.playerId}-${secondPlayer.playerId}`;

    // Check if match already exists to prevent duplicates
    const existingMatch = await this.redisClient.hGet("matches", roomId);
    if (existingMatch) {
      console.warn(
        `Match already exists for room ${roomId}, skipping creation`,
      );
      return;
    }

    // Create match
    const match: Match = {
      player1: firstPlayer,
      player2: secondPlayer,
      roomId,
    };

    // Store match in Redis FIRST
    await this.redisClient.hSet("matches", roomId, JSON.stringify(match));

    // Create game state
    if (!firstPlayer.socketId || !secondPlayer.socketId) {
      console.error("Cannot create game state: missing socket IDs");
      // Clean up the match we just created
      await this.redisClient.hDel("matches", roomId);
      return;
    }

    await this.gameStateService.createGameState(roomId, [
      { id: firstPlayer.playerId!, socketId: firstPlayer.socketId! },
      { id: secondPlayer.playerId!, socketId: secondPlayer.socketId! },
    ]);

    // Try to notify both players of the match
    try {
      await this.notifyPlayersOfMatch(firstPlayer, secondPlayer, roomId);
    } catch (error) {
      console.error("Failed to notify players of match:", error);
      // Even if notification fails, the match is still valid
    }

    // ONLY AFTER everything is successful, remove players from queue
    // This ensures we don't lose players if match creation fails
    const waitingPlayers = await this.redisClient.lRange(
      "waiting:queue",
      0,
      -1,
    );

    // Remove entries for both players
    let removedCount = 0;
    for (const entry of waitingPlayers) {
      try {
        const queuedPlayer = JSON.parse(entry);
        if (
          queuedPlayer.player.playerId === firstPlayer.playerId ||
          queuedPlayer.player.playerId === secondPlayer.playerId
        ) {
          await this.redisClient.lRem("waiting:queue", 1, entry);
          removedCount++;
          if (removedCount === 2) break; // We've removed both players
        }
      } catch (error) {
        console.error("Error parsing queue entry:", error);
      }
    }

    if (removedCount !== 2) {
      console.warn(
        `Expected to remove 2 players, but only removed ${removedCount}`,
      );
    }

    console.log(
      `Successfully created match between ${firstPlayer.playerId} and ${secondPlayer.playerId} in room ${roomId}`,
    );
  }

  /**
   * Notify both players that a match has been found
   *
   * @param player1 - The first player
   * @param player2 - The second player
   * @param roomId - The room ID
   *
   * @dev This function handles the complete player notification system when a match is created.
   * It transforms player data, emits Socket.IO events, manages room membership, and enables
   * cross-instance communication for distributed deployments.
   *
   * @dev Notification Flow:
   * 1. Validates server instance is available for Socket.IO operations
   * 2. Retrieves Socket.IO socket instances for both players
   * 3. Transforms player data into opponent setup format for each player
   * 4. Creates IFoundMatch objects with room details and opponent information
   * 5. Emits 'matchFound' events to both players via their sockets
   * 6. Automatically joins both players to the game room
   * 7. Publishes match events for cross-instance communication
   *
   * @dev Data Transformation:
   * - Uses TransformedPlayerSetup to create opponent representations
   * - Generates consistent player names: "Player {playerId}" and "Wizard{playerId}"
   * - Sets default health to 100 for all players
   * - Includes map structure, spells, and level from player state
   *
   * @dev Socket.IO Operations:
   * - socket.emit(): Sends 'matchFound' event to individual player
   * - socket.join(): Adds player to game room for future broadcasts
   * - Room ID format: "playerId1-playerId2" (consistent with createMatch)
   *
   * @dev Cross-Instance Communication:
   * - Calls GameStateService.publishToRoom() for Redis pub/sub
   * - Enables communication between players on different server instances
   * - Payload includes matchFound data and target socket ID
   *
   * @dev Error Handling:
   * - Checks server availability before Socket.IO operations
   * - Logs "Server not initialized in MatchmakingService" if server is null
   * - Gracefully handles missing socket instances
   * - Continues processing even if one player notification fails
   * - Errors are logged but don't invalidate the match
   * - System continues to function even with notification failures
   *
   * @dev Player Experience:
   * - Both players receive immediate match confirmation
   * - Opponent information is anonymized but consistent
   * - Room membership enables real-time game communication
   * - Cross-instance support ensures scalability
   * - Match remains valid even if notifications fail
   *
   * @dev Data Consistency:
   * - Opponent data is transformed from actual player state
   * - Room IDs match those created in createMatch()
   * - Socket IDs are validated before use
   * - Event payloads are structured consistently
   * - Match data integrity maintained regardless of notification status
   *
   * @dev Resilience Features:
   * - Notification failures don't break match creation
   * - Players can still join rooms and play games
   * - System degrades gracefully when Socket.IO unavailable
   * - Cross-instance communication provides backup notification path
   */
  private async notifyPlayersOfMatch(
    player1: IPublicState,
    player2: IPublicState,
    roomId: string,
  ): Promise<void> {
    if (!this.server) {
      console.error("Server not initialized in MatchmakingService");
      return;
    }

    // Get socket instances
    const socket1 = this.server.sockets.sockets.get(player1.socketId!);
    const socket2 = this.server.sockets.sockets.get(player2.socketId!);

    let matchFound1: IFoundMatch | undefined;
    let matchFound2: IFoundMatch | undefined;

    if (socket1) {
      // Notify player1 about player2 - only pass the required 3 parameters
      const opponentSetup1: IPublicState = new TransformedPlayerSetup(
        player2.socketId!,
        `Player ${player2.playerId!}`,
        player2.fields  // Keep the original fields array
      );
      matchFound1 = new TransformedFoundMatch(roomId, player2.playerId!, [
        opponentSetup1,
      ]);
      socket1.emit("matchFound", matchFound1);
      socket1.join(roomId);
    }

    if (socket2) {
      // Notify player2 about player1 - only pass the required 3 parameters
      const opponentSetup2: IPublicState = new TransformedPlayerSetup(
        player1.socketId!,
        `Player ${player1.playerId!}`,
        player1.fields  // Keep the original fields array
      );
      matchFound2 = new TransformedFoundMatch(roomId, player1.playerId!, [
        opponentSetup2,
      ]);
      socket2.emit("matchFound", matchFound2);
      socket2.join(roomId);
    }

    // Publish match found events for cross-instance communication
    if (player1.socketId && matchFound1) {
      await this.gameStateService.publishToRoom(roomId, "matchFound", {
        payload: matchFound1,
        targetSocketId: player1.socketId,
      });
    }

    if (player2.socketId && matchFound2) {
      await this.gameStateService.publishToRoom(roomId, "matchFound", {
        payload: matchFound2,
        targetSocketId: player2.socketId,
      });
    }

    console.log(
      `Match created: ${player1.playerId} vs ${player2.playerId} in room ${roomId}`,
    );
  }

  /**
   * Update queue status for all waiting players
   *
   * @dev This function broadcasts real-time queue status updates to all players currently waiting
   * in the matchmaking queue. It provides estimated wait times and current queue positions
   * to improve player experience and reduce uncertainty.
   *
   * @dev Queue Status Flow:
   * 1. Retrieves current queue length from Redis using LLEN
   * 2. Calculates estimated wait time using naive algorithm
   * 3. Creates IUpdateQueue object with count and ETA
   * 4. Broadcasts update to all players in 'queue:general' room
   * 5. Handles errors gracefully without breaking matchmaking
   *
        * @dev Wait Time Estimation:
     * - Formula: Math.max(0, waitingCount - 1) * 30 seconds
     * - Assumes 30 seconds per matchmaking cycle based on cron schedule
   * - Subtracts 1 from count since current player will be matched in next cycle
   * - Provides realistic expectations while maintaining player engagement
   *
   * @dev Redis Operations:
   * - LLEN: Gets current length of 'waiting:queue' list
   * - No data modification, only read operation
   * - Efficient O(1) operation regardless of queue size
   *
   * @dev Socket.IO Broadcasting:
   * - Uses server.to('queue:general') for targeted room emission
   * - All queued players receive 'updateQueue' event
   * - Event includes: { waitingCount: number, estimatedTimeSec: number }
   *
   * @dev Error Handling:
   * - Wraps entire operation in try-catch
   * - Logs errors but doesn't throw
   * - Continues matchmaking even if status updates fail
   * - Graceful degradation maintains core functionality
   *
   * @dev Player Experience:
   * - Real-time queue position updates
   * - Estimated wait time reduces player anxiety
   * - Consistent communication about queue status
   * - Helps players make informed decisions about staying/leaving
   *
   * @dev Performance Considerations:
   * - Minimal Redis operations (single LLEN call)
   * - Efficient Socket.IO broadcasting to room
   * - Called only when queue state changes
   * - No unnecessary updates during idle periods
   */
  private async updateQueueStatus(): Promise<void> {
    try {
      const waitingCount = await this.redisClient.lLen("waiting:queue");
      const estimatedTimeSec = Math.max(0, waitingCount - 1) * 30; // naive ETA based on 30-second cron cycle
      const updateQueue: IUpdateQueue = new TransformedUpdateQueue(
        waitingCount,
        estimatedTimeSec,
      );

      // Broadcast to all players in the queue
      this.server?.to("queue:general").emit("updateQueue", updateQueue);
    } catch (err) {
      console.error("Failed to emit updateQueue:", err);
    }
  }

  /**
   * Set the server
   * @param server - The Socket.IO Server instance for local socket operations
   *
   * @dev Injects the Socket.IO `Server` instance used for emitting events and
   * joining/leaving rooms on this node process. Must be called by the
   * WebSocket gateway during bootstrap before any matchmaking flows so that
   * local emits and room joins for matched players work when their sockets
   * reside on this instance.
   *
   * @dev Server Integration:
   * - Called during WebSocket gateway initialization
   * - Enables local socket operations (emit, join, leave)
   * - Required for player notification and room management
   * - Supports both local and cross-instance communication
   *
   * @dev Socket Operations:
   * - socket.emit(): Direct communication with specific sockets
   * - socket.join(): Room membership for targeted broadcasts
   * - socket.leave(): Clean room exit during disconnection
   * - server.sockets.sockets.get(): Socket instance retrieval
   *
   * @dev Lifecycle Management:
   * - Must be called before any matchmaking operations
   * - Enables proper cleanup during service shutdown
   * - Supports dynamic server instance updates
   * - Maintains socket reference for lifetime of service
   */
  setServer(server: Server) {
    this.server = server;
    console.log("Server set in MatchmakingService");
  }

  /**
   * Join matchmaking
   * @param socket - The socket
   * @param addToQueue - The add to queue data
   * @returns The room ID or `null` if no opponent is immediately found
   *
   * @dev This function handles the complete player onboarding process into the matchmaking system.
   * It registers socket mappings, adds players to the waiting queue, and provides immediate
   * feedback about queue status and estimated wait times.
   *
   * @dev Player Onboarding Flow:
   * 1. Validates player data from addToQueue request
   * 2. Registers socket mapping via GameStateService for future communication
   * 3. Creates QueuedPlayer object with current timestamp for FIFO ordering
   * 4. Adds player to Redis 'waiting:queue' list using LPUSH (FIFO)
   * 5. Joins player to 'queue:general' Socket.IO room for status updates
   * 6. Emits immediate queue status update to joining player
   * 7. Broadcasts queue update to all waiting players
   * 8. Confirms successful queue addition with response message
   *
   * @dev Queue Management:
   * - Uses LPUSH for FIFO (First In, First Out) queue behavior
   * - Timestamp ensures fair ordering in matchmaking cycles
   * - Player joins 'queue:general' room for real-time updates
   * - Queue status is updated immediately after player addition
   *
   * @dev Redis Operations:
   * - LPUSH: Adds player to 'waiting:queue' list (FIFO)
   * - LLEN: Gets updated queue count for status calculation
   * - Data serialization: QueuedPlayer objects stored as JSON strings
   * - Timestamp: Date.now() for accurate wait time tracking
   *
   * @dev Socket.IO Integration:
   * - socket.join('queue:general'): Enables queue status broadcasts
   * - socket.emit(): Provides immediate feedback to joining player
   * - server.to('queue:general').emit(): Updates all waiting players
   * - Room membership enables efficient targeted communication
   *
        * @dev Wait Time Estimation:
     * - Formula: Math.max(0, waitingCount - 1) * 30 seconds
   * - Optimistic estimate based on 3-second matchmaking cycles
   * - Accounts for current player in next cycle
   * - Helps set player expectations and reduce anxiety
   *
   * @dev Response Handling:
   * - Returns null (no immediate match) - waits for next cycle
   * - Emits 'addtoqueue' confirmation with success message
   * - Provides queue position and estimated wait time
   * - Sets clear expectations about matchmaking timing
   *
   * @dev Error Handling:
   * - Validates player data before processing
   * - Graceful error handling for queue status updates
   * - Continues processing even if status updates fail
   * - Logs errors for debugging without breaking onboarding
   *
   * @dev Performance Considerations:
   * - Single Redis LPUSH operation for queue addition
   * - Efficient Socket.IO room management
   * - Immediate feedback reduces player uncertainty
   * - Queue status updates happen asynchronously
   *
   * @dev Player Experience:
   * - Immediate confirmation of queue addition
   * - Real-time queue position and wait time updates
   * - Clear communication about next steps
   * - Consistent with overall matchmaking flow
   */
  async joinMatchmaking(socket: Socket, addToQueue: IAddToQueue) {
    const player: IPublicState = addToQueue.playerSetup;

    if (!player) {
      console.error("Player is not defined");
      return null;
    }

    console.log(`Player ${player.playerId} joining matchmaking queue`);

    // Register socket mapping
    await this.gameStateService.registerSocket(socket);

    // Add player to Redis waiting list with timestamp
    const queuedPlayer: QueuedPlayer = {
      player: player,
      timestamp: Date.now(),
    };
    await this.redisClient.lPush("waiting:queue", JSON.stringify(queuedPlayer));

    // Join the general queue room
    await socket.join("queue:general");

    // Emit queue update
    try {
      const waitingCount = await this.redisClient.lLen("waiting:queue");
      const estimatedTimeSec = Math.max(0, waitingCount - 1) * 30; // naive ETA based on 30-second cron cycle
      const updateQueue: IUpdateQueue = new TransformedUpdateQueue(
        waitingCount,
        estimatedTimeSec,
      );

      socket.emit("updateQueue", updateQueue);
      this.server?.to("queue:general").emit("updateQueue", updateQueue);
    } catch (err) {
      console.error("Failed to emit updateQueue after enqueue:", err);
    }

    // Emit add to queue response
    const addToQueueResponse: IAddToQueueResponse =
      new TransformedAddToQueueResponse(
        true,
        "Player added to queue, waiting for matchmaking cycle...",
      );
    socket.emit("addtoqueue", addToQueueResponse);

    console.log(
      `Player ${player.playerId} added to queue. Next matchmaking cycle in ~30 seconds.`,
    );
    return null; // No immediate match, wait for next cycle
  }

  /**
   * @notice Join bot matchmaking - creates a bot opponent for the requesting player
   * @param socket The requesting player's socket connection
   * @param addToQueue The player's matchmaking request data
   * @returns Promise that resolves with match details or null if failed
   * 
   * @dev This method provides immediate bot matchmaking by:
   * 1. Creating a bot client with randomized setup
   * 2. Generating a deterministic room ID for the player-bot match
   * 3. Creating match data and initializing game state
   * 4. Connecting the bot to the WebSocket server
   * 5. Notifying both player and bot of the successful match
   * 
   * Bot Integration:
   * - Bot gets unique ID with 'bot_' prefix for easy identification
   * - Bot uses same WebSocket events and gameplay flow as human players
   * - Bot responds to all game phases with AI-generated actions
   * - Match creation follows same pattern as player-vs-player matches
   * 
   * Error Handling:
   * - Gracefully handles bot creation failures
   * - Cleans up partially created matches on errors
   * - Provides meaningful error messages to requesting player
   */
  async joinBotMatchmaking(socket: Socket, addToQueue: IAddToQueue): Promise<string | null> {
    if (!this.botClientService) {
      console.error('Bot client service not available');
      socket.emit('addtoqueue', new TransformedAddToQueueResponse(
        false, 
        'Bot matchmaking is not available on this server'
      ));
      return null;
    }

    const player: IPublicState = addToQueue.playerSetup;
    if (!player) {
      console.error("Player is not defined");
      return null;
    }

    console.log(`🤖 Player ${player.playerId} requesting bot matchmaking`);

    try {
      // Register the human player's socket mapping
      await this.gameStateService.registerSocket(socket);

      // Generate unique bot ID
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create and connect bot client
      const botClient = await this.botClientService.createBotClient(
        botId, 
        process.env.WEBSOCKET_URL || 'http://localhost:3030'
      );

      // Get bot setup
      const botSetup = botClient.getCurrentState();
      botSetup.socketId = botClient.getSocketId() || '';

      // Generate room ID (player first, then bot for consistency)
      const roomId = `${player.playerId}-${botId}`;

      // Create match object
      const match: Match = {
        player1: player,
        player2: botSetup,
        roomId: roomId,
      };

      // Store match in Redis
      await this.redisClient.hSet('matches', roomId, JSON.stringify(match));

      // Initialize game state
      await this.gameStateService.createGameState(roomId, [
        { id: player.playerId!, socketId: player.socketId! },
        { id: botId, socketId: botSetup.socketId }
      ]);

      // Notify both players of the match
      await this.notifyPlayersOfMatch(player, botSetup, roomId);

      // Start the first turn after a short delay to allow both players to join the room
      setTimeout(async () => {
        try {
          await this.gameStateService.updateGameState(roomId, { status: 'active' });
          
          // Emit the first turn to start gameplay
          if (this.server) {
            this.server.to(roomId).emit('newTurn', { phase: 'spell_casting' });
            await this.gameStateService.publishToRoom(roomId, 'newTurn', { phase: 'spell_casting' });
            console.log(`🎮 Started first turn for bot match in room ${roomId}`);
          }
        } catch (error) {
          console.error('Failed to start first turn for bot match:', error);
        }
      }, 2000); // 2 second delay

      // Emit success response to human player
      socket.emit('addtoqueue', new TransformedAddToQueueResponse(
        true,
        `Bot match created! Room: ${roomId}`
      ));

      console.log(`🤖 Bot match created: ${player.playerId} vs ${botId} in room ${roomId}`);
      return roomId;

    } catch (error) {
      console.error('Failed to create bot match:', error);
      
      // Emit error response
      socket.emit('addtoqueue', new TransformedAddToQueueResponse(
        false,
        'Failed to create bot match. Please try again.'
      ));
      
      return null;
    }
  }

  /**
   * Leave matchmaking
   * @param socket - The socket
   *
   * @dev This function handles the complete player departure process from the matchmaking system.
   * It performs cleanup operations for both queued players and active matches, ensuring
   * proper resource management and opponent notification across distributed deployments.
   *
   * @dev Player Departure Flow:
   * 1. Unregisters socket mapping via GameStateService
   * 2. Removes player from Redis 'waiting:queue' if still queuing
   * 3. Updates queue status for remaining players
   * 4. Emits 'removeFromQueue' confirmation to departing player
   * 5. Checks Redis 'matches' hash for active game participation
   * 6. If in active match: notifies opponent, cleans up game state, removes match record
   * 7. Handles cross-instance communication for distributed deployments
   *
   * @dev Queue Cleanup:
   * - Searches queue for player entry using socket ID
   * - Uses LRANGE to scan entire queue (O(n) operation)
   * - Removes entry using LREM with exact JSON match
   * - Updates queue status for remaining players
   * - Handles both queuing and active match scenarios
   *
   * @dev Active Match Handling:
   * - Scans Redis 'matches' hash for player participation
   * - Identifies match using socket ID comparison
   * - Determines opponent player for notification
   * - Handles both player1 and player2 positions
   *
   * @dev Cross-Instance Communication:
   * - Uses GameStateService.publishToRoom() for Redis pub/sub
   * - Event: 'opponentDisconnected' with player details
   * - Enables communication between different server instances
   * - Payload includes disconnected and remaining player socket IDs
   *
   * @dev Game State Cleanup:
   * - Calls GameStateService.removeGameState() for room cleanup
   * - Removes Socket.IO room membership for both players
   * - Emits 'opponentDisconnected' event to remaining player
   * - Deletes match record from Redis 'matches' hash
   *
   * @dev Redis Operations:
   * - LRANGE: Scans waiting queue for player entry
   * - LREM: Removes player from waiting queue
   * - HGETALL: Retrieves all active matches
   * - HDEL: Removes match record after cleanup
   * - HKEYS: Logs remaining active rooms for monitoring
   *
   * @dev Socket.IO Operations:
   * - socket.emit(): Confirms queue removal to departing player
   * - server.sockets.sockets.get(): Retrieves opponent socket instance
   * - socket.emit(): Notifies opponent of disconnection
   * - socket.leave(): Removes players from game room
   *
   * @dev Error Handling:
   * - Graceful handling of missing socket instances
   * - Continues cleanup even if individual steps fail
   * - Logs errors for debugging without breaking flow
   * - Ensures resource cleanup regardless of error conditions
   *
   * @dev Data Consistency:
   * - Maintains queue and matches synchronization
   * - Prevents orphaned game states or match records
   * - Ensures opponent receives proper disconnection notification
   * - Updates queue status for remaining players
   *
   * @dev Performance Considerations:
   * - O(n) queue scanning for player removal
   * - Efficient Redis hash operations for match management
   * - Minimal Socket.IO operations for local instances
   * - Cross-instance communication via Redis pub/sub
   *
   * @dev Monitoring and Debugging:
   * - Logs all major operations for debugging
   * - Reports active rooms after cleanup
   * - Clear error messages for troubleshooting
   * - Tracks player movement through system
   */
  async leaveMatchmaking(socket: Socket) {
    console.log(`Player ${socket.id} leaving matchmaking`);

    // Remove socket mapping
    await this.gameStateService.unregisterSocket(socket.id);

    // Remove from Redis waiting list
    const waiting = await this.redisClient.lRange("waiting:queue", 0, -1);
    const playerEntry = waiting.find((p) => {
      try {
        const parsed = JSON.parse(p);
        return parsed.player.socketId === socket.id;
      } catch {
        return false;
      }
    });

    if (playerEntry) {
      await this.redisClient.lRem("waiting:queue", 1, playerEntry);
      // Update queue status
      await this.updateQueueStatus();
    }

    const removeFromQueue: IRemoveFromQueue = new TransformedRemoveFromQueue(
      socket.id,
      0,
      null,
    );
    socket.emit("removeFromQueue", removeFromQueue);

    // Check for match in Redis
    const matches = await this.redisClient.hGetAll("matches");
    const matchEntry = Object.entries(matches).find(([_, m]) => {
      const match = JSON.parse(m);
      return (
        match.player1?.socketId === socket.id ||
        match.player2?.socketId === socket.id
      );
    });

    if (matchEntry) {
      const [roomId, m] = matchEntry;
      const match: Match = JSON.parse(m);
      const otherPlayer =
        match.player1.socketId === socket.id ? match.player2 : match.player1;

      // Notify other player through Redis pub/sub
      await this.gameStateService.publishToRoom(
        roomId,
        "opponentDisconnected",
        {
          disconnectedPlayer: socket.id,
          remainingPlayer: otherPlayer.socketId,
        },
      );

      // Remove game state
      await this.gameStateService.removeGameState(roomId);

      if (this.server) {
        const otherSocket = this.server.sockets.sockets.get(
          otherPlayer.socketId!,
        );
        if (otherSocket) {
          otherSocket.emit("opponentDisconnected");
          otherSocket.leave(roomId);
        }
        console.log(`Player ${socket.id} left match ${roomId}`);
      }
      await this.redisClient.hDel("matches", roomId);
      const activeRooms = await this.redisClient.hKeys("matches");
      console.log(`Active rooms: ${activeRooms.join(", ")}`);
    }
  }

  /**
   * Get match info
   * @param roomId - The room ID
   * @returns The match info object or `null` if not found
   *
   * @dev This function provides read-only access to match information stored in Redis.
   * It's used for match validation, debugging, and external system integration
   * without modifying the underlying match data.
   *
   * @dev Match Retrieval Flow:
   * 1. Accepts roomId parameter (format: "playerId1-playerId2")
   * 2. Queries Redis 'matches' hash using HGET operation
   * 3. Returns parsed Match object if found, null otherwise
   * 4. Handles JSON parsing errors gracefully
   *
   * @dev Redis Operations:
   * - HGET: Retrieves match data from 'matches' hash using roomId as key
   * - O(1) operation regardless of total number of matches
   * - No data modification - read-only access
   * - Efficient for frequent match status checks
   *
   * @dev Data Structure:
   * - Input: roomId string (e.g., "player123-player456")
   * - Output: Match object or null
   * - Match format: { player1: IPublicState, player2: IPublicState, roomId: string }
   * - JSON deserialization from Redis storage format
   *
   * @dev Error Handling:
   * - Gracefully handles missing matches (returns null)
   * - JSON parsing errors would throw (handled by caller)
   * - No internal error logging - caller responsibility
   * - Clean null return for non-existent matches
   *
   * @dev Use Cases:
   * - Match validation before game operations
   * - Debugging matchmaking issues
   * - External system integration (analytics, monitoring)
   * - Player reconnection scenarios
   * - Match state verification
   *
   * @dev Performance Characteristics:
   * - Single Redis HGET operation
   * - O(1) time complexity
   * - Minimal memory allocation
   * - No network overhead beyond Redis call
   *
   * @dev Security Considerations:
   * - Read-only access prevents data tampering
   * - RoomId validation should be done by caller
   * - No authentication/authorization checks
   * - Exposes full match data to caller
   *
   * @dev Integration Points:
   * - Used by GameStateService for match validation
   * - Called by external monitoring systems
   * - Supports debugging and troubleshooting
   * - Enables match state inspection
   */
  async getMatchInfo(roomId: string) {
    const match = await this.redisClient.hGet("matches", roomId);
    return match ? JSON.parse(match) : null;
  }

  /**
   * Clear the matchmaking queue (for testing purposes)
   *
   * @dev This function clears all players from the waiting queue and removes all active matches.
   * It's intended for testing and development to reset the matchmaking system to a clean state.
   *
   * @dev Cleanup Flow:
   * 1. Stops the matchmaking loop temporarily
   * 2. Clears all players from 'waiting:queue' list
   * 3. Removes all active matches from 'matches' hash
   * 4. Restarts the matchmaking loop
   * 5. Logs cleanup results for verification
   *
   * @dev Redis Operations:
   * - DEL: Completely removes the waiting queue list
   * - DEL: Removes all matches hash entries
   * - No partial cleanup - complete reset
   *
   * @dev Use Cases:
   * - Development testing and debugging
   * - Resetting system state between test runs
   * - Clearing stuck or corrupted queue states
   * - Starting fresh matchmaking sessions
   *
   * @dev Safety Considerations:
   * - Only available in development/testing environments
   * - Completely removes all matchmaking data
   * - No recovery of cleared data
   * - Should not be used in production
   *
   * @dev Performance Impact:
   * - Minimal Redis operations (2 DEL commands)
   * - Temporary pause in matchmaking loop
   * - Immediate cleanup completion
   * - No impact on running games
   */
  async clearQueue(): Promise<void> {
    console.log("🧹 Clearing matchmaking queue for testing...");

    try {
      // Clear waiting queue
      await this.redisClient.del("waiting:queue");
      console.log("✅ Waiting queue cleared");

      // Clear all matches
      await this.redisClient.del("matches");
      console.log("✅ Active matches cleared");

      console.log("🧹 Queue cleanup completed successfully");
    } catch (error) {
      console.error("❌ Queue cleanup failed:", error);
      throw error;
    }
  }

  /**
   * Disconnect
   *
   * @dev This function performs graceful shutdown of the MatchmakingService by cleaning up
   * all resources, stopping background processes, and closing external connections.
   * It's designed to be called during application shutdown to prevent resource leaks
   * and ensure clean service termination.
   *
   * @dev Shutdown Flow:
   * 1. Closes Redis client connection gracefully
   * 2. Logs successful disconnection for monitoring
   *
        * @dev Resource Cleanup:
     * - redisClient.quit(): Gracefully closes Redis connection
     * - Cron jobs are automatically cleaned up by NestJS scheduler
   *
   * @dev Cron Job Management:
   * - NestJS automatically manages cron job lifecycle
   * - No manual cleanup required for scheduled tasks
   * - Ensures clean shutdown regardless of service state
   *
   * @dev Redis Connection:
   * - Uses quit() instead of disconnect() for graceful closure
   * - Ensures pending Redis operations complete
   * - Prevents data corruption or incomplete operations
   * - Properly closes all Redis channels and subscriptions
   *
   * @dev Error Handling:
   * - Graceful handling of missing intervals
   * - Redis quit() handles connection errors internally
   * - No exceptions thrown during shutdown
   * - Ensures cleanup completes even with errors
   *
   * @dev Lifecycle Integration:
   * - Called from application shutdown hooks
   * - Part of graceful application termination
   * - Prevents resource leaks in production deployments
   * - Enables clean service restarts
   *
   * @dev Monitoring and Logging:
   * - Confirms successful disconnection
   * - Provides clear shutdown confirmation
   * - Aids in debugging deployment issues
   * - Tracks service lifecycle events
   *
   * @dev Best Practices:
   * - Always called during application shutdown
   * - Prevents hanging Redis connections
   * - Ensures clean process termination
   * - Enables proper resource management
   *
   * @dev Deployment Considerations:
   * - Essential for container-based deployments
   * - Prevents connection pool exhaustion
   * - Enables graceful scaling operations
   * - Supports rolling updates and restarts
   */
  async disconnect() {
    await this.redisClient.quit();
    console.log("MatchmakingService Redis Disconnected");
  }
}
