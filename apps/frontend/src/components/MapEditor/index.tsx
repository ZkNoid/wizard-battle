'use client';

import { useEffect, useState, useCallback } from 'react';
import { Background } from './assets/background';
import { Tile } from './Tile';
import { api } from '@/trpc/react';
import { SaveSlot } from './SaveSlot';
import { TrashBtn } from './assets/trash-btn';
import { RandomBtn } from './assets/random-btn';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { Button } from '../shared/Button';
import { useMinaAppkit } from 'mina-appkit';
import { ALL_TILES } from '@/lib/constants/tiles';
import {
  Tilemap,
  useEngine,
  TileType,
  TILEMAP_SIZE,
  MEGA_WIDTH,
  MEGA_HEIGHT,
} from '@/engine';

// Utility functions (using from engine)
const createRandomTilemap = (): number[] => {
  const tilemap = Array(TILEMAP_SIZE).fill(2); // Start with all grass

  // Generate water clusters
  const waterTiles = Math.floor(TILEMAP_SIZE * 0.2); // 20% water
  const waterClusters = Math.floor(waterTiles / 3); // ~3 tiles per cluster

  for (let i = 0; i < waterClusters; i++) {
    // Random starting position
    const startX = Math.floor(Math.random() * MEGA_WIDTH);
    const startY = Math.floor(Math.random() * MEGA_HEIGHT);
    const startIndex = startY * MEGA_WIDTH + startX;

    // Create cluster around starting position
    const clusterSize = Math.min(
      3 + Math.floor(Math.random() * 3),
      waterTiles - i * 3
    );
    const visited = new Set<number>();
    const queue = [startIndex];
    let placed = 0;

    while (queue.length > 0 && placed < clusterSize) {
      const currentIndex = queue.shift()!;
      if (visited.has(currentIndex) || tilemap[currentIndex] !== 2) continue;

      visited.add(currentIndex);
      tilemap[currentIndex] = 1; // Water
      placed++;

      // Add adjacent tiles to queue
      const x = currentIndex % MEGA_WIDTH;
      const y = Math.floor(currentIndex / MEGA_WIDTH);

      // Check all 8 directions
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const newX = x + dx;
          const newY = y + dy;
          if (
            newX >= 0 &&
            newX < MEGA_WIDTH &&
            newY >= 0 &&
            newY < MEGA_HEIGHT
          ) {
            const newIndex = newY * MEGA_WIDTH + newX;
            if (!visited.has(newIndex) && tilemap[newIndex] === 2) {
              queue.push(newIndex);
            }
          }
        }
      }
    }
  }

  // Fill remaining with forest (30%)
  const forestTiles = Math.floor(TILEMAP_SIZE * 0.3);
  let forestPlaced = 0;

  // Create array of grass tile indices and shuffle it
  const grassIndices = [];
  for (let i = 0; i < TILEMAP_SIZE; i++) {
    if (tilemap[i] === 2) {
      grassIndices.push(i);
    }
  }

  // Shuffle the grass indices randomly
  for (let i = grassIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp: number = grassIndices[i]!;
    grassIndices[i] = grassIndices[j]!;
    grassIndices[j] = temp;
  }

  // Place forest on random grass tiles
  for (let i = 0; i < Math.min(forestTiles, grassIndices.length); i++) {
    const grassIndex = grassIndices[i];
    if (grassIndex !== undefined) {
      tilemap[grassIndex] = 3; // Forest
      forestPlaced++;
    }
  }

  return tilemap;
};

