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

  const [tilemap, setTilemap] = useState<Megatile[]>(
    [...Array(64)].map(
      (_, i) =>
        new Megatile([
          ...Array(9).fill({
            type: Tiles.Air,
            collisionType: Tiles.Air,
            position: '',
          }),
        ])
    )
  );

  const getTileImage = (tile: ITile) => {
    let image = tile.type + '';
    if (tile.collisionType) {
      image += `-${tile.collisionType}`;
      if (tile.position) {
        image += `-${tile.position}`;
      }
    }
    return `/assets/tiles/${image}.png`;
  };

  const getTile = (tiles: ITile[], x: number, y: number) => {
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

  const MEGA_W = 8;
  const MEGA_H = 8;
  const S = 3; // inner tile size per megatile dimension
  const W = MEGA_W * S; // 24
  const H = MEGA_H * S; // 24

  const toIndex = (I: number, J: number, l: number, k: number) =>
    (I * S + l) * W + (J * S + k); // global (24×24) index

  function updateTilemap2(tilemap: Megatile[]) {
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

    // 3) Rebuild 8×8 megatiles from 24×24 tiles (the part that was wrong)
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
  }

  useEffect(() => {
    if (tilemapData) {
      setMap(tilemapData);
      setOriginalTilemap(tilemapData);
      setHasChanges(false);
    }
  }, [tilemapData]);

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
    setMap(
      newTilemap.map((tile) =>
        tile.getType() === Tiles.Air
          ? 0
          : tile.getType() === Tiles.Water
            ? 1
            : 2
      )
    );

    // Check if there are changes
    const hasChangesNow = newTilemap.some(
      (t, i) => t.getType() !== originalTilemap[i]
    );
    setHasChanges(hasChangesNow);
    setTilemap(updateTilemap2(newTilemap));
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
            tile.getType() === Tiles.Air
              ? 0
              : tile.getType() === Tiles.Water
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
              {tilemap?.map((megatile, index) => (
                <button
                  key={index}
                  onMouseDown={() => handleMouseDown(index)}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseUp={handleMouseUp}
                  className="size-15 cursor-pointer select-none"
                  style={{ userSelect: 'none' }}
                  onClick={() => {
                    // let mainTile = megatile.getMainTile();
                    // if (selectedTile === mainTile.type) return;
                    // const newTilemap = [...tilemap];
                    // for (let i = 0; i < 9; i++) {
                    //   newTilemap[index]!.tiles[i] = {
                    //     type: selectedTile,
                    //     collisionType: mainTile.collisionType,
                    //     position: mainTile.position,
                    //   };
                    // }
                    // setTilemap(newTilemap);
                    // setTilemap(updateTilemap2(newTilemap));
                    // setMap(
                    //   newTilemap.map((tile) =>
                    //     tile.getType() === Tiles.Air
                    //       ? 0
                    //       : tile.getType() === Tiles.Water
                    //         ? 1
                    //         : 2
                    //   )
                    // );
                    // Check if there are changes
                    // const hasChangesNow = newTilemap.some(
                    //   (t, i) => t.getType() !== originalTilemap[i]
                    // );
                    // setHasChanges(hasChangesNow);
                  }}
                >
                  {megatile.getMainTile().type === Tiles.Air ? (
                    <div className="size-full bg-gray-200 hover:bg-gray-400" />
                  ) : (
                    <div className="grid grid-cols-3 grid-rows-3">
                      {megatile.tiles.map((tile, index) => (
                        <Image
                          key={index}
                          src={getTileImage(tile)}
                          alt="Tile"
                          width={60}
                          height={60}
                          className="size-full"
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
                onClick={() => {
                  updateTilemap(
                    {
                      userAddress: '0x123',
                      tilemap: tilemap.map((tile) =>
                        tile.getType() === Tiles.Air
                          ? 0
                          : tile.getType() === Tiles.Water
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
                className="mr-auto h-full w-[70%]"
              />
              <RandomBtn
                className="size-12 cursor-pointer transition-transform duration-300 hover:scale-110"
                onClick={() => {
                  const randomTilemap = Array.from({ length: 64 }, () =>
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
                  setTilemap(updateTilemap2(randomTilemap));

                  setMap(
                    randomTilemap.map((tile) =>
                      tile.getType() === Tiles.Air
                        ? 0
                        : tile.getType() === Tiles.Water
                          ? 1
                          : 2
                    )
                  );
                  setOriginalTilemap(
                    randomTilemap.map((tile) => tile.getType())
                  );
                  setHasChanges(false);

                  updateTilemap(
                    {
                      userAddress: '0x123',
                      tilemap: randomTilemap.map((tile) =>
                        tile.getType() === Tiles.Air
                          ? 0
                          : tile.getType() === Tiles.Water
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
