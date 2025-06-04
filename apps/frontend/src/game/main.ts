import { Boot } from "./scenes/Boot";
import { Game as MainGame } from "./scenes/Game";
import { AUTO, Game } from "phaser";
import { Preloader } from "./scenes/Preloader";

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config1: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: "game-container-ally",
  transparent: true,
  backgroundColor: "transparent",
  scene: [Boot, Preloader, MainGame],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const config2: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: "game-container-enemy",
  transparent: true,
  backgroundColor: "transparent",
  scene: [Boot, Preloader, MainGame],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const StartGameAlly = (parent: string) => {
  return new Game({ ...config1, parent });
};

const StartGameEnemy = (parent: string) => {
  return new Game({ ...config2, parent });
};

export { StartGameAlly, StartGameEnemy };
