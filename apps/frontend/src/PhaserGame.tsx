'use client';

import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import { StartGameAlly, StartGameEnemy } from './game/main';
import { EventBus } from './game/EventBus';

export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

interface IProps {
  currentActiveScene?: (scene_instance: Phaser.Scene) => void;
  container: string;
  isEnemy?: boolean;
  tilemapData?: number[];
  onMapClick?: (x: number, y: number) => void;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(
  function PhaserGame(
    { currentActiveScene, container, isEnemy, tilemapData, onMapClick },
    ref
  ) {
    const game = useRef<Phaser.Game | null>(null!);
    const previousTilemapData = useRef<number[] | undefined>(undefined);

    useLayoutEffect(() => {
      if (game.current === null) {
        game.current = isEnemy
          ? StartGameEnemy(container, tilemapData, onMapClick)
          : StartGameAlly(container, tilemapData, onMapClick);

        if (typeof ref === 'function') {
          ref({ game: game.current, scene: null });
        } else if (ref) {
          ref.current = { game: game.current, scene: null };
        }
      }

      return () => {
        if (game.current) {
          game.current.destroy(true);
          if (game.current !== null) {
            game.current = null;
          }
        }
      };
    }, [ref, container, isEnemy]); // Removed tilemapData from dependencies

    // Handle tilemap data updates separately
    useEffect(() => {
      if (
        game.current &&
        tilemapData &&
        previousTilemapData.current !== tilemapData
      ) {
        const scene = game.current.scene.getScene('Game') as any;
        if (scene && scene.loadTilemap) {
          scene.loadTilemap(tilemapData);
        }
        previousTilemapData.current = tilemapData;
      }
    }, [tilemapData]);

    // Handle onMapClick updates
    useEffect(() => {
      if (game.current) {
        (game.current as any).onMapClick = onMapClick;
      }
    }, [onMapClick]);

    useEffect(() => {
      EventBus.on(
        'current-scene-ready',
        (scene_instance: Phaser.Scene, gameInstance: string) => {
          // Only update refs if this is the correct instance
          const expectedInstance = isEnemy ? 'enemy' : 'ally';
          if (gameInstance !== expectedInstance) {
            return;
          }

          if (currentActiveScene && typeof currentActiveScene === 'function') {
            currentActiveScene(scene_instance);
          }

          if (typeof ref === 'function') {
            ref({ game: game.current, scene: scene_instance });
          } else if (ref) {
            ref.current = { game: game.current, scene: scene_instance };
          }
        }
      );
      return () => {
        EventBus.removeListener('current-scene-ready');
      };
    }, [currentActiveScene, ref, isEnemy]);

    return <div id={container}></div>;
  }
);
