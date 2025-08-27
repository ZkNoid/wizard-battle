'use client';

import { type CSSProperties, useEffect, useState, useCallback } from 'react';
import { Background } from './assets/background';
import { Tile } from './Tile';
import Image from 'next/image';
import { api } from '@/trpc/react';
import { SaveSlot } from './SaveSlot';
import { TrashBtn } from './assets/trash-btn';
import { RandomBtn } from './assets/random-btn';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { Button } from '../shared/Button';
import { useMinaAppkit } from 'mina-appkit';

// Constants
const TILEMAP_SIZE = 64;
const MEGA_W = 8;
const MEGA_H = 8;
const S = 3; // inner tile size per megatile dimension
const W = MEGA_W * S; // 24
const H = MEGA_H * S; // 24

enum Tiles {
  Air = '',
  Water = 'water',
  Grass = 'grass',
}

interface ITile {
  type: Tiles;
  collisionType: Tiles;
  position: string;
}

class Megatile {
  tiles: ITile[] = [];

  constructor(tiles: ITile[]) {
    this.tiles = tiles;
  }

  getMainTile() {
    return this.tiles[5]!;
  }

  getType() {
    return this.getMainTile().type;
  }
}

// Utility functions
const tileToNumber = (tile: Tiles): number => {
  switch (tile) {
    case Tiles.Air:
      return 0;
    case Tiles.Water:
      return 1;
    case Tiles.Grass:
      return 2;
    default:
      return 0;
  }
};

const numberToTile = (num: number): Tiles => {
  switch (num) {
    case 0:
      return Tiles.Air;
    case 1:
      return Tiles.Water;
    case 2:
      return Tiles.Grass;
    default:
      return Tiles.Air;
  }
};

const getTilemapFromMegatile = (tilemap: Megatile[]): Tiles[] => {
  return tilemap.map((tile) => tile.getType());
};

const getNumberTilemapFromMegatile = (tilemap: Megatile[]): number[] => {
  return tilemap.map((tile) => tileToNumber(tile.getType()));
};

const createEmptyTilemap = (): Tiles[] => Array(TILEMAP_SIZE).fill(Tiles.Air);

const createEmptyMegatile = (): Megatile =>
  new Megatile(
    Array(9).fill({
      type: Tiles.Air,
      collisionType: Tiles.Air,
      position: '',
    })
  );

const getTileImage = (tile: ITile): string => {
  let image = tile.type + '';
  if (tile.collisionType) {
    image += `-${tile.collisionType}`;
    if (tile.position) {
      image += `-${tile.position}`;
    }
  }
  return `/assets/tiles/${image}.png`;
};

const getTile = (tiles: ITile[], x: number, y: number): ITile => {
  if (x < 0 || x >= W || y < 0 || y >= H) {
    return { type: Tiles.Air, collisionType: Tiles.Air, position: '' };
  }
  return (
    tiles[x + y * W] ?? {
      type: Tiles.Air,
      collisionType: Tiles.Air,
      position: '',
    }
  );
};

const getNewTile = (
  tilemap: ITile[],
  type: Tiles,
  x: number,
  y: number
): ITile => {
  // Find Collision Type
  let collisionType = null;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const neighbor = getTile(tilemap, x + i, y + j);
      if (neighbor && neighbor.type !== Tiles.Air && neighbor.type !== type) {
        collisionType = neighbor.type;
      }
    }
  }

  if (type === Tiles.Grass) {
    return {
      type,
      collisionType: Tiles.Air,
      position: '',
    };
  }

  // Find Collision Position
  const topCollision = getTile(tilemap, x, y - 1).type === collisionType;
  const bottomCollision = getTile(tilemap, x, y + 1).type === collisionType;
  const leftCollision = getTile(tilemap, x - 1, y).type === collisionType;
  const rightCollision = getTile(tilemap, x + 1, y).type === collisionType;
  const hasCollision =
    topCollision || bottomCollision || leftCollision || rightCollision;
  const tlCornerCollision =
    !hasCollision && getTile(tilemap, x - 1, y - 1).type === collisionType;
  const trCornerCollision =
    !hasCollision && getTile(tilemap, x + 1, y - 1).type === collisionType;
  const blCornerCollision =
    !hasCollision && getTile(tilemap, x - 1, y + 1).type === collisionType;
  const brCornerCollision =
    !hasCollision && getTile(tilemap, x + 1, y + 1).type === collisionType;

  let position = '';
  if (topCollision) position += 't';
  if (bottomCollision) position += 'b';
  if (leftCollision) position += 'l';
  if (rightCollision) position += 'r';
  if (tlCornerCollision) position += 'corner-tl';
  if (trCornerCollision) position += 'corner-tr';
  if (blCornerCollision) position += 'corner-bl';
  if (brCornerCollision) position += 'corner-br';

  return {
    type,
    collisionType: collisionType as Tiles,
    position: position,
  };
};

