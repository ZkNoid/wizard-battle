import { create } from 'zustand';
import type { IRefPhaserGame } from '@/PhaserGame';

/**
 * Phaser Store - Manages Phaser game instance interactions
 *
 * This store provides centralized management for Phaser game instances,
 * including position updates and game references.
 *
 * Usage:
 * ```typescript
 * const {
 *   setAllyGameRef,
 *   handlePositionUpdate
 * } = usePhaserStore();
 *
 * // Set game references when components mount
 * setAllyGameRef(phaserRef.current);
 *
 * // Handle position updates from enemy map
 * handlePositionUpdate(x, y);
 * ```
 */

interface PhaserStore {
  // Phaser game references
  allyGameRef: IRefPhaserGame | null;
  enemyGameRef: IRefPhaserGame | null;

  // Game state
  isAllyGameReady: boolean;
  isEnemyGameReady: boolean;

  // Actions
  setAllyGameRef: (ref: IRefPhaserGame | null) => void;
  setEnemyGameRef: (ref: IRefPhaserGame | null) => void;
  setAllyGameReady: (ready: boolean) => void;
  setEnemyGameReady: (ready: boolean) => void;

  // Phaser interaction functions
  handlePositionUpdate: (ally: boolean, x: number, y: number) => void;
}

export const usePhaserStore = create<PhaserStore>((set, get) => ({
  // Initial state
  allyGameRef: null,
  enemyGameRef: null,
  isAllyGameReady: false,
  isEnemyGameReady: false,

  // Actions
  setAllyGameRef: (ref: IRefPhaserGame | null) => set({ allyGameRef: ref }),

  setEnemyGameRef: (ref: IRefPhaserGame | null) => set({ enemyGameRef: ref }),

  setAllyGameReady: (ready: boolean) => set({ isAllyGameReady: ready }),

  setEnemyGameReady: (ready: boolean) => set({ isEnemyGameReady: ready }),

  // Phaser interaction functions
  handlePositionUpdate: (ally: boolean, x: number, y: number) => {
    const { allyGameRef, enemyGameRef, isAllyGameReady, isEnemyGameReady } =
      get();
    const gameRef = ally ? allyGameRef : enemyGameRef;
    const isReady = ally ? isAllyGameReady : isEnemyGameReady;
    console.log(
      'Position update requested: ',
      x,
      y,
      'ally:',
      ally,
      'ready:',
      isReady
    );

    if (gameRef?.scene && isReady) {
      // Call the position update function on the appropriate scene instance
      (gameRef.scene as any).handlePositionUpdate?.(x, y);
    } else {
      console.warn('Game scene reference not available for position update', {
        hasScene: !!gameRef?.scene,
        isReady,
        ally,
      });
    }
  },
}));
