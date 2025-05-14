import type { GameObjects } from "phaser";
import { Scene } from "phaser";

import { EventBus } from "../EventBus";

export class MainMenu extends Scene {
  title!: GameObjects.Text;
  subTitle!: GameObjects.Text;

  constructor() {
    super("MainMenu");
  }

  create() {
    // Title
    this.title = this.add
      .text(
        window.innerWidth / 2,
        window.innerHeight / 2 + 100,
        "Peaceful Atom",
        {
          fontFamily: "Helvetica",
          fontSize: 38,
          color: "#000",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(100);

    this.subTitle = this.add
      .text(
        window.innerWidth / 2,
        window.innerHeight / 2 + 170,
        "A peaceful atom is a peaceful atom",
        {
          fontFamily: "DePixel",
          fontSize: 24,
          color: "#000",
          align: "center",
        },
      )
      .setOrigin(0.5);

    // Play button
    const buttonX = window.innerWidth / 2;
    const buttonY = window.innerHeight / 2 + 300;

    const playButton = this.add
      .rectangle(buttonX, buttonY, 355, 60, 0x000000, 1)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    const playText = this.add
      .text(buttonX, buttonY, "Play", {
        fontFamily: "DePixel",
        fontSize: 22,
        color: "#000",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Play button hover effects
    playButton.on("pointerover", () => {
      playButton.setFillStyle(0xf0f0f0);
      // playText.setStyle({ color: "#666" });
    });

    playButton.on("pointerout", () => {
      playButton.setFillStyle(0x000000);
      playText.setStyle({ color: "#000" });
    });

    // Play button click event
    playButton.on("pointerdown", () => {
      this.scene.start("Game");
    });

    EventBus.emit("current-scene-ready", this);
  }

  changeScene() {
    this.scene.start("Game");
  }
}
