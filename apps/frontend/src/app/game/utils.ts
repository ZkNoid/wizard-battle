import { GRID_WIDTH } from './constants';

/**
 * Convert a flat array index to grid coordinates
 */
export function indexToCoordinates(index: number): { x: number; y: number } {
  const x = index % GRID_WIDTH;
  const y = Math.floor(index / GRID_WIDTH);
  return { x, y };
}

/**
 * Convert grid coordinates to a flat array index
 */
export function coordinatesToIndex(x: number, y: number): number {
  return y * GRID_WIDTH + x;
}

/**
 * Check if coordinates are within the grid bounds
 */
export function isInBounds(
  x: number,
  y: number,
  width: number = GRID_WIDTH,
  height: number = GRID_WIDTH
): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Calculate Manhattan distance between two points
 */
export function manhattanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

