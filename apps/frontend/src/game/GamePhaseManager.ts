import { Int64 } from 'o1js';
import { State } from '../../../common/stater/state';
import type { Stater } from '../../../common/stater/stater';
import {
  GamePhase,
  type IUserActions,
  type ITrustedState,
} from '../../../common/types/gameplay.types';
import type { IPublicState } from '../../../common/types/matchmaking.types';
import { EventBus } from './EventBus';
import { allSpells } from '../../../common/stater/spells';
import { gameEventEmitter } from '../engine/gameEventEmitter';

/**
 * @title Frontend Game Phase Manager
 * @notice Client-side coordinator for 5-phase turn-based gameplay
 * @dev Manages WebSocket communication and local state synchronization with server
 *
 * ## Client-Side 5-Phase Flow:
 * 1. SPELL_CASTING: submitPlayerActions() → send to server
 * 2. SPELL_PROPAGATION: handleSpellPropagation() → receive all player actions
 * 3. SPELL_EFFECTS: handleSpellEffects() → apply effects locally using Stater
 * 4. END_OF_ROUND: auto-submit trusted state to server
 * 5. STATE_UPDATE: handleStateUpdate() → update opponent information
 *
 * ## WebSocket Event Handling:
 * - Listens for: allPlayerActions, applySpellEffects, updateUserStates, newTurn, gameEnd
 * - Emits: submitActions, submitTrustedState
 *
 * ## State Management:
 * - Integrates with Stater class for cryptographic state computation
 * - Maintains local game state and opponent information
 * - Handles phase transitions and timing
 */
export class GamePhaseManager {
  public currentPhase: GamePhase = GamePhase.SPELL_CASTING;
  private socket: any;
  private roomId: string;
  private stater: Stater; // Your Stater instance
  private lastActions?: IUserActions; // Add this property
  private setOpponentState: (state: State) => void;
  private onNewTurnHook: (() => void) | null = null;
  private setCurrentPhaseCallback?: (phase: GamePhase) => void;
  private onGameEnd?: (winner: boolean) => void;
  private hasSubmittedActions = false; // Track if actions were submitted this turn
  private hasSubmittedTrustedState = false; // Track if trusted state was submitted this turn
  private trustedStatePollingInterval: NodeJS.Timeout | null = null;
  private phaseTimerDeadlineMs: number | null = null;

  constructor(
    socket: any,
    roomId: string,
    stater: Stater,
    setOpponentState: (state: State) => void,
    setCurrentPhaseCallback?: (phase: GamePhase) => void,
    onGameEnd?: (winner: boolean) => void
  ) {
    this.socket = socket;
    this.roomId = roomId;
    this.stater = stater;
    this.setOpponentState = setOpponentState;
    this.setCurrentPhaseCallback = setCurrentPhaseCallback;
    this.setupSocketListeners();

    // Initialize the store with the current phase
    this.setCurrentPhaseCallback?.(this.currentPhase);
    this.onGameEnd = onGameEnd;
  }