const toIndex = (I: number, J: number, l: number, k: number): number =>
  (I * S + l) * W + (J * S + k); // global (24×24) index

const updateTilemap2 = (tilemap: Megatile[]): Megatile[] => {
  // 1) Flatten 8×8 megatiles -> 24×24 tiles
  const tiles: ITile[] = new Array(W * H);
  for (let I = 0; I < MEGA_H; I++) {
    for (let J = 0; J < MEGA_W; J++) {
      const m = tilemap[I * MEGA_W + J]!;
      // m.tiles is row-major 3×3: [r0c0,r0c1,r0c2, r1c0,...]
      for (let l = 0; l < S; l++) {
        for (let k = 0; k < S; k++) {
          tiles[toIndex(I, J, l, k)] = m.tiles[l * S + k]!;
        }
      }
    }
  }

  // 2) (Optional) produce a NEW tiles array if neighbors matter
  const nextTiles: ITile[] = new Array(W * H);
  for (let i = 0; i < W * H; i++) {
    nextTiles[i] = getNewTile(
      tiles, // read from ORIGINAL grid
      tiles[i]!.type,
      i % W,
      Math.floor(i / W)
    );
  }

  // 3) Rebuild 8×8 megatiles from 24×24 tiles
  const newTilemap: Megatile[] = [];
  for (let I = 0; I < MEGA_H; I++) {
    for (let J = 0; J < MEGA_W; J++) {
      const nine: ITile[] = [];
      for (let l = 0; l < S; l++) {
        const rowStart = (I * S + l) * W + J * S;
        nine.push(...nextTiles.slice(rowStart, rowStart + S));
      }
      newTilemap.push(new Megatile(nine));
    }
  }

  return newTilemap;
};

const createRandomTilemap = (): Megatile[] =>
  Array.from({ length: TILEMAP_SIZE }, () =>
    Math.random() < 0.5
      ? new Megatile(
          Array(9).fill({
            type: Tiles.Water,
            collisionType: Tiles.Air,
            position: '',
          })
        )
      : new Megatile(
          Array(9).fill({
            type: Tiles.Grass,
            collisionType: Tiles.Air,
            position: '',
          })
        )
  );

