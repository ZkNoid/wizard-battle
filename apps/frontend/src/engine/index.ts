export { Tilemap } from './components/Tilemap';

export { useEngine } from './hooks/useEngine';
export { useTilemap } from './hooks/useTilemap';
export { useAnimatedEntity } from './hooks/useAnimatedEntity';

export { EntityOverlay } from './components/EntityOverlay';
export { AnimatedCanvas } from './components/AnimatedCanvas';
export { RedSquare } from './entities/RedSquare';
export { BlueSquare } from './entities/BlueSquare';
export { AnimatedWizard } from './entities/AnimatedWizard';

export type { IEntity } from './types/IEntity';
export { EntityType } from './types/IEntity';

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

export {
  gameEventEmitter,
  type MoveEntityEvent,
  type PlayAnimationEvent,
  type StopAnimationEvent,
} from './gameEventEmitter';

export type {
  Animation,
  SpriteFrame,
  SpritesheetData,
} from './types/animation';
export {
  loadAnimation,
  loadSpritesheet,
  loadSpritesheetImage,
  createAnimation,
} from './utils/animationLoader';
