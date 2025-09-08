import { TileType } from '../types/tilemap';

export function useEngine() {
  // Utility functions
  const tileTypeToNumber = (tileType: TileType): number => {
    switch (tileType) {
      case TileType.Air:
        return 0;
      case TileType.Water:
        return 1;
      case TileType.Grass:
        return 2;
      default:
        return 0;
    }
  };

  const numberToTileType = (num: number): TileType => {
    switch (num) {
      case 0:
        return TileType.Air;
      case 1:
        return TileType.Water;
      case 2:
        return TileType.Grass;
      default:
        return TileType.Air;
    }
  };

  return {
    tileTypeToNumber,
    numberToTileType,
  };
}