export default function MapEditor() {
  const { stater, setMap } = useUserInformationStore();
  const [selectedTile, setSelectedTile] = useState<Tiles>(Tiles.Air);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'1' | '2' | '3' | '4'>('1');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalTilemap, setOriginalTilemap] =
    useState<Tiles[]>(createEmptyTilemap());

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

  const [tilemap, setTilemap] = useState<Megatile[]>(
    Array(TILEMAP_SIZE)
      .fill(null)
      .map(() => createEmptyMegatile())
  );

  // Unified save function
  const saveTilemapData = useCallback(
    (
      tilemapToSave: Megatile[],
      slot: '1' | '2' | '3' | '4',
      userAddress?: string
    ) => {
      const numberTilemap = getNumberTilemapFromMegatile(tilemapToSave);

      if (userAddress) {
        // Save to API if wallet is connected
        updateTilemap(
          {
            userAddress,
            tilemap: numberTilemap,
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
    (newTilemap: Megatile[]) => {
      const updatedTilemap = updateTilemap2(newTilemap);
      setTilemap(updatedTilemap);
      setMap(getNumberTilemapFromMegatile(updatedTilemap));

      // Check if there are changes
      const hasChangesNow = updatedTilemap.some(
        (t, i) => t.getType() !== originalTilemap[i]
      );
      setHasChanges(hasChangesNow);
    },
    [setMap, originalTilemap]
  );

  useEffect(() => {
    if (tilemapData) {
      setMap(tilemapData);
      setOriginalTilemap(tilemapData.map(numberToTile));
      setHasChanges(false);
    }
  }, [tilemapData, setMap]);

  const handleTileDraw = (index: number) => {
    if (selectedTile === tilemap?.[index]?.getType()) return;

    const newTilemap = [...(tilemap ?? [])];
    for (let i = 0; i < 9; i++) {
      newTilemap[index]!.tiles[i] = {
        type: selectedTile,
        collisionType: newTilemap[index]!.tiles[i]!.collisionType,
        position: newTilemap[index]!.tiles[i]!.position,
      };
    }
    updateTilemapState(newTilemap);
  };

  // Unified event handlers
  const handleMouseDown = useCallback(
    (index: number, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDrawing(true);
      handleTileDraw(index);
    },
    [handleTileDraw]
  );

  const handleMouseEnter = useCallback(
    (index: number, event: React.MouseEvent) => {
      if (isDrawing) {
        event.preventDefault();
        handleTileDraw(index);
      }
    },
    [isDrawing, handleTileDraw]
  );

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDrawing(false);
  }, []);

  const preventDefault = useCallback(
    (event: React.MouseEvent | React.DragEvent) => {
      event.preventDefault();
      return false;
    },
    []
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDrawing(false);
    const handleGlobalMouseLeave = () => setIsDrawing(false);
    const handleGlobalDragStart = (event: DragEvent) => {
      event.preventDefault();
      return false;
    };
    const handleGlobalSelectStart = (event: Event) => {
      if (isDrawing) {
        event.preventDefault();
        return false;
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mouseleave', handleGlobalMouseLeave);
    document.addEventListener('dragstart', handleGlobalDragStart);
    document.addEventListener('selectstart', handleGlobalSelectStart);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseLeave);
      document.removeEventListener('dragstart', handleGlobalDragStart);
      document.removeEventListener('selectstart', handleGlobalSelectStart);
    };
  }, [isDrawing]);

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
    setOriginalTilemap(getTilemapFromMegatile(tilemap));
    setHasChanges(false);
  }, [tilemap, activeSlot, address, saveTilemapData]);

  const handleRandom = useCallback(() => {
    const randomTilemap = createRandomTilemap();
    updateTilemapState(randomTilemap);
    setOriginalTilemap(getTilemapFromMegatile(randomTilemap));
    setHasChanges(false);
    saveTilemapData(randomTilemap, activeSlot, address);
  }, [updateTilemapState, activeSlot, address, saveTilemapData]);

  const handleClear = useCallback(() => {
    const emptyTilemap = createEmptyTilemap();
    setMap(emptyTilemap.map(tileToNumber));
    setOriginalTilemap(emptyTilemap);
    setHasChanges(false);

    if (address) {
      saveTilemapData(
        Array(TILEMAP_SIZE)
          .fill(null)
          .map(() => createEmptyMegatile()),
        activeSlot,
        address
      );
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
            {[Tiles.Water, Tiles.Grass].map((tile, index) => (
              <Tile
                key={index}
                image={`/assets/tiles/${tile}.png`}
                title={`Tile ${index + 1}`}
                description={`Tile ${index + 1} description`}
                onClick={() => setSelectedTile(tile)}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-8 grid-rows-8">
              {tilemap?.map((megatile, index) => (
                <button
                  key={index}
                  onMouseDown={(event) => handleMouseDown(index, event)}
                  onMouseEnter={(event) => handleMouseEnter(index, event)}
                  onMouseUp={handleMouseUp}
                  onDragStart={preventDefault}
                  onContextMenu={preventDefault}
                  className="size-15 cursor-pointer select-none"
                  style={{ userSelect: 'none' }}
                >
                  {megatile.getMainTile().type === Tiles.Air ? (
                    <div className="size-full bg-gray-200 hover:bg-gray-400" />
                  ) : (
                    <div className="grid grid-cols-3 grid-rows-3">
                      {megatile.tiles.map((tile, tileIndex) => (
                        <Image
                          key={tileIndex}
                          src={getTileImage(tile)}
                          alt="Tile"
                          width={60}
                          height={60}
                          className="size-full"
                          draggable={false}
                          style={{
                            pointerEvents: 'none',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                          }}
                          onDragStart={(e: React.DragEvent) =>
                            e.preventDefault()
                          }
                        />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex w-full flex-row items-center justify-end gap-2">
              <Button
                text="Save"
                variant="gray"
                onClick={handleSave}
                className="mr-auto h-full w-[70%]"
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
