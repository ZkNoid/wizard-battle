import { Injectable } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { BotService } from './bot.service';
import {
  IAddToQueue,
  IPublicState,
} from '../../../common/types/matchmaking.types';
import {
  IUserActions,
  ITrustedState,
  GamePhase,
} from '../../../common/types/gameplay.types';

/**
 * @title Bot Client Service - WebSocket Client Simulation
 * @notice Service that creates and manages WebSocket connections for bot players
 * @dev Each bot maintains its own Socket.IO client connection and responds to game events
 */
@Injectable()
export class BotClientService {
  private activeBots: Map<string, BotClient> = new Map();
  private botServices: Map<string, BotService> = new Map();

  constructor() {}

  /**
   * @notice Creates a new bot client and connects it to the game server
   * @param botId Unique identifier for the bot
   * @param serverUrl WebSocket server URL to connect to
   * @returns Promise that resolves when bot is connected and ready
   */

  async createBotClient(
    botId: string,
    serverUrl: string = process.env.WEBSOCKET_URL +
      ':' +
      process.env.APP_PORT || 'http://localhost:3030'
  ): Promise<BotClient> {
    console.log(
      '[DEBUG] WEBSOCKET_URL',
      process.env.WEBSOCKET_URL + ':' + process.env.APP_PORT
    );

    // Create a dedicated BotService instance for this bot to prevent collusion
    const botServiceInstance = new BotService();
    this.botServices.set(botId, botServiceInstance);

    const bot = new BotClient(botId, serverUrl, botServiceInstance);
    await bot.connect();
    this.activeBots.set(botId, bot);
    return bot;
  }

  /**
   * @notice Disconnects and removes a bot client
   * @param botId The bot to disconnect
   */
  async disconnectBot(botId: string): Promise<void> {
    const bot = this.activeBots.get(botId);
    if (bot) {
      await bot.disconnect();
      this.activeBots.delete(botId);
      this.botServices.delete(botId); // Clean up bot-specific service
    }
  }

  /**
   * @notice Gets an active bot client
   * @param botId The bot identifier
   * @returns The bot client or undefined if not found
   */
  getBot(botId: string): BotClient | undefined {
    return this.activeBots.get(botId);
  }

  /**
   * @notice Gets all active bot clients
   * @returns Array of all active bot clients
   */
  getAllBots(): BotClient[] {
    return Array.from(this.activeBots.values());
  }

  /**
   * @notice Disconnects all active bots
   */
  async disconnectAllBots(): Promise<void> {
    const disconnectPromises = Array.from(this.activeBots.values()).map((bot) =>
      bot.disconnect()
    );
    await Promise.all(disconnectPromises);
    this.activeBots.clear();
    this.botServices.clear(); // Clean up all bot services
  }
}

/**
 * @title Bot Client - Individual Bot WebSocket Connection
 * @notice Represents a single bot player with its own WebSocket connection
 * @dev Handles all game events and responds with AI-generated actions
 */
