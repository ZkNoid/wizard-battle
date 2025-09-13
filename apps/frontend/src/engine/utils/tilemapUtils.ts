import { MEGA_WIDTH, MEGA_HEIGHT } from '../types/tilemap';

/**
 * Utils for working with tilemap coordinates
 */

// Conversion of tilemap coordinates to a one-dimensional array index
export function tilemapCoordsToIndex(x: number, y: number): number {
  if (x < 0 || x >= MEGA_WIDTH || y < 0 || y >= MEGA_HEIGHT) {
    throw new Error(
      `Invalid tilemap coordinates: x=${x}, y=${y}. Must be 0-${MEGA_WIDTH - 1} for x and 0-${MEGA_HEIGHT - 1} for y.`
    );
  }
  return y * MEGA_WIDTH + x;
}

// Conversion of a one-dimensional array index to tilemap coordinates
export function indexToTilemapCoords(index: number): { x: number; y: number } {
  if (index < 0 || index >= MEGA_WIDTH * MEGA_HEIGHT) {
    throw new Error(
      `Invalid tilemap index: ${index}. Must be 0-${MEGA_WIDTH * MEGA_HEIGHT - 1}.`
    );
  }

  const x = index % MEGA_WIDTH;
  const y = Math.floor(index / MEGA_WIDTH);
  return { x, y };
}

// Checking if the coordinates are within the tilemap boundaries
export function isValidTilemapPosition(x: number, y: number): boolean {
  return x >= 0 && x < MEGA_WIDTH && y >= 0 && y < MEGA_HEIGHT;
}

// Getting adjacent positions (for movement)
export function getAdjacentPositions(
  x: number,
  y: number
): Array<{ x: number; y: number }> {
  const adjacent = [
    { x: x - 1, y }, // left
    { x: x + 1, y }, // right
    { x, y: y - 1 }, // up
    { x, y: y + 1 }, // down
  ];

  return adjacent.filter((pos) => isValidTilemapPosition(pos.x, pos.y));
}

// Calculation of the distance between two positions (Manhattan distance)
export function getManhattanDistance(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number }
): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}
