import { Scene } from 'phaser';
import { GameTilemap, createTilemap } from '../objects/GameTilemap';
import { EventBus } from '../EventBus';

export class Game extends Scene {
  camera!: Phaser.Cameras.Scene2D.Camera;
  private leftTilemap: GameTilemap;
  leftPlayer!: Phaser.GameObjects.Image;
  private highlightTile: Phaser.GameObjects.Rectangle | null = null;
  private activePlayer: 'left' | 'right' = 'left';

  constructor() {
    super('Game');
    this.leftTilemap = new GameTilemap(this, createTilemap());
  }

  preload() {
    // Player image is already loaded in Preloader
  }

  create() {
    this.camera = this.cameras.main;

    try {
      // Initialize tilemaps
      this.leftTilemap.initialize('tiles', 'tiles');

      // Load tilemap data if available
      const tilemapData = (this.game as any).tilemapData;

      if (tilemapData && Array.isArray(tilemapData)) {
        this.leftTilemap.loadTilemapFromData(tilemapData);
      } else {
        console.log('No tilemap data available, using default');
      }

      // Create rectangle for highlighting
      const leftScale = this.leftTilemap.getScale();
      this.highlightTile = this.add.rectangle(
        0,
        0,
        this.leftTilemap.getConfig().tileSize * leftScale,
        this.leftTilemap.getConfig().tileSize * leftScale,
        0xffffff,
        0.3
      );
      this.highlightTile.setVisible(false);

      this.leftPlayer = this.add.image(
        (this.leftTilemap.getConfig().tileSize * leftScale) / 2,
        (this.leftTilemap.getConfig().tileSize * leftScale) / 2,
        'player'
      );
      this.leftPlayer.setScale(leftScale);

      // Add mouse move handler
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        const activeTilemap =
          this.activePlayer === 'left' ? this.leftTilemap : this.leftTilemap; // : this.rightTilemap;
        if (this.highlightTile) {
          const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);

          if (activeTilemap.isPointInside(worldPoint.x, worldPoint.y)) {
            const tileCenter = activeTilemap.getTileCenter(
              worldPoint.x,
              worldPoint.y
            );
            if (tileCenter) {
              this.highlightTile.setPosition(tileCenter.x, tileCenter.y);
              this.highlightTile.setVisible(true);
            }
          } else {
            this.highlightTile.setVisible(false);
          }
        }
      });

      // Add click handler
      // this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      //   const activeTilemap =
      //     this.activePlayer === 'left' ? this.leftTilemap : this.leftTilemap; // : this.rightTilemap;
      //   const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);

      //   console.log('onMapClick', (this.game as any).onMapClick);
      //   (this.game as any).onMapClick?.(
      //     Math.floor(worldPoint.x / activeTilemap.getConfig().tileSize),
      //     Math.floor(worldPoint.y / activeTilemap.getConfig().tileSize)
      //   );
      // });

      // Add key handler for switching players
      // this.input.keyboard?.on('keydown-SPACE', () => {
      //   this.activePlayer = this.activePlayer === 'left' ? 'left' : 'left'; // ? "right" : "left";
      //   console.log('Active player:', this.activePlayer);
      // });

      // Move player event handler
      this.events.on(
        'move-player',
        (xTile: number, yTile: number, targetInstance: string) => {
          console.log(
            'move-player event received in Game scene, targetInstance:',
            targetInstance
          );
          // Only move player if this is the correct instance
          const gameInstance = (this.game as any).gameInstance;
          console.log('gameInstance:', gameInstance);
          if (gameInstance === targetInstance) {
            this.movePlayer(xTile, yTile);
          }
        },
        this
      );

      // Emit current-scene-ready event to notify React components
      const gameInstance = (this.game as any).gameInstance;
      EventBus.emit('current-scene-ready', this, gameInstance);
    } catch (error) {
      console.error('Error in create:', error);
    }
  }

  update() {}

  public loadTilemap(tilemapData: number[]) {
    // Update the tilemap with new data
    if (this.leftTilemap) {
      this.leftTilemap.loadTilemapFromData(tilemapData);
    }
  }

  public handlePositionUpdate(x: number, y: number) {
    // Update the leftPlayer position
    if (this.leftPlayer) {
      const leftScale = this.leftTilemap.getScale();
      const tileSize = this.leftTilemap.getConfig().tileSize * leftScale;

      // Convert tile coordinates to world coordinates
      const worldX = x * tileSize + tileSize / 2;
      const worldY = y * tileSize + tileSize / 2;

      this.leftPlayer.setPosition(worldX, worldY);
      console.log(`Updated leftPlayer position to: (${worldX}, ${worldY})`);
    }
  }

  public movePlayer(xTile: number, yTile: number) {
    if (this.leftPlayer) {
      const leftScale = this.leftTilemap.getScale();
      const tileSize = this.leftTilemap.getConfig().tileSize * leftScale;

      // Convert tile coordinates to world coordinates (center of tile)
      const worldX = xTile * tileSize + tileSize / 2;
      const worldY = yTile * tileSize + tileSize / 2;

      this.leftPlayer.setPosition(worldX, worldY);
      console.log(
        `Moved player to tile (${xTile}, ${yTile}) -> world position (${worldX}, ${worldY})`
      );
    }
  }
}
