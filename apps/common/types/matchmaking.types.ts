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

/*//////////////////////////////////////////////////////////////
                          NEW TYPES
//////////////////////////////////////////////////////////////*/

// New
export enum TileTypeNew {
  "Wood",
  "Water",
  "Mountain",
}

export interface IMap {
  tiles: number[][];
}

export interface ISpell {
  spellId: string;
  cooldown: number;
  active: boolean;
}

export interface IPosition {
  x: number;
  y: number;
}

export interface IState {
  socketId: string;
  playerId: string;
  wizardId: string;
  maxHP: number;
  mapStructure: IMap;
  spells: ISpell[];
  initialPosition: IPosition;
  stateCommit: any;
  level: number;
}

// Send only public parts of setup
export type IPublicState = Partial<IState>;

/*//////////////////////////////////////////////////////////////
                      NEW MATCHMAKING TYPES
//////////////////////////////////////////////////////////////*/
/* Find a game queue */
export interface IAddToQueue {
  playerId: string;
  playerSetup: IPublicState;
  nonce: number;
  signature: any;
  setupProof: any;
}

/* Waits for a match */
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
  roomId:string;
  opponentId: string;
  opponentSetup: IPublicState[];
}

 /*//////////////////////////////////////////////////////////////
                              NEW CLASSES
    //////////////////////////////////////////////////////////////*/

export class TransformedSpell implements ISpell {
  spellId: string;
  cooldown: number;
  active: boolean;

  constructor(spellId: string, cooldown: number, active: boolean) {
    this.spellId = spellId;
    this.cooldown = cooldown;
    this.active = active;
  }
}

export class TransformedMap implements IMap {
  tiles: number[][];

  constructor(tiles: number[][]) {
    this.tiles = tiles;
  }
}

export class TransformedPlayerSetup implements IPublicState {
  socketId: string;
  playerId: string;
  wizardId: string;
  maxHP: number;
  mapStructure: IMap;
  spells: ISpell[];
  level: number;

  constructor(socketId: string, playerId: string, wizardId: string, maxHP: number, mapStructure: IMap, spells: ISpell[], level: number) {
    this.socketId = socketId;
    this.playerId = playerId;
    this.wizardId = wizardId;
    this.maxHP = maxHP;
    this.mapStructure = mapStructure;
    this.spells = spells;
    this.level = level;
  }
}

export class TransformedAddToQueue implements IAddToQueue {
  playerId: string;
  playerSetup: IPublicState;
  nonce: number;
  signature: any;
  setupProof: any;

  constructor(
    playerId: string,
    playerSetup: IPublicState,
    nonce: number,
    signature: any,
    setupProof: any,
  ) {
    this.playerId = playerId;
    this.playerSetup = playerSetup;
    this.nonce = nonce;
    this.signature = signature;
    this.setupProof = setupProof;
  }
}

export class TransformedAddToQueueResponse implements IAddToQueueResponse {
  success: boolean;
  result: string;

  constructor(success: boolean, result: string) {
    this.success = success;
    this.result = result;
  }
}

export class TransformedRemoveFromQueue implements IRemoveFromQueue {
  playerId: string;
  nonce: number;
  signature: any;

  constructor(playerId: string, nonce: number, signature: any) {
    this.playerId = playerId;
    this.nonce = nonce;
    this.signature = signature;
  }
}

export class TransformedUpdateQueue implements IUpdateQueue {
  playersAmount: number;
  estimatedTime: number;

  constructor(playersAmount: number, estimatedTime: number) {
    this.playersAmount = playersAmount;
    this.estimatedTime = estimatedTime;
  }
}

export class TransformedFoundMatch implements IFoundMatch {
  roomId: string;
  opponentId: string;
  opponentSetup: IPublicState[];

  constructor(roomId: string, opponentId: string, opponentSetup: IPublicState[]) {
    this.roomId = roomId;
    this.opponentId = opponentId;
    this.opponentSetup = opponentSetup;
  }
}