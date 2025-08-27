import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config1: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: 384,
  height: 384,
  parent: 'game-container-ally',
  transparent: true,
  backgroundColor: 'transparent',
  scene: [Boot, Preloader, MainGame],
  scale: {
    mode: Phaser.Scale.FIT,
  },
};

const config2: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: 384,
  height: 384,
  parent: 'game-container-enemy',
  transparent: true,
  backgroundColor: 'transparent',
  scene: [Boot, Preloader, MainGame],
  scale: {
    mode: Phaser.Scale.FIT,
  },
};

const StartGameAlly = (
  parent: string,
  tilemapData?: number[],
  onMapClick?: (x: number, y: number) => void
) => {
  const game = new Game({ ...config1, parent });
  if (tilemapData) {
    // Store tilemap data for later use
    (game as any).tilemapData = tilemapData;
  }
  if (onMapClick) {
    (game as any).onMapClick = onMapClick;
  }
  return game;
};

const StartGameEnemy = (
  parent: string,
  tilemapData?: number[],
  onMapClick?: (x: number, y: number) => void
) => {
  const game = new Game({ ...config2, parent });
  if (tilemapData) {
    // Store tilemap data for later use
    (game as any).tilemapData = tilemapData;
  }
  if (onMapClick) {
    (game as any).onMapClick = onMapClick;
  }
  return game;
};

export { StartGameAlly, StartGameEnemy };
