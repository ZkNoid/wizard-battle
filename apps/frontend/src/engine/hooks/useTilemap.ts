import { useCallback, useState } from 'react';
import { type TilemapData } from '../types/tilemap';
import { TILEMAP_SIZE } from '../types/tilemap';
import { TileType } from '../types/tilemap';
import { useEngine } from './useEngine';

export function useTilemap(initialTilemap?: TilemapData) {
  const { tileTypeToNumber } = useEngine();
  const [tilemap, setTilemap] = useState<TilemapData>(
    initialTilemap ?? Array(TILEMAP_SIZE).fill(0)
  );

  const updateTile = useCallback((index: number, tileType: TileType) => {
    if (index < 0 || index >= TILEMAP_SIZE) return;

    const tileNumber = tileTypeToNumber(tileType);
    setTilemap((prev) => {
      const newTilemap = [...prev];
      newTilemap[index] = tileNumber;
      return newTilemap;
    });
  }, []);

  const clearTilemap = useCallback(() => {
    setTilemap(Array(TILEMAP_SIZE).fill(0));
  }, []);

  const randomizeTilemap = useCallback(() => {
    const randomTilemap = Array.from({ length: TILEMAP_SIZE }, () =>
      Math.random() < 0.3 ? 1 : Math.random() < 0.6 ? 2 : 0
    );
    setTilemap(randomTilemap);
  }, []);

  return {
    tilemap,
    setTilemap,
    updateTile,
    clearTilemap,
    randomizeTilemap,
  };
}
