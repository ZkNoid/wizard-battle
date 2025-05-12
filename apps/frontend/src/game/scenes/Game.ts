import { Scene } from "phaser";

export class Game extends Scene {
  camera!: Phaser.Cameras.Scene2D.Camera;
  map!: Phaser.Tilemaps.Tilemap;
  tileset!: Phaser.Tilemaps.Tileset | null;
  floorLayer!: Phaser.Tilemaps.TilemapLayer | null;
  player!: Phaser.GameObjects.Image;
  targetPosition!: { x: number; y: number } | null;
  private readonly TILE_SIZE = 32;
  private highlightTile: Phaser.GameObjects.Rectangle | null = null;
  private lastHighlightedTile: { x: number; y: number } | null = null;

  constructor() {
    super("Game");
  }

  preload() {
    this.load.image("tileset", "assets/tilemap/baseTiles.png");
    this.load.tilemapCSV("map", "assets/tilemap/tilemap.csv");
    this.load.image("player", "assets/human.png");
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setZoom(1.5);

    try {
      // Create tilemap
      this.map = this.make.tilemap({
        key: "map",
        tileWidth: this.TILE_SIZE,
        tileHeight: this.TILE_SIZE,
      });

      // Add tileset with correct parameters
      this.tileset = this.map.addTilesetImage(
        "baseTiles",
        "tileset",
        this.TILE_SIZE,
        this.TILE_SIZE,
      );

      if (!this.tileset) {
        throw new Error("Failed to create tileset");
      }

      // Create layer from tilemap data
      this.floorLayer = this.map.createLayer(0, this.tileset);

      if (!this.floorLayer) {
        throw new Error("Failed to create layer");
      }

      // Center layer
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const mapWidth = this.map.widthInPixels;
      const mapHeight = this.map.heightInPixels;

      this.floorLayer.setPosition(
        centerX - mapWidth / 2,
        centerY - mapHeight / 2,
      );

      // Create rectangle for highlighting
      this.highlightTile = this.add.rectangle(
        0,
        0,
        this.TILE_SIZE,
        this.TILE_SIZE,
        0xffffff,
        0.3,
      );
      this.highlightTile.setVisible(false);

      // Add player
      this.player = this.add.image(
        centerX - mapWidth / 2 + this.TILE_SIZE / 2,
        centerY - mapHeight / 2 + this.TILE_SIZE / 2,
        "player",
      );
      this.player.setScale(1);

      // Add mouse move handler
      this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        if (this.floorLayer && this.highlightTile) {
          const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);
          const tileX = this.floorLayer.worldToTileX(worldPoint.x);
          const tileY = this.floorLayer.worldToTileY(worldPoint.y);

          // Check if cursor is inside map
          if (
            tileX >= 0 &&
            tileX < this.map.width &&
            tileY >= 0 &&
            tileY < this.map.height
          ) {
            // Check if we're hovering over the same tile
            if (
              this.lastHighlightedTile?.x !== tileX ||
              this.lastHighlightedTile?.y !== tileY
            ) {
              const worldX =
                this.floorLayer.tileToWorldX(tileX) + this.TILE_SIZE / 2;
              const worldY =
                this.floorLayer.tileToWorldY(tileY) + this.TILE_SIZE / 2;

              this.highlightTile.setPosition(worldX, worldY);
              this.highlightTile.setVisible(true);

              this.lastHighlightedTile = { x: tileX, y: tileY };
            }
          } else {
            this.highlightTile.setVisible(false);
            this.lastHighlightedTile = null;
          }
        }
      });

      // Add click handler
      this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (this.floorLayer) {
          const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);
          const tileX = this.floorLayer.worldToTileX(worldPoint.x);
          const tileY = this.floorLayer.worldToTileY(worldPoint.y);

          if (
            tileX >= 0 &&
            tileX < this.map.width &&
            tileY >= 0 &&
            tileY < this.map.height
          ) {
            const newX =
              this.floorLayer.tileToWorldX(tileX) + this.TILE_SIZE / 2;
            const newY =
              this.floorLayer.tileToWorldY(tileY) + this.TILE_SIZE / 2;
            this.targetPosition = { x: newX, y: newY };
          }
        }
      });
    } catch (error) {
      console.error("Error in create:", error);
    }
  }

  update() {
    if (this.targetPosition) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.targetPosition.x,
        this.targetPosition.y,
      );

      if (distance > 1) {
        const angle = Phaser.Math.Angle.Between(
          this.player.x,
          this.player.y,
          this.targetPosition.x,
          this.targetPosition.y,
        );

        const speed = 200;
        this.player.x +=
          (Math.cos(angle) * speed * this.game.loop.delta) / 1000;
        this.player.y +=
          (Math.sin(angle) * speed * this.game.loop.delta) / 1000;
      } else {
        this.player.x = this.targetPosition.x;
        this.player.y = this.targetPosition.y;
        this.targetPosition = null;
      }
    }
  }
}