export class BotClient {
  private socket: Socket | null = null;
  private currentState: IPublicState;
  private opponentState: IPublicState | null = null;
  private currentRoomId: string | null = null;
  private gamePhase: GamePhase = GamePhase.SPELL_CASTING;
  private lastAllActions: { [playerId: string]: IUserActions } | null = null;
  private hasSubmittedActions: boolean = false;
  private hasSubmittedTrustedState: boolean = false;
  private endOfRoundPollingInterval: NodeJS.Timeout | null = null;
  private matchStartTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly botId: string,
    private readonly serverUrl: string,
    private readonly botService: BotService
  ) {
    // Initialize bot with default state
    this.currentState = this.botService.generateBotSetup(botId, '');
  }

  /**
   * @notice Connects the bot to the WebSocket server and sets up event handlers
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        console.log(
          `🤖 Bot ${this.botId} connected with socket ID: ${this.socket?.id}`
        );
        // Update socket ID in current state
        this.currentState.socketId = this.socket?.id || '';
        this.setupEventHandlers();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error(`🤖 Bot ${this.botId} connection error:`, error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`🤖 Bot ${this.botId} disconnected:`, reason);
      });
    });
  }

  /**
   * @notice Disconnects the bot from the WebSocket server
   */
  async disconnect(): Promise<void> {
    // Stop any polling
    this.stopPollingForEndOfRound();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * @notice Joins bot matchmaking queue
   * @param addToQueue Matchmaking request data
   */
  async joinMatchmaking(addToQueue: IAddToQueue): Promise<void> {
    if (!this.socket) {
      throw new Error(`Bot ${this.botId} is not connected`);
    }

    console.log(`🤖 Bot ${this.botId} joining matchmaking...`);
    this.socket.emit('joinMatchmaking', { addToQueue });
  }

  /**
   * @notice Gets the bot's current state
   */
  getCurrentState(): IPublicState {
    return this.currentState;
  }

  /**
   * @notice Gets the bot's socket ID
   */
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * @notice Sets up all WebSocket event handlers for the bot
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Matchmaking events
    this.socket.on('matchFound', (data) => {
      console.log(`🤖 Bot ${this.botId} found match:`, data);
      this.currentRoomId = data.roomId;
      this.opponentState = data.opponentSetup?.[0] || null;

      // Start a guard timer: if no newTurn arrives soon, assume room is invalid
      if (this.matchStartTimeout) clearTimeout(this.matchStartTimeout);
      this.matchStartTimeout = setTimeout(() => {
        console.warn(
          `🤖 Bot ${this.botId} did not receive newTurn after matchFound; abandoning room ${this.currentRoomId}`
        );
        this.abandonRoomAndDisconnect();
      }, 15000);
    });

    this.socket.on('queueUpdate', (data) => {
      console.log(`🤖 Bot ${this.botId} queue update:`, data);
    });

    // Game phase events
    this.socket.on('newTurn', (data) => {
      console.log(`🤖 Bot ${this.botId} new turn:`, data);
      this.gamePhase = data.phase;

      // Clear match start guard timer on first turn
      if (this.matchStartTimeout) {
        clearTimeout(this.matchStartTimeout);
        this.matchStartTimeout = null;
      }

      // Stop any existing polling
      this.stopPollingForEndOfRound();

      // Reset submission flags for new turn
      this.hasSubmittedActions = false;
      this.hasSubmittedTrustedState = false;

      // If it's spell casting phase, submit actions after a short delay
      if (data.phase === GamePhase.SPELL_CASTING) {
        console.log(`🤖 Bot ${this.botId} starting spell casting phase`);
        setTimeout(
          () => {
            // Double-check phase hasn't changed during delay
            if (
              this.gamePhase === GamePhase.SPELL_CASTING &&
              !this.hasSubmittedActions
            ) {
              this.submitActions();
            }
          },
          Math.random() * 2000 + 1000
        ); // Random delay 1-3 seconds
      }
    });

    this.socket.on('allPlayerActions', (allActions) => {
      console.log(`🤖 Bot ${this.botId} received all actions:`, allActions);
      this.gamePhase = GamePhase.SPELL_PROPAGATION;
      console.log(`🤖 Bot ${this.botId} phase changed to SPELL_PROPAGATION`);
      // Store actions for use when generating trusted state
      this.lastAllActions = allActions as { [playerId: string]: IUserActions };
    });

    this.socket.on('applySpellEffects', () => {
      console.log(`🤖 Bot ${this.botId} applying spell effects...`);
      this.gamePhase = GamePhase.SPELL_EFFECTS;
      console.log(`🤖 Bot ${this.botId} phase changed to SPELL_EFFECTS`);

      // Begin polling for END_OF_ROUND before submitting trusted state
      this.startPollingForEndOfRound();
    });

    this.socket.on('updateUserStates', (data) => {
      console.log(`🤖 Bot ${this.botId} received state updates:`, data);
      this.gamePhase = GamePhase.STATE_UPDATE;
      console.log(`🤖 Bot ${this.botId} phase changed to STATE_UPDATE`);

      // Stop polling since we're now in STATE_UPDATE phase
      this.stopPollingForEndOfRound();

      // Update opponent state if available
      if (data.states) {
        const opponentUpdate = data.states.find(
          (state: ITrustedState) => state.playerId !== this.botId
        );
        if (opponentUpdate) {
          this.opponentState = opponentUpdate.publicState;
        }
      }
    });

    // Game end events
    this.socket.on('gameEnd', (data) => {
      console.log(`🤖 Bot ${this.botId} game ended:`, data);
      if (data.winnerId === this.botId) {
        console.log(`🏆 Bot ${this.botId} won the game!`);
      } else {
        console.log(`💀 Bot ${this.botId} lost the game.`);
      }
      // Cleanly disconnect after game ends
      this.abandonRoomAndDisconnect();
    });

    // Error handling
    this.socket.on('actionSubmitResult', (result) => {
      if (!result.success) {
        console.error(
          `🤖 Bot ${this.botId} action submission failed:`,
          result.error
        );
      }
    });

    this.socket.on('trustedStateResult', (result) => {
      // Treat both plain success and "already submitted" as completion
      if (result?.success) {
        this.hasSubmittedTrustedState = true;
        return;
      }

      const errorMessage: string = result?.error || '';
      console.error(
        `🤖 Bot ${this.botId} trusted state submission failed:`,
        errorMessage
      );

      // If server rejected due to phase mismatch, resume polling and allow retry
      if (errorMessage.includes('Invalid phase for trusted state submission')) {
        this.hasSubmittedTrustedState = false;
        this.startPollingForEndOfRound();
      } else if (errorMessage.includes('Game state not found')) {
        // Room/game no longer exists; stop any further submissions for this turn
        this.hasSubmittedTrustedState = true;
        this.stopPollingForEndOfRound();
        this.abandonRoomAndDisconnect();
      }
    });
  }

  /**
   * @notice Abandon current room context and disconnect the bot's socket.
   * @dev Prevents further submissions when room/game state is missing.
   */
  private abandonRoomAndDisconnect(): void {
    this.stopPollingForEndOfRound();
    if (this.matchStartTimeout) {
      clearTimeout(this.matchStartTimeout);
      this.matchStartTimeout = null;
    }
    this.hasSubmittedActions = true;
    this.hasSubmittedTrustedState = true;
    this.currentRoomId = null;

    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {}
      this.socket = null;
    }
  }

  /**
   * @notice Submits bot actions during spell casting phase
   */
  private submitActions(): void {
    if (
      !this.socket ||
      !this.currentRoomId ||
      this.gamePhase !== GamePhase.SPELL_CASTING ||
      this.hasSubmittedActions
    ) {
      console.log(
        `🤖 Bot ${this.botId} skipping action submission: phase=${this.gamePhase}, hasSubmitted=${this.hasSubmittedActions}`
      );
      return;
    }

    const actions = this.botService.generateBotActions(
      this.botId,
      this.currentState,
      this.opponentState || undefined
    );

    console.log(`🤖 Bot ${this.botId} submitting actions:`, actions);
    this.socket.emit('submitActions', {
      roomId: this.currentRoomId,
      actions,
    });

    // Mark as submitted to prevent duplicate submissions
    this.hasSubmittedActions = true;
  }

  /**
   * @notice Starts polling for END_OF_ROUND phase after spell effects
   */
  private startPollingForEndOfRound(): void {
    // Clear any existing polling interval
    if (this.endOfRoundPollingInterval) {
      clearInterval(this.endOfRoundPollingInterval);
    }

    // Poll every 500ms to attempt trusted state submission until acknowledged
    this.endOfRoundPollingInterval = setInterval(() => {
      if (this.hasSubmittedTrustedState) {
        this.stopPollingForEndOfRound();
        return;
      }

      // Attempt to submit; server will accept only when phase is END_OF_ROUND
      this.submitTrustedState();
    }, 500);
  }

  /**
   * @notice Stops polling for END_OF_ROUND phase
   */
  private stopPollingForEndOfRound(): void {
    if (this.endOfRoundPollingInterval) {
      clearInterval(this.endOfRoundPollingInterval);
      this.endOfRoundPollingInterval = null;
    }
  }

  /**
   * @notice Submits bot trusted state during end of round phase
   */
  private submitTrustedState(): void {
    if (!this.socket || !this.currentRoomId || this.hasSubmittedTrustedState) {
      return;
    }

    // For now, we'll simulate the trusted state calculation
    // In a real implementation, this would process all received actions
    const trustedState = this.botService.generateBotTrustedState(
      this.botId,
      this.currentState,
      this.lastAllActions || {}
    );

    // Update current state
    this.currentState = trustedState.publicState;

    console.log(`🤖 Bot ${this.botId} submitting trusted state:`, trustedState);
    this.socket.emit('submitTrustedState', {
      roomId: this.currentRoomId,
      trustedState,
    });

    // Do not mark submitted until server acknowledges success

    // If bot is dead (HP <= 0), report death after submitting trusted state
    try {
      const fields = trustedState.publicState.fields as any;
      let hp = Number.POSITIVE_INFINITY;
      if (typeof fields === 'string') {
        const parsed = JSON.parse(fields);
        hp = parseInt(parsed?.playerStats?.hp?.magnitude ?? '100');
      } else if (Array.isArray(fields) && fields.length > 0) {
        hp = parseInt((fields[0] as any)?.value ?? fields[0]);
      }

      if (Number.isFinite(hp) && hp <= 0) {
        console.log(`💀 Bot ${this.botId} died (hp=${hp}). Reporting death...`);
        this.socket.emit('reportDead', {
          roomId: this.currentRoomId,
          dead: {
            playerId: this.botId,
          },
        });
      }
    } catch (e) {
      console.warn(
        `⚠️ Failed to parse bot HP for death report:`,
        (e as Error).message
      );
    }
  }
}
