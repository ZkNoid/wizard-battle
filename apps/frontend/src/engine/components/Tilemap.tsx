import { useEffect, useState } from 'react';
import Image from 'next/image';

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

const createEmptyMegatile = (): Megatile =>
  new Megatile(
    Array(9).fill({
      type: Tiles.Air,
      collisionType: Tiles.Air,
      position: '',
    })
  );

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
  // Find collision type
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

  // Find collision position
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
  // 1) Unpack 8×8 megatiles -> 24×24 tiles
  const tiles: ITile[] = new Array(W * H);
  for (let I = 0; I < MEGA_H; I++) {
    for (let J = 0; J < MEGA_W; J++) {
      const m = tilemap[I * MEGA_W + J]!;
      for (let l = 0; l < S; l++) {
        for (let k = 0; k < S; k++) {
          tiles[toIndex(I, J, l, k)] = m.tiles[l * S + k]!;
        }
      }
    }
  }

  // 2) Create new array of tiles with neighbors
  const nextTiles: ITile[] = new Array(W * H);
  for (let i = 0; i < W * H; i++) {
    nextTiles[i] = getNewTile(tiles, tiles[i]!.type, i % W, Math.floor(i / W));
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

export interface TilemapProps {
  width: number; // in tiles (megatiles)
  height: number; // in tiles (megatiles)
  tileSize: number; // in pixels
  tilemap?: number[]; // array of tile numbers
  className?: string;
  onTileClick?: (index: number) => void;
}

export function Tilemap({
  width = MEGA_W,
  height = MEGA_H,
  tileSize = 60,
  tilemap = [],
  className = '',
  onTileClick,
}: TilemapProps) {
  const [megatiles, setMegatiles] = useState<Megatile[]>(
    Array(TILEMAP_SIZE)
      .fill(null)
      .map(() => createEmptyMegatile())
  );

  // Convert numerical tilemap to megatiles
  useEffect(() => {
    if (tilemap.length > 0) {
      const newMegatiles = tilemap.map((tileNumber) => {
        const tileType = numberToTile(tileNumber);
        return new Megatile(
          Array(9).fill({
            type: tileType,
            collisionType: Tiles.Air,
            position: '',
          })
        );
      });

      // Update tilemap with collisions
      const updatedMegatiles = updateTilemap2(newMegatiles);
      setMegatiles(updatedMegatiles);
    }
  }, [tilemap]);

  const handleTileClick = (index: number) => {
    if (onTileClick) {
      onTileClick(index);
    }
  };

  return (
    <div
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${width}, 1fr)`,
        gridTemplateRows: `repeat(${height}, 1fr)`,
      }}
    >
      {megatiles.slice(0, width * height).map((megatile, index) => (
        <div
          key={index}
          className="cursor-pointer select-none"
          style={{
            width: `calc(${tileSize / 19.2}vw)`,
            height: `calc(${tileSize / 19.2}vw)`,
            userSelect: 'none',
          }}
          onClick={() => handleTileClick(index)}
        >
          {megatile.getMainTile().type === Tiles.Air ? (
            <div className="size-full bg-gray-100 hover:bg-gray-300" />
          ) : (
            <div className="grid size-full grid-cols-3 grid-rows-3">
              {megatile.tiles.map((tile, tileIndex) => (
                <Image
                  key={tileIndex}
                  src={getTileImage(tile)}
                  alt="Tile"
                  width={tileSize / 3}
                  height={tileSize / 3}
                  className="size-full"
                  draggable={false}
                  style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    width: `${(tileSize / 3 / 1920) * 100}vw`,
                    height: `${(tileSize / 3 / 1920) * 100}vw`,
                  }}
                  onDragStart={(e: React.DragEvent) => e.preventDefault()}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
