import { Scene } from 'phaser';
import { GameTilemap, createTilemap } from '../objects/GameTilemap';

export class Game extends Scene {
  camera!: Phaser.Cameras.Scene2D.Camera;
  private leftTilemap: GameTilemap;
  // private rightTilemap: GameTilemap;
  leftPlayer!: Phaser.GameObjects.Image;
  // rightPlayer!: Phaser.GameObjects.Image;
  leftTargetPosition!: { x: number; y: number } | null;
  // rightTargetPosition!: { x: number; y: number } | null;
  private highlightTile: Phaser.GameObjects.Rectangle | null = null;
  private activePlayer: 'left' | 'right' = 'left';

  constructor() {
    super('Game');
    this.leftTilemap = new GameTilemap(this, createTilemap());
    // this.rightTilemap = new GameTilemap(this, createTilemap());
  }

  preload() {
    // Player image is already loaded in Preloader
  }

  create() {
    this.camera = this.cameras.main;

    try {
      // Initialize tilemaps
      this.leftTilemap.initialize('tiles', 'tiles');
      // this.rightTilemap.initialize("tiles", "tiles");

      // Load tilemap data if available
      const tilemapData = (this.game as any).tilemapData;

      if (tilemapData && Array.isArray(tilemapData)) {
        this.leftTilemap.loadTilemapFromData(tilemapData);
      } else {
        console.log('No tilemap data available, using default');
      }

      // Center layers
      // const centerX = 0;
      // const centerY = 0;
      // const leftDimensions = this.leftTilemap.getScaledDimensions();
      // const rightDimensions = this.rightTilemap.getScaledDimensions();

      // const tilemapGap = 160;
      // const tilemapBottomOffset = 30;

      // Позиционируем левую часть
      // const leftX = centerX - leftDimensions.width - tilemapGap;
      // const leftY = centerY - leftDimensions.height / 2 + tilemapBottomOffset;
      // this.leftTilemap.setPosition(centerX / 2, centerY / 2);

      // Позиционируем правую часть
      // const rightX = centerX + tilemapGap;
      // const rightY = centerY - rightDimensions.height / 2 + tilemapBottomOffset;
      // this.rightTilemap.setPosition(rightX, rightY);

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

      // Add players
      // this.leftPlayer = this.add.image(
      //   centerX -
      //     leftDimensions.width -
      //     tilemapGap +
      //     (this.leftTilemap.getConfig().tileSize * leftScale) / 2,
      //   centerY -
      //     leftDimensions.height / 2 +
      //     tilemapBottomOffset +
      //     (this.leftTilemap.getConfig().tileSize * leftScale) / 2,
      //   "player",
      // );
      this.leftPlayer = this.add.image(
        (this.leftTilemap.getConfig().tileSize * leftScale) / 2,
        (this.leftTilemap.getConfig().tileSize * leftScale) / 2,
        'player'
      );
      this.leftPlayer.setScale(leftScale);

      // this.rightPlayer = this.add.image(
      //   centerX +
      //     tilemapGap +
      //     (this.rightTilemap.getConfig().tileSize *
      //       this.rightTilemap.getScale()) /
      //       2,
      //   centerY -
      //     rightDimensions.height / 2 +
      //     tilemapBottomOffset +
      //     (this.rightTilemap.getConfig().tileSize *
      //       this.rightTilemap.getScale()) /
      //       2,
      //   "player",
      // );
      // this.rightPlayer.setScale(this.rightTilemap.getScale());
      // this.rightPlayer.setTint(0xff0000); // Делаем правого игрока красным для отличия

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
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const activeTilemap =
          this.activePlayer === 'left' ? this.leftTilemap : this.leftTilemap; // : this.rightTilemap;
        const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);

        console.log('onMapClick', (this.game as any).onMapClick);
        (this.game as any).onMapClick?.(
          Math.floor(worldPoint.x / activeTilemap.getConfig().tileSize),
          Math.floor(worldPoint.y / activeTilemap.getConfig().tileSize)
        );

        const tileCenter = activeTilemap.getTileCenter(
          worldPoint.x,
          worldPoint.y
        );
        if (tileCenter) {
          if (this.activePlayer === 'left') {
            this.leftTargetPosition = tileCenter;
          } // else {
          //   this.rightTargetPosition = tileCenter;
          // }
        }
      });

      // Add key handler for switching players
      this.input.keyboard?.on('keydown-SPACE', () => {
        this.activePlayer = this.activePlayer === 'left' ? 'left' : 'left'; // ? "right" : "left";
        console.log('Active player:', this.activePlayer);
      });
    } catch (error) {
      console.error('Error in create:', error);
    }
  }

  update() {
    // Update left player
    if (this.leftTargetPosition) {
      const distance = Phaser.Math.Distance.Between(
        this.leftPlayer.x,
        this.leftPlayer.y,
        this.leftTargetPosition.x,
        this.leftTargetPosition.y
      );

      if (distance > 1) {
        const angle = Phaser.Math.Angle.Between(
          this.leftPlayer.x,
          this.leftPlayer.y,
          this.leftTargetPosition.x,
          this.leftTargetPosition.y
        );

        const speed = 200;
        this.leftPlayer.x +=
          (Math.cos(angle) * speed * this.game.loop.delta) / 1000;
        this.leftPlayer.y +=
          (Math.sin(angle) * speed * this.game.loop.delta) / 1000;
      } else {
        this.leftPlayer.x = this.leftTargetPosition.x;
        this.leftPlayer.y = this.leftTargetPosition.y;
        this.leftTargetPosition = null;
      }
    }

    // Update right player
    // if (this.rightTargetPosition) {
    //   const distance = Phaser.Math.Distance.Between(
    //     this.rightPlayer.x,
    //     this.rightPlayer.y,
    //     this.rightTargetPosition.x,
    //     this.rightTargetPosition.y,
    //   );

    //   if (distance > 1) {
    //     const angle = Phaser.Math.Angle.Between(
    //       this.rightPlayer.x,
    //       this.rightPlayer.y,
    //       this.rightTargetPosition.x,
    //       this.rightTargetPosition.y,
    //     );

    //     const speed = 200;
    //     this.rightPlayer.x +=
    //       (Math.cos(angle) * speed * this.game.loop.delta) / 1000;
    //     this.rightPlayer.y +=
    //       (Math.sin(angle) * speed * this.game.loop.delta) / 1000;
    //   } else {
    //     this.rightPlayer.x = this.rightTargetPosition.x;
    //     this.rightPlayer.y = this.rightTargetPosition.y;
    //     this.rightTargetPosition = null;
    //   }
    // }
  }

  public loadTilemap(tilemapData: number[]) {
    // Update the tilemap with new data
    if (this.leftTilemap) {
      this.leftTilemap.loadTilemapFromData(tilemapData);
    }
  }
}