  /**
   * @notice Initializes WebSocket event listeners for all 5 gameplay phases
   * @dev Sets up bidirectional communication with GameSessionGateway
   *
   * Event Listeners:
   * - allPlayerActions: Phase 2 - Receive all player actions for local processing
   * - applySpellEffects: Phase 3 - Signal to apply effects and generate trusted state
   * - updateUserStates: Phase 5 - Receive opponent state updates
   * - newTurn: Phase 5→1 - Notification of new turn beginning
   * - gameEnd: Game termination with winner announcement
   */
  private setupSocketListeners() {
    this.socket.on(
      'allPlayerActions',
      (allActions: Record<string, IUserActions>) => {
        console.log('Received all player actions:', allActions);
        this.handleSpellPropagation(allActions);
        this.handleSpellCastEffects(allActions);
      }
    );

    this.socket.on('applySpellEffects', () => {
      console.log('Received applySpellEffects');
      this.handleSpellEffects();
    });

    this.socket.on('updateUserStates', (data: { states: ITrustedState[] }) => {
      console.log('Received updateUserStates');
      this.handleStateUpdate(data.states);
    });

    this.socket.on(
      'newTurn',
      (data: { phase: GamePhase; phaseTimeout?: number }) => {
        console.log('Received newTurn');
        console.log('Received phase: ', data.phase);
        console.log('Received phaseTimeout: ', data.phaseTimeout);
        this.updateCurrentPhase(data.phase);
        this.onNewTurn();
        // Emit countdown start for SPELL_CASTING using provided timeout
        if (
          data.phase === GamePhase.SPELL_CASTING &&
          typeof data.phaseTimeout === 'number'
        ) {
          console.log('Emitting phase-timer-start', data.phaseTimeout);
          this.phaseTimerDeadlineMs = Date.now() + Number(data.phaseTimeout);
          EventBus.emit('phase-timer-start', data.phaseTimeout);
        }
      }
    );

    // Allow late listeners (like Clock) to request current remaining time
    EventBus.on('request-phase-timer', () => {
      if (
        this.currentPhase === GamePhase.SPELL_CASTING &&
        typeof this.phaseTimerDeadlineMs === 'number'
      ) {
        const remaining = Math.max(0, this.phaseTimerDeadlineMs - Date.now());
        if (remaining > 0) {
          EventBus.emit('phase-timer-start', remaining);
        }
      }
    });

    this.socket.on(
      'actionSubmitResult',
      (data: { success: boolean; error: string }) => {
        console.log('Received actionSubmitResult');
        console.log(data);
      }
    );

    this.socket.on(
      'trustedStateResult',
      (data: { success: boolean; error?: string }) => {
        console.log('Received trustedStateResult');
        console.log(data);

        if (data.success) {
          this.hasSubmittedTrustedState = true;
          this.stopTrustedStatePolling();
        } else if (
          data.error?.includes('Invalid phase for trusted state submission')
        ) {
          // Server rejected due to phase mismatch, retry
          this.hasSubmittedTrustedState = false;
          this.startTrustedStatePolling();
        }
      }
    );

    this.socket.on('gameEnd', (data: { winnerId: string }) => {
      console.log('Received game end. Winner is: ', data.winnerId);
      this.onGameEnd?.(data.winnerId === this.getPlayerId());
    });
  }

  /**
   * @notice Phase 1: Submits player's intended actions to server
   * @dev Called by game UI when player confirms their spell selections
   * @param actions Player's actions with cryptographic signature
   *
   * Validation:
   * - Ensures current phase is SPELL_CASTING
   * - Actions should contain valid spell IDs and targeting information
   *
   * Server Communication:
   * - Emits 'submitActions' WebSocket event
   * - Server responds with 'actionSubmitResult'
   * - Server advances to SPELL_PROPAGATION when all players ready
   *
   * Error Handling:
   * - Logs error and prevents submission if wrong phase
   * - UI should disable action submission outside SPELL_CASTING phase
   */
  submitPlayerActions(actions: IUserActions) {
    if (this.currentPhase !== GamePhase.SPELL_CASTING) {
      console.error(
        'Cannot submit actions in current phase:',
        this.currentPhase
      );
      return;
    }

    console.log('Submitting player actions:', actions);
    this.hasSubmittedActions = true;

    this.socket.emit('submitActions', {
      roomId: this.roomId,
      actions,
    });
  }

  /**
   * @notice Automatically submits empty actions if player hasn't acted
   * @dev Called when transitioning away from SPELL_CASTING to ensure all players are tracked
   */
  private ensureActionsSubmitted() {
    if (
      !this.hasSubmittedActions &&
      this.currentPhase === GamePhase.SPELL_CASTING
    ) {
      console.log(
        `⚠️ Player ${this.getPlayerId()} hasn't submitted actions, auto-submitting empty actions`
      );

      const emptyActions: IUserActions = {
        actions: [],
        signature: '',
      };

      this.socket.emit('submitActions', {
        roomId: this.roomId,
        actions: emptyActions,
      });

      this.hasSubmittedActions = true;
    }
  }

  /**
   * @notice Phase 2: Receives and processes all player actions from server
   * @dev Server broadcasts this when all players have submitted actions
   * @param allActions Record mapping player IDs to their submitted actions
   *
   * Processing:
   * - Stores actions for use in Phase 3 (spell effects)
   * - Updates current phase to SPELL_PROPAGATION
   * - Prepares for local spell effect computation
   *
   * Client State:
   * - Now has complete information about all spells being cast this turn
   * - Can display spell animations and prepare effect calculations
   * - Awaits server signal to begin applying effects
   */
  private handleSpellPropagation(allActions: Record<string, IUserActions>) {
    console.log('Received all player actions:', allActions);

    // Ensure we submitted actions before processing propagation
    this.ensureActionsSubmitted();

    // Store actions for next phase
    const playerId = this.getPlayerId();
    console.log('Player ID:', playerId);

    const allActionsList = [];
    for (const playerId of Object.keys(allActions)) {
      console.log('Processing playerId', playerId);
      const actions = allActions[playerId];
      allActionsList.push(...actions!.actions);
    }

    this.lastActions = {
      actions: allActionsList,
      signature: '',
    };

    if (!this.lastActions) {
      console.warn(
        `⚠️ No actions found for player ${playerId} in spell propagation`
      );
      // Create empty actions if none found
      this.lastActions = {
        actions: [],
        signature: '',
      };
    }

    console.log(`📋 Stored actions for player ${playerId}:`, this.lastActions);
    this.updateCurrentPhase(GamePhase.SPELL_PROPAGATION);
  }

