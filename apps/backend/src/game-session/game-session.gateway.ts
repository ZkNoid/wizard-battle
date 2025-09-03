import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameStateService } from './game-state.service';
import {
  IAddToQueue,
  IAddToQueueResponse,
  IRemoveFromQueue,
  IUpdateQueue,
  IFoundMatch,
  IPublicState,
} from '../../../common/types/matchmaking.types';
import {
  GamePhase,
  IUserActions,
  ITrustedState,
  IDead,
  IGameEnd,
} from '../../../common/types/gameplay.types';

/**
 * @title Game Session Gateway - 5-Phase Turn Orchestration
 * @notice WebSocket gateway that orchestrates real-time 5-phase turn-based gameplay
 * @dev Uses Socket.IO with Redis adapter for horizontal scaling across multiple instances
 *
 * ## 5-Phase Turn Flow:
 * 1. SPELL_CASTING: handleSubmitActions() → storePlayerActions() → check if all ready
 * 2. SPELL_PROPAGATION: advanceToSpellPropagation() → broadcast all actions
 * 3. SPELL_EFFECTS: advanceToSpellEffects() → notify clients to apply effects
 * 4. END_OF_ROUND: handleSubmitTrustedState() → storeTrustedState() → check if all ready
 * 5. STATE_UPDATE: advanceToStateUpdate() → broadcast all states → start new turn
 *
 * ## Multi-Instance Support:
 * - Redis pub/sub for cross-instance event broadcasting
 * - Socket mappings ensure events reach correct instance
 * - Automatic phase advancement synchronized across instances
 *
 * ## WebSocket Events:
 * Client → Server: submitActions, submitTrustedState, reportDead
 * Server → Client: allPlayerActions, applySpellEffects, updateUserStates, newTurn, gameEnd
 */
