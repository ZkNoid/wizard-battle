import { Scene, Tilemaps } from "phaser";

export interface TilemapConfig {
  width: number;
  height: number;
  tileSize: number;
}

export class GameTilemap {
  private map: Tilemaps.Tilemap | null;
  private tileset: Tilemaps.Tileset | null;
  private groundLayer: Tilemaps.TilemapLayer | null;
  private detailsLayer: Tilemaps.TilemapLayer | null;
  private config: TilemapConfig;
  private scale: number;
  private scene: Scene;

  constructor(scene: Scene, config: TilemapConfig) {
    this.scene = scene;
    this.config = config;
    this.map = null;
    this.tileset = null;
    this.groundLayer = null;
    this.detailsLayer = null;
    this.scale = 1;
  }

  initialize(tilesetKey: string, tilesetName: string): void {
    try {
      // Check if tileset is loaded
      if (!this.scene.textures.exists(tilesetKey)) {
        throw new Error(`Tileset ${tilesetKey} not loaded`);
      }

      // Create tilemap from data
      const tilemapData = this.createTilemapData();

      this.map = this.scene.make.tilemap({
        data: tilemapData,
        tileWidth: this.config.tileSize,
        tileHeight: this.config.tileSize,
        width: this.config.width,
        height: this.config.height,
      });

      if (!this.map) {
        throw new Error("Failed to create tilemap");
      }

      // Add tileset
      this.tileset = this.map.addTilesetImage(tilesetName, tilesetKey);
      if (!this.tileset) {
        throw new Error("Failed to create tileset");
      }

      // Create ground layer
      this.groundLayer = this.map.createLayer(0, this.tileset);
      if (!this.groundLayer) {
        throw new Error("Failed to create ground layer");
      }

      // For now, we'll use the same layer for both ground and details
      // When we have actual details data, we can create a separate layer
      this.detailsLayer = this.groundLayer;

      // Set fixed scale
      this.scale = 1;
      this.groundLayer.setScale(this.scale);
      this.detailsLayer.setScale(this.scale);

      // Set collision for ground layer
      this.groundLayer.setCollisionByProperty({ collides: false });
    } catch (error) {
      console.error("Error initializing tilemap:", error);
      throw error;
    }
  }

  private createTilemapData(): number[][] {
    // Create a default 8x8 tilemap with some variation
    const data: number[][] = [];
    for (let y = 0; y < this.config.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.config.width; x++) {
        // Create a simple pattern: borders are different, center is ground
        if (
          x === 0 ||
          x === this.config.width - 1 ||
          y === 0 ||
          y === this.config.height - 1
        ) {
          row.push(2); // Border tiles
        } else {
          row.push(1); // Ground tiles
        }
      }
      data.push(row);
    }
    return data;
  }

  loadTilemapFromData(tilemapData: number[]): void {
    if (tilemapData.length !== this.config.width * this.config.height) {
      console.error(
        `Invalid tilemap data length: ${tilemapData.length}, expected: ${this.config.width * this.config.height}`,
      );
      return;
    }

    // Convert 1D array to 2D array
    const data2D: number[][] = [];
    for (let y = 0; y < this.config.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.config.width; x++) {
        const index = y * this.config.width + x;
        const tileValue = tilemapData[index];
        if (tileValue !== undefined) {
          row.push(tileValue);
        } else {
          row.push(0); // Default to empty tile
        }
      }
      data2D.push(row);
    }

    // Update the tilemap data
    if (this.groundLayer) {
      for (let y = 0; y < this.config.height; y++) {
        for (let x = 0; x < this.config.width; x++) {
          const tileIndex = data2D[y]?.[x];
          if (tileIndex !== undefined && tileIndex > 0) {
            this.groundLayer.putTileAt(tileIndex - 1, x, y); // Tiled uses 1-based indexing
          } else {
            // Clear tile if index is 0 or undefined
            this.groundLayer.putTileAt(-1, x, y);
          }
        }
      }
    }
  }

  setPosition(x: number, y: number): void {
    if (this.groundLayer && this.detailsLayer) {
      this.groundLayer.setPosition(x, y);
      this.detailsLayer.setPosition(x, y);
    }
  }

  getScaledDimensions(): { width: number; height: number } {
    return {
      width: this.config.width * this.config.tileSize,
      height: this.config.height * this.config.tileSize,
    };
  }

  getGroundLayer(): Tilemaps.TilemapLayer | null {
    return this.groundLayer;
  }

  getDetailsLayer(): Tilemaps.TilemapLayer | null {
    return this.detailsLayer;
  }

  getScale(): number {
    return this.scale;
  }

  getConfig(): TilemapConfig {
    return this.config;
  }

  isPointInside(x: number, y: number): boolean {
    if (!this.groundLayer) return false;
    const tileX = this.groundLayer.worldToTileX(x);
    const tileY = this.groundLayer.worldToTileY(y);
    return (
      tileX >= 0 &&
      tileX < this.config.width &&
      tileY >= 0 &&
      tileY < this.config.height
    );
  }

  getTileCenter(x: number, y: number): { x: number; y: number } | null {
    if (!this.groundLayer) return null;
    const tileX = this.groundLayer.worldToTileX(x);
    const tileY = this.groundLayer.worldToTileY(y);

    if (
      tileX >= 0 &&
      tileX < this.config.width &&
      tileY >= 0 &&
      tileY < this.config.height
    ) {
      return {
        x: this.groundLayer.tileToWorldX(tileX) + this.config.tileSize / 2,
        y: this.groundLayer.tileToWorldY(tileY) + this.config.tileSize / 2,
      };
    }
    return null;
  }
}

export const createTilemap = (): TilemapConfig => ({
  width: 8,
  height: 8,
  tileSize: 48,
});