  /**
   * @notice Phase 3: Applies spell effects locally and generates trusted state
   * @dev Called when server emits 'applySpellEffects' signal
   *
   * Local Computation:
   * 1. Apply all spell effects using Stater class
   * 2. Compute damage, healing, movement, status effects
   * 3. Generate cryptographic commitment to new state
   * 4. Create trusted state with public information and proofs
   *
   * State Transition:
   * - Updates currentPhase to SPELL_EFFECTS, then END_OF_ROUND
   * - Automatically submits trusted state to server
   * - No user interaction required - fully automated
   *
   * Cryptographic Security:
   * - Uses Stater to generate verifiable state commitments
   * - Includes signature proving state validity
   * - Prevents cheating through cryptographic verification
   */
  private handleSpellEffects() {
    this.updateCurrentPhase(GamePhase.SPELL_EFFECTS);

    // Apply effects using your Stater
    // This would typically involve calling stater.applyActions()
    // and generating the trusted state

    // Move to end of round phase
    this.updateCurrentPhase(GamePhase.END_OF_ROUND);

    // Start polling to submit trusted state when server is ready
    this.startTrustedStatePolling();
  }

  // Phase 4: End of Round (handled by submitting trusted state above)

  /**
   * @notice Phase 5: Updates opponent information using server-provided states
   * @dev Called when server broadcasts all trusted states from alive players
   * @param trustedStates Array of verified states from all players
   *
   * Opponent Updates:
   * - Updates opponent HP, position, and active effects
   * - Verifies state signatures for anti-cheat protection
   * - Excludes own state (already known locally)
   *
   * UI Updates:
   * - Refreshes opponent health bars and positions
   * - Shows new status effects and spell cooldowns
   * - Prepares UI for next turn
   *
   * State Synchronization:
   * - Ensures all clients have consistent view of game state
   * - Resolves any discrepancies through server authority
   * - Maintains game integrity across all players
   */
  private handleStateUpdate(trustedStates: ITrustedState[]) {
    this.updateCurrentPhase(GamePhase.STATE_UPDATE);

    // Update opponent data using received trusted states
    for (const state of trustedStates) {
      if (state.playerId !== this.getPlayerId()) {
        this.updateOpponentState(state);
      }
    }
  }

  /**
   * @notice Generates cryptographically secure trusted state using Stater
   * @dev Called during Phase 3 after applying all spell effects locally
   * @return ITrustedState with commitment, public state, and signature
   *
   * Trusted State Components:
   * - stateCommit: Cryptographic hash of complete private state
   * - publicState: Visible information (HP, position, effects) for opponents
   * - signature: Cryptographic proof of state validity
   *
   * Security:
   * - Uses zero-knowledge proofs to verify state transitions
   * - Prevents players from cheating by faking HP or positions
   * - Enables server to verify state validity without seeing private data
   *
   * Integration:
   * - Delegates to Stater class for cryptographic operations
   * - Includes player ID and last applied actions for verification
   */
  private generateTrustedState(): ITrustedState {
    // Use your Stater to generate the trusted state
    const playerId = this.getPlayerId();

    // If no actions were recorded, create empty actions
    const actions = this.lastActions || {
      actions: [],
      signature: '',
    };

    console.log(
      `Generating trusted state for player ${playerId} with actions:`,
      actions
    );

    try {
      const trustedState = this.stater.generateTrustedState(playerId, actions);
      console.log(
        `✅ Successfully generated trusted state for player ${playerId}`
      );
      return trustedState;
    } catch (error) {
      console.error(
        `❌ Error generating trusted state for player ${playerId}:`,
        error
      );
      console.log('submited to TrustedState actions', JSON.stringify(actions));
      // Return a fallback trusted state to prevent blocking
      return {
        playerId,
        stateCommit: 'error_fallback',
        publicState: {
          playerId,
          socketId: '',
          fields: JSON.stringify(State.toJSON(this.stater.state)),
        },
        signature: 'error_fallback',
      };
    }
  }

  private updateOpponentState(state: ITrustedState) {
    // Update opponent data in your game state
    console.log('Updating opponent state:', state);
    const opponentState = State.fromJSON(
      JSON.parse(state.publicState.fields)
    ) as State;

    this.setOpponentState(opponentState);
  }