@WebSocketGateway({
  cors: { origin: '*' },
})
export class GameSessionGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly gameStateService: GameStateService
  ) {}

  /**
   * @dev Invoked once the gateway is initialized. Injects the Socket.IO
   * server instance into the matchmaking service (so it can join rooms and
   * emit locally) and subscribes to cross-instance room events from
   * `GameStateService`, routing them to `handleCrossInstanceEvent`.
   */
  afterInit() {
    console.log('WebSocket Gateway initialized');
    this.matchmakingService.setServer(this.server);

    // Configure Socket.IO Redis adapter at runtime so env is available
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient: RedisClientType = createClient({ url: redisUrl });
    const subClient: RedisClientType = pubClient.duplicate();
    pubClient.on('error', (err) =>
      console.error('Redis Pub Client Error', err)
    );
    subClient.on('error', (err) =>
      console.error('Redis Sub Client Error', err)
    );
    pubClient.on('connect', () => console.log('Redis Pub Client Connected'));
    subClient.on('connect', () => console.log('Redis Sub Client Connected'));
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        this.server.adapter(createAdapter(pubClient, subClient));
      })
      .catch((err) => console.error('Redis Connection Error', err));

    // Subscribe to cross-instance room events
    this.gameStateService.subscribeToRoomEvents(async (data) => {
      await this.handleCrossInstanceEvent(data);
    });
  }

  /**
   * @param socket - The socket instance
   * @dev Handles new socket connections. Registers a socket-to-instance
   * mapping in Redis so other processes can target this client even if they
   * do not host the socket locally.
   */
  handleConnection(socket: Socket) {
    console.log(`Client connected: ${socket.id}, Process ID: ${process.pid}`);
    // Register socket mapping
    this.gameStateService
      .registerSocket(socket)
      .catch((err) => console.error('Failed to register socket mapping:', err));
  }

  /**
   * @dev Handles socket disconnections. Cleans up Redis socket mapping and
   * informs the matchmaking service so the player leaves queues/rooms and
   * peers can be notified.
   */
  handleDisconnect(socket: Socket) {
    console.log(`Client disconnected: ${socket.id}`);
    // Clean up socket mapping and matchmaking
    this.gameStateService
      .unregisterSocket(socket.id)
      .catch((err) =>
        console.error('Failed to unregister socket mapping:', err)
      );
    this.matchmakingService.leaveMatchmaking(socket);
  }

  @SubscribeMessage('joinMatchmaking')
  /**
   * @param socket - The socket instance
   * @param data - The data object containing the addToQueue
   * @returns The result of the matchmaking service's joinMatchmaking method
   * @dev Entrypoint for clients to join a matchmaking queue. Delegates to the
   * matchmaking service which enqueues, attempts to match, and returns a
   * `roomId` when successful.
   */
  async handleJoinMatchmaking(
    socket: Socket,
    data: { addToQueue: IAddToQueue }
  ) {
    return await this.matchmakingService.joinMatchmaking(
      socket,
      data.addToQueue
    );
  }

  @SubscribeMessage('joinBotMatchmaking')
  /**
   * @param socket - The socket instance
   * @param data - The data object containing the addToQueue
   * @returns The result of the matchmaking service's joinMatchmaking method
   * @dev Entrypoint for clients to join a matchmaking queue. Delegates to the
   * matchmaking service which enqueues, attempts to match, and returns a
   * `roomId` when successful.
   */
  async handleJoinBotMatchmaking(
    socket: Socket,
    data: { addToQueue: IAddToQueue }
  ) {
    return await this.matchmakingService.joinBotMatchmaking(
      socket,
      data.addToQueue
    );
  }

  @SubscribeMessage('gameMessage')
  /**
   * @param socket - The socket instance
   * @param data - The data object containing the roomId and message
   * @returns The result of the matchmaking service's getMatchInfo method
   * @dev Broadcasts a gameplay message to participants in a room. Verifies an
   * active match and state, emits to local sockets in the room, and publishes
   * the same event via Redis so other instances rebroadcast to their local
   * listeners.
   */
  async handleGameMessage(
    socket: Socket,
    data: { roomId: string; message: any }
  ) {
    const match = await this.matchmakingService.getMatchInfo(data.roomId);
    const gameState = await this.gameStateService.getGameState(data.roomId);

    if (match && gameState && this.server) {
      console.log(
        `Broadcasting gameMessage to room ${data.roomId}: ${JSON.stringify(data.message)}`
      );

      // Emit to local sockets in the room
      this.server.to(data.roomId).emit('gameMessage', {
        roomId: data.roomId,
        sender: socket.id,
        message: data.message,
      });

      // Publish to other instances via Redis
      await this.gameStateService.publishToRoom(data.roomId, 'gameMessage', {
        sender: socket.id,
        message: data.message,
      });
    } else {
      console.error(
        `Failed to broadcast gameMessage: match=${!!match}, gameState=${!!gameState}, server=${!!this.server}, roomId=${data.roomId}`
      );
    }
  }

  @SubscribeMessage('updatePlayerState')
  /**
   * @param socket - The socket instance
   * @param data - The data object containing the roomId, playerId, and state
   * @returns The result of the gameStateService's updatePlayerState method
   * @dev Updates a player's state in the room and notifies peers. Persists the
   * per-player state via `GameStateService`, then publishes a
   * `playerStateUpdated` event to other instances and acknowledges the caller.
   */
  async handleUpdatePlayerState(
    socket: Socket,
    data: { roomId: string; playerId: string; state: any }
  ) {
    try {
      await this.gameStateService.updatePlayerState(
        data.roomId,
        data.playerId,
        data.state
      );

      // Publish state update to other instances
      await this.gameStateService.publishToRoom(
        data.roomId,
        'playerStateUpdated',
        {
          playerId: data.playerId,
          state: data.state,
        }
      );

      socket.emit('playerStateUpdated', { success: true });
    } catch (error) {
      console.error('Failed to update player state:', error);
      socket.emit('playerStateUpdated', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @SubscribeMessage('cleanupQueue')
  /**
   * @param socket - The socket instance
   * @param data - The cleanup action data
   * @dev Handles queue cleanup requests for testing purposes.
   * Clears all players from the matchmaking queue and removes all active matches.
   */
  async handleCleanupQueue(socket: Socket, data: { action: string }) {
    if (data.action === 'clear') {
      try {
        console.log('🧹 Client requested queue cleanup');
        await this.matchmakingService.clearQueue();
        socket.emit('cleanupComplete', {
          success: true,
          message: 'Queue cleared successfully',
        });
      } catch (error) {
        console.error('Failed to cleanup queue:', error);
        socket.emit('cleanupComplete', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  @SubscribeMessage('getGameState')
  /**
   * @param socket - The socket instance
   * @param data - The data object containing the roomId
   * @returns The current `GameState` for a room to the requesting client.
   * @dev Returns the current `GameState` for a room to the requesting client.
   * Errors are caught and sent back in the payload.
   */
  async handleGetGameState(socket: Socket, data: { roomId: string }) {
    try {
      const gameState = await this.gameStateService.getGameState(data.roomId);
      socket.emit('gameState', { roomId: data.roomId, state: gameState });
    } catch (error) {
      console.error('Failed to get game state:', error);
      socket.emit('gameState', {
        roomId: data.roomId,
        state: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * @notice Phase 1 Handler: Receives and validates player action submissions
   * @dev Called during SPELL_CASTING phase when players submit their intended actions
   * @param socket The WebSocket connection from the submitting player
   * @param data Contains roomId and the player's actions with cryptographic signature
   *
   * Validation:
   * - Ensures game is in SPELL_CASTING phase
   * - Verifies actions contain at least one valid action
   * - Extracts playerId from first action
   *
   * Flow:
   * 1. Store actions via GameStateService.storePlayerActions()
   * 2. Mark player as ready via GameStateService.markPlayerReady()
   * 3. If all players ready, advance to SPELL_PROPAGATION phase
   *
   * Response:
   * - Emits 'actionSubmitResult' with success/error status
   * - On success with all ready: triggers advanceToSpellPropagation()
   */
  @SubscribeMessage('submitActions')
  async handleSubmitActions(
    socket: Socket,
    data: { roomId: string; actions: IUserActions }
  ) {
    try {
      const gameState = await this.gameStateService.getGameState(data.roomId);
      if (!gameState || gameState.currentPhase !== GamePhase.SPELL_CASTING) {
        socket.emit('actionSubmitResult', {
          success: false,
          error: 'Invalid phase for action submission',
        });
        return;
      }

      // Get playerId from first action, or find by socket if no actions
      // let playerId = data.actions.actions[0]?.playerId;
      let playerId = socket.id;
      // if (!playerId) {
      // If no actions provided, find player by socket ID
      const player = gameState.players.find((p) => p.socketId === socket.id);

      if (!player) {
        socket.emit('actionSubmitResult', {
          success: false,
          error: 'Player not found and no actions provided',
        });
        return;
      }

      playerId = player.id;

      console.log(
        `📝 Player ${playerId} submitted empty actions (no spells cast)`
      );
      // } else {
      //   console.log(
      //     `📝 Player ${playerId} submitted ${data.actions.actions.length} actions`
      //   );
      // }

      // Store the actions
      await this.gameStateService.storePlayerActions(
        data.roomId,
        playerId,
        data.actions
      );

      // Mark player as ready
      const allReady = await this.gameStateService.markPlayerReady(
        data.roomId,
        playerId
      );

      socket.emit('actionSubmitResult', { success: true });

      // If all players submitted actions, advance to next phase
      if (allReady) {
        await this.advanceToSpellPropagation(data.roomId);
      }
    } catch (error) {
      socket.emit('actionSubmitResult', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * @notice Phase 4 Handler: Receives player's computed state after spell effects
   * @dev Called during END_OF_ROUND phase after players locally apply all spell effects
   * @param socket The WebSocket connection from the submitting player
   * @param data Contains roomId and player's trusted state with cryptographic proofs
   *
   * Validation:
   * - Ensures game is in END_OF_ROUND phase
   * - Verifies trustedState contains required fields (playerId, stateCommit, publicState, signature)
   *
   * Flow:
   * 1. Store trusted state via GameStateService.storeTrustedState()
   * 2. Mark player as ready via GameStateService.markPlayerReady()
   * 3. If all players ready, advance to STATE_UPDATE phase
   *
   * Response:
   * - Emits 'trustedStateResult' with success/error status
   * - On success with all ready: triggers advanceToStateUpdate()
   */
  @SubscribeMessage('submitTrustedState')
  async handleSubmitTrustedState(
    socket: Socket,
    data: { roomId: string; trustedState: ITrustedState }
  ) {
    try {
      // END_OF_ROUND - issue fix
      console.log(
        `📝 Received trusted state submission from ${data.trustedState.playerId} in room ${data.roomId}`
      );

      const gameState = await this.gameStateService.getGameState(data.roomId);
      if (!gameState || gameState.currentPhase !== GamePhase.END_OF_ROUND) {
        console.log(
          `❌ Invalid phase for trusted state: current=${gameState?.currentPhase}, expected=END_OF_ROUND`
        );
        socket.emit('trustedStateResult', {
          success: false,
          error: 'Invalid phase for trusted state submission',
        });
        return;
      }

      // Log current state before processing
      const alivePlayers = gameState.players.filter((p) => p.isAlive);
      const playersWithTrustedState = gameState.players.filter(
        (p) => p.isAlive && p.trustedState
      );
      console.log(
        `🔍 END_OF_ROUND state BEFORE: ${alivePlayers.length} alive, ${playersWithTrustedState.length} with trusted states, ${gameState.playersReady.length} ready`
      );

      // Store trusted state AND mark player ready atomically
      const allReady =
        await this.gameStateService.storeTrustedStateAndMarkReady(
          data.roomId,
          data.trustedState.playerId,
          data.trustedState
        );

      // Get updated state after both operations
      const updatedGameState = await this.gameStateService.getGameState(
        data.roomId
      );
      if (updatedGameState) {
        const updatedAlivePlayers = updatedGameState.players.filter(
          (p) => p.isAlive
        );
        const updatedPlayersWithTrustedState = updatedGameState.players.filter(
          (p) => p.isAlive && p.trustedState
        );
        console.log(
          `🔍 END_OF_ROUND state AFTER: ${updatedAlivePlayers.length} alive, ${updatedPlayersWithTrustedState.length} with trusted states, ${updatedGameState.playersReady.length} ready`
        );

        // Double-check that all alive players have both trusted states AND are marked ready
        const allHaveTrustedStates = updatedAlivePlayers.every(
          (p) => p.trustedState
        );
        const allMarkedReady =
          updatedGameState.playersReady.length >= updatedAlivePlayers.length;

        console.log(
          `✅ Player ${data.trustedState.playerId} processed. All have trusted states: ${allHaveTrustedStates}, All marked ready: ${allMarkedReady}, Combined ready: ${Boolean(allReady)}`
        );

        socket.emit('trustedStateResult', { success: true });

        // Use a more robust check - both conditions must be true
        if (allReady && allHaveTrustedStates) {
          console.log(
            `🚀 All players ready AND have trusted states in room ${data.roomId}, advancing to STATE_UPDATE`
          );
          await this.advanceToStateUpdate(data.roomId);
        } else {
          // More detailed logging about what we're waiting for
          const playersWithoutTrustedStates = updatedAlivePlayers
            .filter((p) => !p.trustedState)
            .map((p) => p.id);
          const playersNotReady = updatedAlivePlayers
            .filter((p) => !updatedGameState.playersReady.includes(p.id))
            .map((p) => p.id);

          if (playersWithoutTrustedStates.length > 0) {
            console.log(
              `⏳ Still waiting for trusted states from: ${playersWithoutTrustedStates.join(', ')}`
            );
          }
          if (playersNotReady.length > 0) {
            console.log(
              `⏳ Still waiting for readiness confirmation from: ${playersNotReady.join(', ')}`
            );
          }
        }
      } else {
        console.error(
          `❌ Could not retrieve updated game state for room ${data.roomId}`
        );
        socket.emit('trustedStateResult', { success: true });
      }
    } catch (error) {
      console.error(`❌ Error handling trusted state submission:`, error);
      socket.emit('trustedStateResult', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * @notice Handles player elimination and win condition checking
   * @dev Called when a player's HP reaches zero or they're eliminated by game rules
   * @param socket The WebSocket connection reporting the death (can be any player)
   * @param data Contains roomId and the eliminated player's information
   *
   * Win Condition Logic:
   * - Calls GameStateService.markPlayerDead() to eliminate player
   * - If winner determined (only 1 player remains), broadcasts 'gameEnd' event
   * - If game continues (2+ players remain), no additional action taken
   *
   * Cross-Instance Broadcasting:
   * - Uses both local emit and Redis publishToRoom for multi-instance support
   * - Ensures all instances receive game end notification simultaneously
   *
   * Error Handling:
   * - Catches and logs errors but doesn't emit error responses
   * - Death reporting is fire-and-forget for performance
   */
  @SubscribeMessage('reportDead')
  async handleReportDead(
    socket: Socket,
    data: { roomId: string; dead: IDead }
  ) {
    try {
      // Validate input data
      if (!data || !data.roomId || !data.dead || !data.dead.playerId) {
        console.log(`⚠️ handleReportDead: Invalid data received`, data);
        return;
      }

      console.log(
        `🔍 Processing death report: Player ${data.dead.playerId} in room ${data.roomId}`
      );

      const winnerId = await this.gameStateService.markPlayerDead(
        data.roomId,
        data.dead.playerId
      );

      if (winnerId) {
        // Game ended, announce winner
        const gameEnd: IGameEnd = { winnerId };
        console.log(
          `📢 Broadcasting game end: ${winnerId} wins in room ${data.roomId}`
        );

        this.server.to(data.roomId).emit('gameEnd', gameEnd);
        await this.gameStateService.publishToRoom(
          data.roomId,
          'gameEnd',
          gameEnd
        );

        // ✅ FIXED: Mark room for cleanup (cron job will handle it)
        await this.gameStateService.markRoomForCleanup(
          data.roomId,
          'game_ended'
        );
      } else {
        console.log(`🎮 Game continues in room ${data.roomId} - no winner yet`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to handle player death in room ${data?.roomId}:`,
        error
      );
      // ✅ FIXED: Mark room for cleanup on error too
      if (data?.roomId) {
        await this.gameStateService.markRoomForCleanup(
          data.roomId,
          'error_in_death_handling'
        );
      }
    }
  }

  /**
   * ✅ NEW: Room cleanup method (called by cron job)
   */
  async cleanupRoom(roomId: string, reason: string): Promise<void> {
    console.log(`🧹 Cleaning up room ${roomId} (reason: ${reason})`);

    try {
      // Notify players that room is being cleaned up
      this.server.to(roomId).emit('roomCleanup', { reason });

      // Remove all sockets from room
      const sockets = await this.server.in(roomId).allSockets();
      for (const socketId of sockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(roomId);
        }
      }

      console.log(`✅ Room ${roomId} cleaned up successfully`);
    } catch (error) {
      console.error(`Failed to cleanup room ${roomId}:`, error);
    }
  }

  /**
   * @param data - The data object containing the roomId, event, data, originInstanceId, and timestamp
   * @dev Handles events published by other instances on the Redis channel and
   * re-emits them to any local sockets subscribed to the target room. For
   * `playerJoined`, attempts to join the player's socket to the room if the
   * socket is connected to this instance.
   */
  private async handleCrossInstanceEvent(data: {
    roomId: string;
    event: string;
    data: any;
    originInstanceId: string;
    timestamp: number;
  }) {
    if (!this.server) return;

    // Skip events that originated from this instance to prevent double messages
    if (data.originInstanceId === this.gameStateService.getInstanceId()) {
      return;
    }

    switch (data.event) {
      case 'gameMessage':
        // Broadcast game message to local sockets in the room
        this.server.to(data.roomId).emit('gameMessage', {
          roomId: data.roomId,
          sender: data.data.sender,
          message: data.data.message,
        });
        break;

      case 'playerStateUpdated':
        // Broadcast player state update to local sockets in the room
        this.server.to(data.roomId).emit('playerStateUpdated', {
          playerId: data.data.playerId,
          state: data.data.state,
        });
        break;

      case 'matchFound':
        // Handle match found event from other instances
        // If a specific socket is targeted, emit only to that socket; otherwise to room
        if (data.data?.targetSocketId) {
          const target = this.server.sockets.sockets.get(
            data.data.targetSocketId
          );
          if (target) {
            target.emit('matchFound', data.data.payload);
          }
        } else {
          this.server
            .to(data.roomId)
            .emit('matchFound', data.data?.payload ?? data.data);
        }
        break;

      case 'playerJoined':
        // Handle player joined event from other instances
        // data.data contains { playerId, roomId } from publisher
        // Look up by socketId; if not provided, try playerId as fallback
        const socketMapping = await this.gameStateService.getSocketMapping(
          data.data.socketId ?? data.data.playerId
        );
        if (socketMapping && this.server) {
          const socket = this.server.sockets.sockets.get(
            socketMapping.socketId
          );
          if (socket) {
            socket.join(data.roomId);
            console.log(
              `Player ${data.data.playerId} joined room ${data.roomId} via cross-instance event`
            );
          }
        }
        break;

      case 'opponentDisconnected':
        // Handle opponent disconnection
        const gameState = await this.gameStateService.getGameState(data.roomId);
        if (gameState) {
          const remainingPlayer = gameState.players.find(
            (p) => p.id === data.data.remainingPlayer
          );
          if (remainingPlayer && this.server) {
            const socket = this.server.sockets.sockets.get(
              remainingPlayer.socketId
            );
            if (socket) {
              socket.emit('opponentDisconnected');
            }
          }
        }
        break;

      case 'allPlayerActions':
        // Broadcast all player actions to local sockets
        this.server.to(data.roomId).emit('allPlayerActions', data.data);
        break;

      case 'applySpellEffects':
        // Broadcast spell effects phase to local sockets
        this.server.to(data.roomId).emit('applySpellEffects');
        break;

      case 'updateUserStates':
        // Broadcast user state updates to local sockets
        this.server.to(data.roomId).emit('updateUserStates', data.data);
        break;

      case 'newTurn':
        // Broadcast new turn to local sockets
        this.server.to(data.roomId).emit('newTurn', data.data);
        break;

      case 'gameEnd':
        // Broadcast game end to local sockets
        this.server.to(data.roomId).emit('gameEnd', data.data);
        break;

      default:
        console.log(`Unknown cross-instance event: ${data.event}`);
    }
  }

  // ==================== PHASE ADVANCEMENT ORCHESTRATION ====================

  /**
   * @notice Phase 1→2 Transition: Broadcasts all player actions to begin spell propagation
   * @dev Called automatically when all players submit actions in SPELL_CASTING phase
   * @param roomId The unique identifier for the game room
   *
   * Phase 2 (SPELL_PROPAGATION) Logic:
   * 1. Retrieve all player actions via GameStateService.getAllPlayerActions()
   * 2. Advance game phase to SPELL_PROPAGATION
   * 3. Broadcast actions to all players via 'allPlayerActions' event
   * 4. Use Redis publishToRoom for cross-instance synchronization
   * 5. Auto-advance to SPELL_EFFECTS after 1 second delay
   *
   * Client Expectations:
   * - Clients receive all player actions simultaneously
   * - Clients can now see what spells all players are casting
   * - Prepares clients for local spell effect computation
   */
  async advanceToSpellPropagation(roomId: string) {
    // Get all actions and broadcast them
    const allActions = await this.gameStateService.getAllPlayerActions(roomId);

    // Advance phase
    await this.gameStateService.advanceGamePhase(roomId);

    // Broadcast all actions to all players
    this.server.to(roomId).emit('allPlayerActions', allActions);
    await this.gameStateService.publishToRoom(
      roomId,
      'allPlayerActions',
      allActions
    );

    // Auto-advance to spell effects phase after a short delay
    // setTimeout(() => {
    this.advanceToSpellEffects(roomId);
    // }, 1000);
  }

  /**
   * @notice Phase 2→3 Transition: Signals clients to apply spell effects locally
   * @dev Automatically called after SPELL_PROPAGATION phase completes
   * @param roomId The unique identifier for the game room
   *
   * Phase 3 (SPELL_EFFECTS) Logic:
   * 1. Advance game phase to SPELL_EFFECTS
   * 2. Emit 'applySpellEffects' signal to all players
   * 3. Use Redis publishToRoom for cross-instance synchronization
   *
   * Client Expectations:
   * - Clients apply all received actions to their local game state
   * - Clients compute damage, healing, movement, and other effects
   * - Clients generate trusted state commitments with cryptographic proofs
   * - Clients automatically advance to END_OF_ROUND and submit trusted states
   *
   * Note: This phase has no server-side waiting - clients self-manage timing
   */
  async advanceToSpellEffects(roomId: string) {
    await this.gameStateService.advanceGamePhase(roomId);

    // Notify players to apply effects
    this.server.to(roomId).emit('applySpellEffects');
    await this.gameStateService.publishToRoom(roomId, 'applySpellEffects', {});

    // Auto-advance to END_OF_ROUND phase after players have time to process effects
    //   setTimeout(async () => {
    await this.gameStateService.advanceGamePhase(roomId);
    console.log(`🔄 Advanced room ${roomId} to END_OF_ROUND phase`);
    //   }, 2000); // 2 second delay for effect processing
  }

  /**
   * @notice Phase 4→5 Transition: Distributes all player states for opponent updates
   * @dev Called when all players submit trusted states in END_OF_ROUND phase
   * @param roomId The unique identifier for the game room
   *
   * Phase 5 (STATE_UPDATE) Logic:
   * 1. Collect all trusted states from alive players
   * 2. Advance game phase to STATE_UPDATE
   * 3. Broadcast states via 'updateUserStates' event
   * 4. Use Redis publishToRoom for cross-instance synchronization
   * 5. Auto-start next turn after 2 second delay
   *
   * Client Expectations:
   * - Clients receive public state updates for all opponents
   * - Clients update their local representation of opponent HP, position, effects
   * - Clients prepare for next turn's SPELL_CASTING phase
   *
   * State Contents:
   * - Only includes trusted states from alive players
   * - Contains public information: HP, position, active effects
   * - Excludes private information: full spell cooldowns, hidden effects
   */
  async advanceToStateUpdate(roomId: string) {
    // END_OF_ROUND - issue fix
    console.log(`🔄 Advancing room ${roomId} to STATE_UPDATE phase`);

    const gameState = await this.gameStateService.getGameState(roomId);
    if (!gameState) {
      console.log(
        `❌ Cannot advance to STATE_UPDATE: room ${roomId} not found`
      );
      return;
    }

    // Collect all trusted states
    const trustedStates = gameState.players
      .filter((p) => p.isAlive && p.trustedState)
      .map((p) => p.trustedState!);

    console.log(
      `📊 Collected ${trustedStates.length} trusted states from alive players`
    );

    // Advance phase
    await this.gameStateService.advanceGamePhase(roomId);

    // Broadcast state updates
    const updateUserStates = { states: trustedStates };
    this.server.to(roomId).emit('updateUserStates', updateUserStates);
    await this.gameStateService.publishToRoom(
      roomId,
      'updateUserStates',
      updateUserStates
    );

    console.log(`📡 Broadcasted state updates to room ${roomId}`);

    // Start next turn after a delay
    // setTimeout(() => {
    this.startNextTurn(roomId);
    // }, 2000);
  }

  /**
   * @notice Phase 5→1 Transition: Initiates a new turn cycle
   * @dev Called automatically after STATE_UPDATE phase completes
   * @param roomId The unique identifier for the game room
   *
   * New Turn Logic:
   * 1. Advance game phase back to SPELL_CASTING (increments turn counter)
   * 2. Clear previous turn data (actions, trusted states, players ready)
   * 3. Broadcast 'newTurn' event with new phase information
   * 4. Use Redis publishToRoom for cross-instance synchronization
   *
   * Client Expectations:
   * - Clients reset their turn-specific state
   * - Clients re-enable action submission UI
   * - Clients begin new turn with fresh spell cooldowns and effects
   *
   * Turn Counter:
   * - GameStateService automatically increments turn number
   * - Used for game analytics, replay systems, and debugging
   */
  async startNextTurn(roomId: string) {
    console.log(`🔄 Starting new turn for room ${roomId}`);

    // Clear turn-specific data before advancing to new turn
    await this.gameStateService.clearTurnData(roomId);

    // Advance to new turn (increments turn counter and sets phase to SPELL_CASTING)
    await this.gameStateService.advanceGamePhase(roomId);

    // Notify players of new turn
    this.server.to(roomId).emit('newTurn', { phase: GamePhase.SPELL_CASTING });
    await this.gameStateService.publishToRoom(roomId, 'newTurn', {
      phase: GamePhase.SPELL_CASTING,
    });

    console.log(`✅ New turn started for room ${roomId}`);
  }
}