export default function MapEditor() {
  const { setMap } = useUserInformationStore();
  const { tileTypeToNumber } = useEngine();
  const [selectedTile, setSelectedTile] = useState<TileType>(TileType.Air);
  const [activeSlot, setActiveSlot] = useState<'1' | '2' | '3' | '4'>('1');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalTilemap, setOriginalTilemap] = useState<number[]>(
    Array(TILEMAP_SIZE).fill(0)
  );
  const [tilemap, setTilemap] = useState<number[]>(Array(TILEMAP_SIZE).fill(0));
  const [isDrawing, setIsDrawing] = useState(false);

  const { address } = useMinaAppkit();
  const utils = api.useUtils();

  const { mutate: updateTilemap } = api.tilemap.updateTilemap.useMutation();
  const { data: tilemapData } = api.tilemap.getTilemap.useQuery(
    {
      userAddress: address ?? '',
      slot: activeSlot,
    },
    {
      enabled: !!address,
    }
  );

  // Unified save function
  const saveTilemapData = useCallback(
    (
      tilemapToSave: number[],
      slot: '1' | '2' | '3' | '4',
      userAddress?: string
    ) => {
      if (userAddress) {
        // Save to API if wallet is connected
        updateTilemap(
          {
            userAddress,
            tilemap: tilemapToSave,
            slot,
          },
          {
            onSuccess: () => {
              utils.tilemap.getTilemap.refetch();
            },
          }
        );
      }
    },
    [updateTilemap, utils.tilemap.getTilemap]
  );

  // Unified tilemap update function
  const updateTilemapState = useCallback(
    (newTilemap: number[]) => {
      setTilemap(newTilemap);
      setMap(newTilemap);

      // Check if there are changes
      const hasChangesNow = newTilemap.some(
        (tile, i) => tile !== originalTilemap[i]
      );
      setHasChanges(hasChangesNow);
    },
    [setMap, originalTilemap]
  );

  useEffect(() => {
    if (tilemapData) {
      setMap(tilemapData);
      setTilemap(tilemapData);
      setOriginalTilemap(tilemapData);
      setHasChanges(false);
    }
  }, [tilemapData, setMap]);

  // Add global mouseup event listener to stop drawing when mouse leaves the tilemap
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDrawing(false);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleTileDraw = useCallback(
    (index: number) => {
      const tileNumber = tileTypeToNumber(selectedTile);
      if (tileNumber === tilemap[index]) return;

      const newTilemap = [...tilemap];
      newTilemap[index] = tileNumber;
      updateTilemapState(newTilemap);
    },
    [selectedTile, tilemap, tileTypeToNumber, updateTilemapState]
  );

  // Simple tile click handler
  const handleTileClick = useCallback(
    (index: number) => {
      handleTileDraw(index);
    },
    [handleTileDraw]
  );

  // Brush painting handlers
  const handleMouseDown = useCallback(
    (index: number) => {
      setIsDrawing(true);
      handleTileDraw(index);
    },
    [handleTileDraw]
  );

  const handleMouseEnter = useCallback(
    (index: number) => {
      if (isDrawing) {
        handleTileDraw(index);
      }
    },
    [isDrawing, handleTileDraw]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleSlotChange = useCallback(
    (newSlot: '1' | '2' | '3' | '4') => {
      // Save the current slot if there are changes
      if (hasChanges && activeSlot !== newSlot) {
        saveTilemapData(tilemap, activeSlot, address);
      }
      setActiveSlot(newSlot);
    },
    [hasChanges, activeSlot, tilemap, address, saveTilemapData]
  );

  const handleSave = useCallback(() => {
    saveTilemapData(tilemap, activeSlot, address);
    setOriginalTilemap([...tilemap]);
    setHasChanges(false);
  }, [tilemap, activeSlot, address, saveTilemapData]);

  const handleRandom = useCallback(() => {
    const randomTilemap = createRandomTilemap();
    updateTilemapState(randomTilemap);
    setOriginalTilemap([...randomTilemap]);
    setHasChanges(false);
    saveTilemapData(randomTilemap, activeSlot, address);
  }, [updateTilemapState, activeSlot, address, saveTilemapData]);

  const handleClear = useCallback(() => {
    const emptyTilemap = Array(TILEMAP_SIZE).fill(0);
    setMap(emptyTilemap);
    setTilemap(emptyTilemap);
    setOriginalTilemap(emptyTilemap);
    setHasChanges(false);

    if (address) {
      saveTilemapData(emptyTilemap, activeSlot, address);
    }
  }, [setMap, address, activeSlot, saveTilemapData]);

  const saveSlots = ['1', '2', '3', '4'] as const;
  const saveSlotPositions = ['top-10', 'top-50', 'top-90', 'top-130'] as const;

  return (
    <div className="w-290 h-150 relative">
      <div className="p-12.5 relative z-[2] flex size-full flex-col items-center">
        <span className="font-pixel text-main-gray text-3xl font-bold">
          Map Generation
        </span>
        <div className="gap-17.5 mt-6 flex flex-row">
          <div className="max-h-120 flex flex-col gap-10 overflow-scroll">
            {[TileType.Water, TileType.Grass, TileType.Forest].map(
              (tile, index) => (
                <Tile
                  key={index}
                  image={`/assets/tiles/${tile}.png`}
                  title={ALL_TILES[index]!.name}
                  description={ALL_TILES[index]!.description}
                  onClick={() => setSelectedTile(tile)}
                />
              )
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Tilemap
              width={MEGA_WIDTH}
              height={MEGA_HEIGHT}
              tileSize={60}
              tilemap={tilemap}
              onTileClick={handleTileClick}
              onTileMouseDown={handleMouseDown}
              onTileMouseEnter={handleMouseEnter}
              onTileMouseUp={handleMouseUp}
              className="h-120 w-120"
            />
            <div className="flex w-full flex-row items-center justify-end gap-2">
              <Button
                text="Save"
                variant="gray"
                onClick={handleSave}
                className="h-12.5 -ml-10 mr-auto w-60"
              />
              <RandomBtn
                className="size-12 cursor-pointer transition-transform duration-300 hover:scale-110"
                onClick={handleRandom}
              />
              <TrashBtn
                className="size-12 cursor-pointer transition-transform duration-300 hover:scale-110"
                onClick={handleClear}
              />
            </div>
          </div>
        </div>
      </div>
      {saveSlots.map((slot, index) => (
        <SaveSlot
          key={slot}
          slot={slot}
          className={`absolute z-0 lg:!-right-2 2xl:!-right-20 ${saveSlotPositions[index]}`}
          isActive={activeSlot === slot}
          onClick={() => handleSlotChange(slot)}
        />
      ))}
      <Background className="w-290 h-170 absolute inset-0 z-[1]" />
    </div>
  );
}
