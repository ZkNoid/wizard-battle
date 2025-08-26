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
  Air = 0,
  Water = 1,
  Grass = 2,
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

  const tilemap = stater?.state.map.map((elem) => +elem);

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
          tilemap: tilemap ?? [],
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
    <div className="w-290 h-150 relative">
      <div className="p-12.5 relative z-[2] flex size-full flex-col items-center">
        <span className="font-pixel text-main-gray text-3xl font-bold">
          Map Generation
        </span>
        <div className="gap-17.5 mt-6 flex flex-row">
          <div className="max-h-120 flex flex-col gap-10 overflow-scroll">
            {/* {[Tiles.Water, Tiles.Grass].map((tile, index) => (
              <Tile
                key={index}
                image={`/assets/tiles/${tile}.png`}
                title={`Tile ${index + 1}`}
                description={`Tile ${index + 1} description`}
                onClick={() => setSelectedTile(tile)}
              />
            ))} */}

            {/* For testing purposes */}
            {[...Array(33)].map((_, i) => {
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
            })}
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
                >
                  {tile === Tiles.Air ? (
                    <div className="size-full bg-gray-200 hover:bg-gray-400" />
                  ) : (
                    <Image
                      src={`/assets/tiles/${tile}.png`}
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
                    Math.random() < 0.5 ? Tiles.Water : Tiles.Grass
                  );
                  setMap(randomTilemap);
                  setOriginalTilemap(randomTilemap);
                  setHasChanges(false);

                  updateTilemap(
                    {
                      userAddress: '0x123',
                      tilemap: randomTilemap,
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
