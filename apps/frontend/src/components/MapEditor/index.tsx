'use client';

import { useEffect, useState } from 'react';
import { Background } from './assets/background';
import { Tile } from './Tile';
import Image from 'next/image';
import { api } from '@/trpc/react';
import { SaveSlot } from './SaveSlot';
import { TrashBtn } from './assets/trash-btn';
import { RandomBtn } from './assets/random-btn';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { Button } from '../shared/Button';

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

export default function MapEditor() {
  const { stater, setMap } = useUserInformationStore();
  const [selectedTile, setSelectedTile] = useState<Tiles>(Tiles.Air);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'1' | '2' | '3' | '4'>('1');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalTilemap, setOriginalTilemap] = useState<Tiles[]>([
    ...Array(64).fill(Tiles.Air),
  ]);

  const utils = api.useUtils();

  const { mutate: updateTilemap } = api.tilemap.updateTilemap.useMutation();
  const { data: tilemapData } = api.tilemap.getTilemap.useQuery({
    userAddress: '0x123',
    slot: activeSlot,
  });

  const staterTilemap = stater?.state.map.map((elem) => +elem);

  const [tilemap, setTilemap] = useState<ITile[]>(
    Array(64).fill({
      type: Tiles.Air,
      collisionType: Tiles.Air,
      position: '',
    })
  );

  const getTileImage = (tile: ITile) => {
    let image = tile.type + '';
    if (tile.collisionType !== Tiles.Air) {
      image += `-${tile.collisionType}`;
      if (tile.position !== '') {
        image += `-${tile.position}`;
      }
    }
    return `/assets/tiles/${image}.png`;
  };

  const getTile = (tilemap: ITile[], x: number, y: number) => {
    const tile = tilemap?.[x + y * 8];
    if (!tile)
      return { type: 'air', collisionType: 'air', position: `${x},${y}` };
    return tile;
  };

  const getNewTile = (tilemap: ITile[], type: Tiles, x: number, y: number) => {
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

    if (collisionType === Tiles.Air) {
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

  const getNewTilemap = (tilemap: ITile[]) => {
    const newTilemap = [...tilemap];
    for (let i = 0; i < 64; i++) {
      newTilemap[i] = getNewTile(
        newTilemap,
        tilemap[i]!.type,
        i % 8,
        Math.floor(i / 8)
      );
    }
    return newTilemap;
  };

  useEffect(() => {
    if (tilemapData) {
      setMap(tilemapData);
      setOriginalTilemap(tilemapData);
      setHasChanges(false);
    }
  }, [tilemapData]);

  const handleTileDraw = (index: number) => {
    if (selectedTile === tilemap?.[index]) return;

    const newTilemap = [...(tilemap ?? [])];
    newTilemap[index] = selectedTile;
    setMap(newTilemap);

    // Check if there are changes
    const hasChangesNow = newTilemap.some((t, i) => t !== originalTilemap[i]);
    setHasChanges(hasChangesNow);
  };

  // Handler for starting drawing
  const handleMouseDown = (index: number) => {
    setIsDrawing(true);
    handleTileDraw(index);
  };

  // Handler for drawing when moving the mouse
  const handleMouseEnter = (index: number) => {
    if (isDrawing) {
      handleTileDraw(index);
    }
  };

  // Handler for ending drawing
  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDrawing(false);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleSlotChange = (newSlot: '1' | '2' | '3' | '4') => {
    // Save the current slot only if there are changes
    if (hasChanges && activeSlot !== newSlot) {
      updateTilemap(
        {
          userAddress: '0x123',
          tilemap: tilemap.map((tile) =>
            tile.type === Tiles.Air ? 0 : tile.type === Tiles.Water ? 1 : 2
          ),
          slot: activeSlot,
        },
        {
          onSuccess: () => {
            utils.tilemap.getTilemap.refetch();
          },
        }
      );
    }

    setActiveSlot(newSlot);
  };

  return (
    <div className="w-290 h-170 relative">
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

            {/* For testing purposes */}
            {/* {[...Array(33)].map((_, i) => {
              const tile = i + 1; // Remove 0 tile
              return (
                <Tile
                  key={tile}
                  image={`/assets/tiles/${tile}.png`}
                  title={`Tile ${tile}`}
                  description={`Tile ${tile} description`}
                  onClick={() => setSelectedTile(tile)}
                />
              );
            })} */}
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-8 grid-rows-8">
              {tilemap?.map((tile, index) => (
                <button
                  key={index}
                  onMouseDown={() => handleMouseDown(index)}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseUp={handleMouseUp}
                  className="size-15 cursor-pointer select-none"
                  style={{ userSelect: 'none' }}
                  onClick={() => {
                    if (selectedTile === tile.type) return;

                    const newTilemap = [...tilemap];
                    newTilemap[index] = {
                      type: selectedTile,
                      collisionType: Tiles.Air,
                      position: '',
                    };
                    setTilemap(getNewTilemap(newTilemap));

                    setMap(
                      newTilemap.map((tile) =>
                        tile.type === Tiles.Air
                          ? 0
                          : tile.type === Tiles.Water
                            ? 1
                            : 2
                      )
                    );

                    // Check if there are changes
                    const hasChangesNow = newTilemap.some(
                      (t, i) => t.type !== originalTilemap[i]
                    );
                    setHasChanges(hasChangesNow);
                  }}
                  className="size-15 cursor-pointer"
                >
                  {tile.type === Tiles.Air ? (
                    <div className="size-full bg-gray-200 hover:bg-gray-400" />
                  ) : (
                    <Image
                      src={getTileImage(tile)}
                      alt="Tile"
                      width={60}
                      height={60}
                      className="size-full"
                      draggable={false}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex w-full flex-row items-center justify-end gap-2">
              <Button
                text="Save"
                variant="gray"
                onClick={() => {
                  updateTilemap(
                    {
                      userAddress: '0x123',
                      tilemap: tilemap ?? [],
                      slot: activeSlot,
                    },
                    {
                      onSuccess: () => {
                        utils.tilemap.getTilemap.refetch();
                      },
                    }
                  );
                }}
                className="mr-auto h-full w-[70%]"
              />
              <RandomBtn
                className="size-12 cursor-pointer transition-transform duration-300 hover:scale-110"
                onClick={() => {
                  const randomTilemap = Array.from({ length: 64 }, () =>
                    Math.random() < 0.5
                      ? {
                          type: Tiles.Water,
                          collisionType: Tiles.Air,
                          position: '',
                        }
                      : {
                          type: Tiles.Grass,
                          collisionType: Tiles.Grass,
                          position: '',
                        }
                  );
                  setTilemap(getNewTilemap(randomTilemap));

                  setMap(
                    randomTilemap.map((tile) =>
                      tile.type === Tiles.Air
                        ? 0
                        : tile.type === Tiles.Water
                          ? 1
                          : 2
                    )
                  );
                  setOriginalTilemap(randomTilemap.map((tile) => tile.type));
                  setHasChanges(false);

                  updateTilemap(
                    {
                      userAddress: '0x123',
                      tilemap: randomTilemap.map((tile) =>
                        tile.type === Tiles.Air
                          ? 0
                          : tile.type === Tiles.Water
                            ? 1
                            : 2
                      ),
                      slot: activeSlot,
                    },
                    {
                      onSuccess: () => {
                        utils.tilemap.getTilemap.refetch();
                      },
                    }
                  );
                }}
              />
              <TrashBtn
                className="size-12 cursor-pointer transition-transform duration-300 hover:scale-110"
                onClick={() => {
                  const emptyTilemap = Array(64).fill(Tiles.Air);
                  setMap(emptyTilemap);
                  setOriginalTilemap(emptyTilemap);
                  setHasChanges(false);

                  updateTilemap(
                    {
                      userAddress: '0x123',
                      tilemap: emptyTilemap,
                      slot: activeSlot,
                    },
                    {
                      onSuccess: () => {
                        utils.tilemap.getTilemap.refetch();
                      },
                    }
                  );
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <SaveSlot
        slot={'1'}
        className="absolute top-10 z-0 lg:!-right-2 2xl:!-right-20"
        isActive={activeSlot === '1'}
        onClick={() => handleSlotChange('1')}
      />
      <SaveSlot
        slot={'2'}
        className="top-50 absolute z-0 lg:!-right-2 2xl:!-right-20"
        isActive={activeSlot === '2'}
        onClick={() => handleSlotChange('2')}
      />
      <SaveSlot
        slot={'3'}
        className="top-90 absolute z-0 lg:!-right-2 2xl:!-right-20"
        isActive={activeSlot === '3'}
        onClick={() => handleSlotChange('3')}
      />
      <SaveSlot
        slot={'4'}
        className="top-130 absolute z-0 lg:!-right-2 2xl:!-right-20"
        isActive={activeSlot === '4'}
        onClick={() => handleSlotChange('4')}
      />
      <Background className="w-290 h-170 absolute inset-0 z-[1]" />
    </div>
  );
}
