import { Scene } from 'phaser';

const spriteshitsInfo = [
  {
    name: 'lightning',
    image: 'spritesheets/Lightning.png',
    frameWidth: 64,
    frameHeight: 128,
    frames: 7,
    frameRate: 10,
    repeat: 0,
    yoyo: false,
  },
  {
    name: 'lightning_cast',
    image: 'spritesheets/LightningCast.png',
    frameWidth: 64,
    frameHeight: 128,
    frames: 11,
    frameRate: 10,
    repeat: 0,
    yoyo: false,
  },
  {
    name: 'fire_ball',
    image: 'spritesheets/FireBall.png',
    frameWidth: 64,
    frameHeight: 64,
    frames: 5,
    frameRate: 10,
    repeat: 0,
    yoyo: false,
  },
  {
    name: 'fire_ball_cast',
    image: 'spritesheets/FireBallCast.png',
    frameWidth: 128,
    frameHeight: 64,
    frames: 20,
    frameRate: 10,
    repeat: 0,
    yoyo: false,
  },
];

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    // this.add.image(512, 384, "background");

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    this.load.setPath('assets');
    // Load tileset image
    this.load.image('tiles', 'tilemap/tiles.png');
    this.load.image('tiles2', 'tilemap/tiles.png'); // Временно используем тот же тайлсет

    // Sourcer spritesheet
    this.load.atlas(
      'sourcer',
      'spritesheets/Sourcer_Idle.png',
      'spritesheets/Sourcer_Idle.json'
    );

    for (const spriteInfo of spriteshitsInfo) {
      this.load.spritesheet(spriteInfo.name, spriteInfo.image, {
        frameWidth: spriteInfo.frameWidth,
        frameHeight: spriteInfo.frameHeight,
        margin: 0,
        spacing: 0,
      });
    }

    // Adding error handlers
    this.load.on('loaderror', (file: any) => {
      console.error('Error loading file:', file.src);
    });

    this.load.on('complete', () => {
      console.log('All assets loaded successfully');
    });
  }

  create() {
    // Проверяем, что все необходимые ресурсы загружены
    if (!this.textures.exists('tiles') || !this.textures.exists('tiles2')) {
      console.error('Tilesets not loaded!');
      return;
    }

    if (!this.anims.exists('sourcer_idle')) {
      this.anims.create({
        key: 'sourcer_idle',
        frames: this.anims.generateFrameNames('sourcer', {
          start: 0,
          end: 7,
          zeroPad: 0,
          prefix: 'Sourcer_Idle ',
          suffix: '.aseprite',
        }),
        frameRate: 3, // frames per second
        repeat: -1, // -1 = loop forever
        yoyo: false,
      });
    }

    for (const spriteInfo of spriteshitsInfo) {
      if (!this.anims.exists(spriteInfo.name)) {
        this.anims.create({
          key: spriteInfo.name,
          frames: this.anims.generateFrameNumbers(spriteInfo.name, {
            start: 0,
            end: spriteInfo.frames - 1,
          }),
          frameRate: spriteInfo.frameRate,
          repeat: spriteInfo.repeat,
          yoyo: spriteInfo.yoyo,
        });
      }
    }

    // Tilemap structure will be validated when data is loaded

    console.log('----- Preloader scene completed -----');
    this.scene.start('Game');
  }
}
