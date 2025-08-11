// import { Type } from "class-transformer";
// import {
//   Position,
//   MatchPlayerData as BaseMatchPlayerData,
//   SpellCastInfo as BaseSpellCastInfo,
//   MoveInfo as BaseMoveInfo,
//   UserTurn as BaseUserTurn,
//   MapStructure,
// } from "../../../common/types/matchmaking.types";
// import { Action } from "../../../common/stater";
import {
  IAddToQueue,
  IAddToQueueResponse,
  IRemoveFromQueue,
  IUpdateQueue,
  IFoundMatch,
  IPublicState,
} from "../../../common/types/matchmaking.types";

    /*//////////////////////////////////////////////////////////////
                              NEW CLASSES
    //////////////////////////////////////////////////////////////*/

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
      opponentId: string;
      opponentSetup: IPublicState[];

      constructor(opponentId: string, opponentSetup: IPublicState[]) {
        this.opponentId = opponentId;
        this.opponentSetup = opponentSetup;
      }
    }

    /*//////////////////////////////////////////////////////////////
                               OLD CLASSES
    //////////////////////////////////////////////////////////////*/

// export class TransformedMatchPlayerData implements BaseMatchPlayerData {
//   playerId: string;
//   health: number;
//   wizardId: string;
//   spells?: any[];
//   map?: MapStructure;

//   @Type(() => Position)
//   playerPosition?: Position;

//   constructor(
//     playerId: string,
//     health: number,
//     wizardId: string,
//     spells: any[],
//     map: MapStructure,
//   ) {
//     this.playerId = playerId;
//     this.health = health;
//     this.wizardId = wizardId;
//     this.spells = spells;
//     this.map = map;
//   }
// }

// export class TransformedSpellCastInfo implements BaseSpellCastInfo {
//   spellId: number;
//   targetId: string;

//   @Type(() => Position)
//   targetPosition: Position;

//   constructor(spellId: number, targetId: string, targetPosition: Position) {
//     this.spellId = spellId;
//     this.targetId = targetId;
//     this.targetPosition = targetPosition;
//   }
// }

// export class TransformedMoveInfo implements BaseMoveInfo {
//   @Type(() => Position)
//   to: Position;

//   constructor(to: Position) {
//     this.to = to;
//   }
// }

// // Old type for server side state management
// export class TransformedUserTurn implements BaseUserTurn {
//   playerId: string;

//   @Type(() => TransformedSpellCastInfo)
//   spellCastInfo: TransformedSpellCastInfo[];

//   @Type(() => TransformedMoveInfo)
//   moveInfo: TransformedMoveInfo | null;

//   constructor(
//     playerId: string,
//     spellCastInfo: TransformedSpellCastInfo[],
//     moveInfo: TransformedMoveInfo | null,
//   ) {
//     this.playerId = playerId;
//     this.spellCastInfo = spellCastInfo;
//     this.moveInfo = moveInfo;
//   }
// }

// export class TransformedUserTurnV2 {
//   playerId: string;

//   @Type(() => Action)
//   actions: Action[];

//   constructor(playerId: string, actions: Action[]) {
//     this.playerId = playerId;
//     this.actions = actions;
//   }
// }