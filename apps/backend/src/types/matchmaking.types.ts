import { Type } from "class-transformer";
import {
  Position,
  MatchPlayerData as BaseMatchPlayerData,
  SpellCastInfo as BaseSpellCastInfo,
  MoveInfo as BaseMoveInfo,
  UserTurn as BaseUserTurn,
  MapStructure,
} from "../../../common/types/matchmaking.types";
import { Action } from "../../../common/stater";

export class TransformedMatchPlayerData implements BaseMatchPlayerData {
  playerId: string;
  health: number;
  wizardId: string;
  spells?: any[];
  map?: MapStructure;

  @Type(() => Position)
  playerPosition?: Position;

  constructor(
    playerId: string,
    health: number,
    wizardId: string,
    spells: any[],
    map: MapStructure,
  ) {
    this.playerId = playerId;
    this.health = health;
    this.wizardId = wizardId;
    this.spells = spells;
    this.map = map;
  }
}

export class TransformedSpellCastInfo implements BaseSpellCastInfo {
  spellId: number;
  targetId: string;

  @Type(() => Position)
  targetPosition: Position;

  constructor(spellId: number, targetId: string, targetPosition: Position) {
    this.spellId = spellId;
    this.targetId = targetId;
    this.targetPosition = targetPosition;
  }
}

export class TransformedMoveInfo implements BaseMoveInfo {
  @Type(() => Position)
  to: Position;

  constructor(to: Position) {
    this.to = to;
  }
}

// Old type for server side state management
export class TransformedUserTurn implements BaseUserTurn {
  playerId: string;

  @Type(() => TransformedSpellCastInfo)
  spellCastInfo: TransformedSpellCastInfo[];

  @Type(() => TransformedMoveInfo)
  moveInfo: TransformedMoveInfo | null;

  constructor(
    playerId: string,
    spellCastInfo: TransformedSpellCastInfo[],
    moveInfo: TransformedMoveInfo | null,
  ) {
    this.playerId = playerId;
    this.spellCastInfo = spellCastInfo;
    this.moveInfo = moveInfo;
  }
}

export class TransformedUserTurnV2 {
  playerId: string;

  @Type(() => Action)
  actions: Action[];

  constructor(playerId: string, actions: Action[]) {
    this.playerId = playerId;
    this.actions = actions;
  }
}