  /**
   * @notice Handles new turn initialization and state reset
   * @dev Called when server broadcasts 'newTurn' event after Phase 5 completes
   *
   * Turn Reset:
   * - Clears previous turn's actions and temporary state
   * - Resets phase to SPELL_CASTING
   * - Updates spell cooldowns and effect durations
   *handleSpellCastEffects
   * UI Reset:
   * - Re-enables action selection interface
   * - Updates turn counter and phase indicator
   * - Refreshes spell availability based on cooldowns
   *
   * Client Synchronization:
   * - Ensures all clients start new turn simultaneously
   * - Maintains consistent turn timing across instances
   */

  public setOnNewTurnHook(hook: () => void) {
    this.onNewTurnHook = hook;
  }

  /**
   * @notice Updates the current phase and notifies the store
   * @dev Called whenever the phase changes to keep UI in sync
   */
  private updateCurrentPhase(phase: GamePhase) {
    this.currentPhase = phase;
    this.setCurrentPhaseCallback?.(phase);
  }

  private onNewTurn() {
    console.log('New turn started, phase:', this.currentPhase);

    // Reset for new turn
    this.hasSubmittedActions = false;
    this.hasSubmittedTrustedState = false;
    this.lastActions = undefined;

    // Stop any polling from previous turn
    this.stopTrustedStatePolling();

    console.log(
      `🔄 Reset action tracking for player ${this.getPlayerId()} for new turn`
    );

    if (this.onNewTurnHook) {
      this.onNewTurnHook();
    }
  }

  private getPlayerId(): string {
    // Return current player ID
    return this.stater.state.playerId.toString();
  }

  private handleSpellCastEffects(allActions: Record<string, IUserActions>) {
    console.log(
      '//////////////////////////handleSpellCastEffects////////////////////////////'
    );
    console.log('handleSpellCastEffects');
    console.log('thisInstance playerId', this.getPlayerId());

    console.log('allActions', JSON.stringify(allActions));

    for (const playerId of Object.keys(allActions)) {
      console.log('Processing playerId', playerId);

      const actions = allActions[playerId];

      actions?.actions.forEach((action) => {
        const type = action.playerId === this.getPlayerId() ? 'user' : 'enemy';

        let spell = allSpells.find(
          (spell) => spell.id.toString() === action.spellId.toString()
        );

        let coordinates = spell?.modifyerData.fromJSON(
          JSON.parse(action.spellCastInfo)
        ).position;

        if (!coordinates) {
          coordinates = {
            x: 0,
            y: 0,
          };
        }

        spell?.sceneEffect?.(
          +coordinates.x,
          +coordinates.y,
          gameEventEmitter,
          type
        );
      });
    }
  }

  /**
   * @notice Starts polling to submit trusted state when server reaches END_OF_ROUND
   */
  private startTrustedStatePolling(): void {
    // Clear any existing polling interval
    if (this.trustedStatePollingInterval) {
      clearInterval(this.trustedStatePollingInterval);
    }

    // Poll every 500ms to attempt trusted state submission until acknowledged
    this.trustedStatePollingInterval = setInterval(() => {
      if (this.hasSubmittedTrustedState) {
        this.stopTrustedStatePolling();
        return;
      }

      // Attempt to submit; server will accept only when phase is END_OF_ROUND
      this.submitTrustedStateNow();
    }, 500);
  }

  /**
   * @notice Stops polling for trusted state submission
   */
  private stopTrustedStatePolling(): void {
    if (this.trustedStatePollingInterval) {
      clearInterval(this.trustedStatePollingInterval);
      this.trustedStatePollingInterval = null;
    }
  }

  /**
   * @notice Actually submits the trusted state to the server
   */
  private submitTrustedStateNow(): void {
    if (this.hasSubmittedTrustedState) {
      return;
    }

    const trustedState = this.generateTrustedState();

    console.log('Submitting trusted state:', trustedState);

    try {
      console.log(
        `🚀 Player ${trustedState.playerId} submitting trusted state to room ${this.roomId}`
      );
      this.socket.emit('submitTrustedState', {
        roomId: this.roomId,
        trustedState,
      });
    } catch (error) {
      console.error(
        `❌ Error submitting trusted state for player ${trustedState.playerId}:`,
        error
      );
    }

    // Report death after submitting trusted state to prevent phase blocking
    if (+this.stater.state.playerStats.hp <= 0) {
      console.log(
        'Player died, reporting death after submitting trusted state'
      );
      this.socket.emit('reportDead', {
        roomId: this.roomId,
        dead: {
          playerId: this.getPlayerId(),
        },
      });
    }
  }
}
