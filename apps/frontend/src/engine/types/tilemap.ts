export enum TileType {
  Air = '',
  Water = 'water',
  Grass = 'grass',
}

export interface ITile {
  type: TileType;
  collisionType: TileType;
  position: string;
}

export interface TilemapConfig {
  width: number; // in megatiles (usually 8)
  height: number; // in megatiles (usually 8)
  tileSize: number; // in pixels
}

export interface EngineTilemapProps extends TilemapConfig {
  tilemap?: number[]; // array of tile numbers (64 elements for 8x8)
  className?: string;
  onTileClick?: (index: number) => void;
  interactive?: boolean;
}

// Constants
export const TILEMAP_SIZE = 64; // 8x8 megatiles
export const MEGA_WIDTH = 8;
export const MEGA_HEIGHT = 8;
export const SUBTILE_SIZE = 3; // 3x3 tiles in megatile
export const FULL_WIDTH = MEGA_WIDTH * SUBTILE_SIZE; // 24
export const FULL_HEIGHT = MEGA_HEIGHT * SUBTILE_SIZE; // 24

// Utility types
export type TilemapData = number[]; // array of TILEMAP_SIZE elements
export type MegatileArray = number[][]; // 2D array of megatiles

// Hooks types
export interface UseTilemapResult {
  tilemap: number[];
  setTilemap: (tilemap: number[]) => void;
  updateTile: (index: number, tileType: TileType) => void;
  clearTilemap: () => void;
  randomizeTilemap: () => void;
}
