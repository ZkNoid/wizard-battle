export type MapType = 'ally' | 'enemy';

export interface ActionInfo {
  movementDone: boolean;
  spellCastDone: boolean;
}

export interface TileHighlight {
  color: string;
}

export interface Position {
  x: number;
  y: number;
}

