// import { Socket } from "socket.io-client";

import { Action, type PublicState, UserState } from "../stater";
// Old
export enum TileType {
  VALLEY = 0,
  ROCK = 1,
  WATER = 2,
}

export enum SpellEffect {
  FRIENDLY_EFFECT = 0,
  ENEMY_EFFECT = 1,
}

export class MapStructure {
  matrix: TileType[][];

  constructor(matrix: TileType[][]) {
    this.matrix = matrix;
  }

  static random(width: number, height: number): MapStructure {
    const matrix = new Array(height)
      .fill(0)
      .map(() =>
        new Array(width)
          .fill(0)
          .map(() => (Math.random() > 0.5 ? TileType.VALLEY : TileType.ROCK)),
      );
    return new MapStructure(matrix);
  }
}

export class Position {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  manhattanDistance(other: Position): number {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }
}

export interface Impact {
  playerId: string;
  position: Position;
  spellId: string;
}

export interface Spell<ADType = any> {
  id: string;
  wizardId: string;
  requiredLevel?: number;
  cooldown: number;
  name: string;
  description: string;
  image: string;
  effectType: SpellEffect;
  effect2: (
    state: UserState,
    publicState: PublicState,
    effects: Effect[],
    castPosition: Position,
    additionalData: ADType,
  ) => void;
  cast: (position: Position, target: string, additionalData: ADType) => Action;
  imageURL?: string;
}

export class Effect {
  effectId: string;
  duration: number;
  effectData: any;

  constructor(effectId: string, duration: number, effectData: any) {
    this.effectId = effectId;
    this.duration = duration;
    this.effectData = effectData;
  }
}

export class EffectInfo {
  effectId: string;
  apply: (state: UserState, publicState: PublicState) => void;

  constructor(
    effectId: string,
    apply: (state: UserState, publicState: PublicState) => void,
  ) {
    this.effectId = effectId;
    this.apply = apply;
  }
}

export interface MatchPlayerData extends PublicState {}
// export interface MatchPlayerData {
//   playerId: string;
//   health: number;
//   wizardId: number;
//   spells?: Spell[];
//   mapStructure?: MapStructure;
//   playerPosition?: Position;
// }

export interface QueueEntry {
  socket: any;
  matchData: MatchPlayerData;
}

export interface MatchFoundResponse {
  matchId: string;
  opponent: string;
  state: MatchPlayerData[];
}

export interface NextRoundResponse {
  sessionId: string;
  currentRound: number;
  state: MatchPlayerData[];
  impacts: Impact[];
}

export interface NextRoundResponseV2 {
  sessionId: string;
  currentRound: number;
  state: MatchPlayerData[];
  actions: Action[];
}

export interface SpellCastInfo {
  spellId: number;
  targetId: string;
  targetPosition: Position;
}

export interface MoveInfo {
  to: Position;
}

export interface UserTurn {
  playerId: string;
  spellCastInfo: SpellCastInfo[];
  moveInfo: MoveInfo | null;
}

export interface GameOverResponse {
  sessionId: string;
  winners: string[];
}

export interface SubmittedActionsResponse {
  sessionId: string;
  currentRound: number;
  actions: Action[];
}

/*//////////////////////////////////////////////////////////////
                          NEW TYPES
//////////////////////////////////////////////////////////////*/

// New
// export enum TileType {
// 	"Wood",
// 	"Water",
// 	"Mountain" 
// }

export interface IMap {
	tiles: number[][]
}

export interface ISpell {
	spellId: string, 
	cooldown: number,
	active: boolean
}

export interface IPosition {
	x: number;
	y: number;
}

export interface IState {
	playerId: string; 
	wizardId: string;
	maxHP: number;
	mapStructure: IMap;
	spells: ISpell[];
	initialPosition: IPosition;
	stateCommit: any
}

// Send only public parts of setup
type IPublicState = Partial<IState>

/*//////////////////////////////////////////////////////////////
                      NEW MATCHMAKING TYPES
//////////////////////////////////////////////////////////////*/

export interface IAddToQueue {
	playerId: string;
	playerSetup: IPublicState;
	nonce: number;
	signature: any;
	setupProof: any;
}

export interface IAddToQueueResponse {
	success: boolean;
	result: string;
}

export interface IRemoveFromQueue {
	playerId: string;
	nonce: number;
	signature: any;
}

export interface IUpdateQueue {
	playersAmount: number;
	estimatedTime: number;
}

export interface IFoundMatch {
	opponentId: string;
	opponentSetup: IPublicState[];
}