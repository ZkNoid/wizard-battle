export { Tilemap } from './components/Tilemap';

export { useEngine } from './hooks/useEngine';
export { useTilemap } from './hooks/useTilemap';

export { EntityOverlay } from './components/EntityOverlay';
export { RedSquare } from './entities/RedSquare';
export { BlueSquare } from './entities/BlueSquare';

export type { IEntity } from './types/IEntity';

export type {
  ITile,
  TilemapConfig,
  EngineTilemapProps,
  TilemapData,
  MegatileArray,
  UseTilemapResult,
} from './types/tilemap';

export { TileType } from './types/tilemap';

export {
  TILEMAP_SIZE,
  MEGA_WIDTH,
  MEGA_HEIGHT,
  SUBTILE_SIZE,
  FULL_WIDTH,
  FULL_HEIGHT,
} from './types/tilemap';

export { gameEventEmitter, type MoveEntityEvent } from './gameEventEmitter';
