// import { Socket } from "socket.io-client";

import { Field } from "o1js";

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
  fields: Field[]; // Contain State.toFields(userState)
  // wizardId: string;
  // maxHP: number;
  // mapStructure: IMap;
  // spells: ISpell[];
  // initialPosition: IPosition;
  // stateCommit: any;
  // level: number;
}

// Send only public parts of setup
export type IPublicState = IState;

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
  roomId: string;
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
  fields: Field[];

  constructor(socketId: string, playerId: string, fields: Field[]) {
    this.socketId = socketId;
    this.playerId = playerId;
    this.fields = fields;
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

  constructor(
    roomId: string,
    opponentId: string,
    opponentSetup: IPublicState[],
  ) {
    this.roomId = roomId;
    this.opponentId = opponentId;
    this.opponentSetup = opponentSetup;
  }
}
