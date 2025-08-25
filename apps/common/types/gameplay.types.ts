import { IPublicState } from "./matchmaking.types";

export interface IUserAction<T = any> {
    playerId: string;
    spellId: string;
    spellCastInfo: T; // Depends on skill
  }
  
  export interface IUserActions<T = any> {
    actions: IUserAction<T>[];
    signature: any;
  }
  export interface ITrustedState {
    playerId: string;
    stateCommit: string;
    publicState: IPublicState;
    signature: any;
  }
  
  export interface IUpdateUserStates {
    states: ITrustedState[];
  }
  
  export interface IDead {
    playerId: string;
  }
  
  export interface IGameEnd {
    winnerId: string;
  }
  
  export enum GamePhase {
    SPELL_CASTING = 'spell_casting',
    SPELL_PROPAGATION = 'spell_propagation', 
    SPELL_EFFECTS = 'spell_effects',
    END_OF_ROUND = 'end_of_round',
    STATE_UPDATE = 'state_update'
  }
  
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