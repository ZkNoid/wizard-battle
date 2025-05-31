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
      // Check if map is loaded
      if (!this.scene.cache.tilemap.exists("map")) {
        throw new Error("Map not loaded in cache");
      }

      // Create tilemap
      this.map = this.scene.make.tilemap({ key: "map" });
      if (!this.map) {
        throw new Error("Failed to create tilemap");
      }

      // Check if tileset is loaded
      if (!this.scene.textures.exists(tilesetKey)) {
        throw new Error(`Tileset ${tilesetKey} not loaded`);
      }

      // Add tileset
      this.tileset = this.map.addTilesetImage(tilesetName, tilesetKey);
      if (!this.tileset) {
        throw new Error("Failed to create tileset");
      }

      // Create ground layer
      this.groundLayer = this.map.createLayer("ground", this.tileset);
      if (!this.groundLayer) {
        throw new Error("Failed to create ground layer");
      }

      // Create details layer
      this.detailsLayer = this.map.createLayer("details", this.tileset);
      if (!this.detailsLayer) {
        throw new Error("Failed to create details layer");
      }

      // Set fixed scale
      this.scale = 1;
      this.groundLayer.setScale(this.scale);
      this.detailsLayer.setScale(this.scale);

      // Set collision for ground layer
      this.groundLayer.setCollisionByProperty({ collides: false });

      console.log("Tilemap initialized successfully:", {
        mapWidth: this.map.width,
        mapHeight: this.map.height,
        tileWidth: this.map.tileWidth,
        tileHeight: this.map.tileHeight,
        layers: this.map.layers.map((layer) => layer.name),
      });
    } catch (error) {
      console.error("Error initializing tilemap:", error);
      throw error;
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
  width: 10,
  height: 10,
  tileSize: 48,
});
