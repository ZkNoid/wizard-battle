import { CircuitString } from 'o1js';

// Grid configuration
export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 8;
export const TILE_SIZE = 60;

// Default positions
export const DEFAULT_USER_POSITION = { x: 3, y: 3 };
export const DEFAULT_ENEMY_POSITION = { x: 3, y: 3 };

// Timing
export const SCENE_READY_DELAY = 100;

// Effect IDs
export const SPECTRAL_PROJECTION_EFFECT_ID = CircuitString.fromString(
  'SpectralProjectionReturn'
).hash();
export const DECOY_EFFECT_ID = CircuitString.fromString('Decoy').hash();

// Entity IDs
export const SPECTRAL_ENTITY_ID = 'spectral-user';
export const OPPONENT_SPECTRAL_ENTITY_ID = 'spectral-enemy';
export const DECOY_ENTITY_ID = 'decoy-user';

// Highlight colors
export const MOVEMENT_HIGHLIGHT_COLOR = 'rgba(100, 255, 100, 0.5)';
export const SPELL_HIGHLIGHT_COLOR = 'rgba(255, 100, 100, 0.5)';

