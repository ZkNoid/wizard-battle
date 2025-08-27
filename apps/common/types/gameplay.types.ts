import type { IPublicState } from "./matchmaking.types";

/**
 * @title 5-Phase Turn-Based Gameplay Types
 * @notice Defines interfaces and types for the turn-based gameplay system
 * @dev Implements a 5-phase turn system: Spell Casting → Spell Propagation → Spell Effects → End of Round → State Update
 */

/**
 * @notice Represents a single action a player wants to perform in a turn
 * @dev Generic type T allows for spell-specific additional data
 * @param playerId The unique identifier of the player performing the action
 * @param spellId The unique identifier of the spell being cast
 * @param spellCastInfo Additional data required for the spell (position, target, etc.)
 */
export interface IUserAction<T = any> {
    playerId: string;
    spellId: string;
    spellCastInfo: T; // Depends on skill
  }
  
/**
 * @notice Container for all actions a player submits in Phase 1 (Spell Casting)
 * @dev Includes cryptographic signature for action verification
 * @param actions Array of actions the player wants to perform this turn
 * @param signature Cryptographic signature to verify action authenticity
 */
export interface IUserActions<T = any> {
    actions: IUserAction<T>[];
    signature: any;
  }
/**
 * @notice Player's computed state after applying spell effects in Phase 3
 * @dev Submitted in Phase 4 (End of Round) after player processes all actions locally
 * @param playerId The unique identifier of the player
 * @param stateCommit Cryptographic commitment to the player's private state
 * @param publicState The publicly visible portion of the player's state (HP, position, effects)
 * @param signature Cryptographic signature proving state validity
 */
export interface ITrustedState {
    playerId: string;
    stateCommit: string;
    publicState: IPublicState;
    signature: any;
  }
  
/**
 * @notice Collection of all player states distributed in Phase 5 (State Update)
 * @dev Server broadcasts this to all players so they can update opponent information
 * @param states Array of trusted states from all alive players
 */
export interface IUpdateUserStates {
    states: ITrustedState[];
  }
  
/**
 * @notice Notification that a player has been eliminated from the game
 * @dev Triggers win condition check - if only one player remains, game ends
 * @param playerId The unique identifier of the eliminated player
 */
export interface IDead {
    playerId: string;
  }
  
/**
 * @notice Game termination event sent when win conditions are met
 * @dev Broadcast to all players when only one player remains alive
 * @param winnerId The unique identifier of the winning player
 */
export interface IGameEnd {
    winnerId: string;
  }
  
/**
 * @notice Enumeration of the 5 phases in each game turn
 * @dev Each phase has specific timing and player interactions
 * SPELL_CASTING: Players submit their intended actions
 * SPELL_PROPAGATION: Server broadcasts all actions to all players  
 * SPELL_EFFECTS: Players apply actions locally and compute new state
 * END_OF_ROUND: Players submit their computed trusted states
 * STATE_UPDATE: Server broadcasts all states for opponent updates
 */
export enum GamePhase {
    SPELL_CASTING = 'spell_casting',
    SPELL_PROPAGATION = 'spell_propagation', 
    SPELL_EFFECTS = 'spell_effects',
    END_OF_ROUND = 'end_of_round',
    STATE_UPDATE = 'state_update'
  }
  
/**
 * @notice Metadata about the current game turn and phase
 * @dev Used for client synchronization and timeout management
 * @param turnId Sequential identifier for the current turn (starts at 0)
 * @param phase Current phase within the turn
 * @param timeRemaining Milliseconds remaining in current phase (for timeout handling)
 * @param playersReady Array of player IDs who have completed the current phase
 */
export interface IGameTurn {
  turnId: number;
  phase: GamePhase;
  timeRemaining: number;
  playersReady: string[];
}

/*//////////////////////////////////////////////////////////////
                        TRANSFORMED CLASSES
//////////////////////////////////////////////////////////////*/

export class TransformedUserAction<T = any> implements IUserAction<T> {
  playerId: string;
  spellId: string;
  spellCastInfo: T;

  constructor(playerId: string, spellId: string, spellCastInfo: T) {
    this.playerId = playerId;
    this.spellId = spellId;
    this.spellCastInfo = spellCastInfo;
  }
}

export class TransformedUserActions<T = any> implements IUserActions<T> {
  actions: IUserAction<T>[];
  signature: any;

  constructor(actions: IUserAction<T>[], signature: any) {
    this.actions = actions;
    this.signature = signature;
  }
}

export class TransformedTrustedState implements ITrustedState {
  playerId: string;
  stateCommit: string;
  publicState: IPublicState;
  signature: any;

  constructor(playerId: string, stateCommit: string, publicState: IPublicState, signature: any) {
    this.playerId = playerId;
    this.stateCommit = stateCommit;
    this.publicState = publicState;
    this.signature = signature;
  }
}

export class TransformedUpdateUserStates implements IUpdateUserStates {
  states: ITrustedState[];

  constructor(states: ITrustedState[]) {
    this.states = states;
  }
}

export class TransformedDead implements IDead {
  playerId: string;

  constructor(playerId: string) {
    this.playerId = playerId;
  }
}

export class TransformedGameEnd implements IGameEnd {
  winnerId: string;

  constructor(winnerId: string) {
    this.winnerId = winnerId;
  }
}

export class TransformedGameTurn implements IGameTurn {
  turnId: number;
  phase: GamePhase;
  timeRemaining: number;
  playersReady: string[];

  constructor(turnId: number, phase: GamePhase, timeRemaining: number, playersReady: string[]) {
    this.turnId = turnId;
    this.phase = phase;
    this.timeRemaining = timeRemaining;
    this.playersReady = playersReady;
  }
}