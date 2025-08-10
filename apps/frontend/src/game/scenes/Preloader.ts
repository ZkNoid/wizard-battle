import { Scene } from "phaser";

export class Preloader extends Scene {
  constructor() {
    super("Preloader");
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    // this.add.image(512, 384, "background");

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on("progress", (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    this.load.setPath("assets");
    // Load tileset image
    this.load.image("tiles", "tilemap/tiles.png");
    this.load.image("tiles2", "tilemap/tiles.png"); // Временно используем тот же тайлсет

    // Load player image
    this.load.image("player", "human.png");

    // Adding error handlers
    this.load.on("loaderror", (file: any) => {
      console.error("Error loading file:", file.src);
    });

    this.load.on("complete", () => {
      console.log("All assets loaded successfully");
    });
  }

  create() {
    // Проверяем, что все необходимые ресурсы загружены
    if (!this.textures.exists("tiles") || !this.textures.exists("tiles2")) {
      console.error("Tilesets not loaded!");
      return;
    }

    if (!this.textures.exists("player")) {
      console.error("Player texture not loaded!");
      return;
    }

    // Tilemap structure will be validated when data is loaded

    console.log("----- Preloader scene completed -----");
    this.scene.start("Game");
  }
}
