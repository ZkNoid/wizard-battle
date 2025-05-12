import type { GameObjects } from "phaser";
import { Scene } from "phaser";

import { EventBus } from "../EventBus";

export class MainMenu extends Scene {
  background!: GameObjects.Image;
  logo!: GameObjects.Image;
  title!: GameObjects.Text;
  subTitle!: GameObjects.Text;
  logoTween!: Phaser.Tweens.Tween | null;

  constructor() {
    super("MainMenu");
  }

  preload() {
    this.load.svg("atom", "assets/atom.svg", {
      width: 100,
      height: 100,
    });
    this.load.svg("rounded-btn", "assets/rounded-btn.svg", {
      width: 355,
      height: 60,
      scale: 1,
    });
  }

  create() {
    this.background = this.add.image(
      window.innerWidth / 2,
      window.innerHeight / 2,
      "background",
    );
    this.background.setScale(1.75);

    this.logo = this.add
      .image(window.innerWidth / 2, window.innerHeight / 2, "atom")
      .setDepth(100);

    // Logo animation
    this.tweens.add({
      targets: this.logo,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: "Linear",
    });

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
      .image(buttonX, buttonY, "rounded-btn")
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
      playButton.setTint(0xf0f0f0);
      // playText.setStyle({ color: "#666" });
    });

    playButton.on("pointerout", () => {
      playButton.clearTint();
      playText.setStyle({ color: "#000" });
    });

    // Play button click event
    playButton.on("pointerdown", () => {
      this.scene.start("Game");
    });

    EventBus.emit("current-scene-ready", this);
  }

  changeScene() {
    if (this.logoTween) {
      this.logoTween.stop();
      this.logoTween = null;
    }

    this.scene.start("Game");
  }

  moveLogo(reactCallback: ({ x, y }: { x: number; y: number }) => void) {
    if (this.logoTween) {
      if (this.logoTween.isPlaying()) {
        this.logoTween.pause();
      } else {
        this.logoTween.play();
      }
    } else {
      this.logoTween = this.tweens.add({
        targets: this.logo,
        x: { value: 750, duration: 3000, ease: "Back.easeInOut" },
        y: { value: 80, duration: 1500, ease: "Sine.easeOut" },
        yoyo: true,
        repeat: -1,
        onUpdate: () => {
          if (reactCallback) {
            reactCallback({
              x: Math.floor(this.logo.x),
              y: Math.floor(this.logo.y),
            });
          }
        },
      });
    }
  }
}
