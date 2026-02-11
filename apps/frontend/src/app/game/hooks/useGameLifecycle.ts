import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { GamePhaseManager } from '@/game/GamePhaseManager';
import { GamePhase } from '../../../../../common/types/gameplay.types';
import { EventBus } from '@/game/EventBus';
import { useBackgroundMusic, useSpellSounds } from '@/lib/hooks/useAudio';
import { SCENE_READY_DELAY } from '../constants';

interface UseGameLifecycleProps {
  address: string | undefined;
  gamePhaseManager: GamePhaseManager | null;
  setActionSend: (value: boolean) => void;
  resetActionState: () => void;
  syncState: () => void;
}

export function useGameLifecycle({
  address,
  gamePhaseManager,
  setActionSend,
  resetActionState,
  syncState,
}: UseGameLifecycleProps) {
  const router = useRouter();
  const { playBattleMusic, playMainTheme } = useBackgroundMusic();
  const gamePhaseManagerRef = useRef<GamePhaseManager | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Enable spell sounds for this game instance
  useSpellSounds();

  // Handle new turn
  const onNewTurnHook = useCallback(() => {
    setActionSend(false);
    resetActionState();
    console.log('New turn started, syncing state...');
    syncState();
  }, [setActionSend, resetActionState, syncState]);

  // Determine if player can act based on game phase
  const canPlayerAct = gamePhaseManager?.currentPhase === GamePhase.SPELL_CASTING;

  // Switch to battle music when entering game
  useEffect(() => {
    playBattleMusic();

    return () => {
      playMainTheme();
    };
  }, [playBattleMusic, playMainTheme]);

  // Wait for game systems to be ready before confirming player joined
  useEffect(() => {
    if (gamePhaseManager) {
      const timer = setTimeout(() => {
        console.log('🎮 Game systems ready, confirming player joined');
        gamePhaseManager.onGameLoaded();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [gamePhaseManager]);

  // Redirect if no address
  useEffect(() => {
    if (!address) {
      router.replace('/');
    }
  }, [address, router]);

  // Track gamePhaseManager changes and handle cleanup of old instances
  useEffect(() => {
    if (gamePhaseManager) {
      if (
        gamePhaseManagerRef.current &&
        gamePhaseManagerRef.current !== gamePhaseManager
      ) {
        console.log('🧹 Cleaning up OLD GamePhaseManager instance');
        gamePhaseManagerRef.current.cleanup();
      }
      gamePhaseManagerRef.current = gamePhaseManager;
      console.log('📌 Stored GamePhaseManager reference');
    }
  }, [gamePhaseManager]);

  // Set new turn hook
  useEffect(() => {
    gamePhaseManager?.setOnNewTurnHook(onNewTurnHook);
  }, [gamePhaseManager, onNewTurnHook]);

  // Cleanup game phase manager on final unmount
  useEffect(() => {
    isMountedRef.current = true;
    console.log('✅ GamePage mounted');

    return () => {
      console.log('⏳ GamePage cleanup triggered');
      isMountedRef.current = false;

      setTimeout(() => {
        if (!isMountedRef.current && gamePhaseManagerRef.current) {
          console.log(
            '🛑 REAL unmount confirmed - cleaning up GamePhaseManager'
          );
          gamePhaseManagerRef.current.cleanup();
          gamePhaseManagerRef.current = null;
        } else {
          console.log(
            '🔄 Component remounted (Strict Mode) - skipping cleanup'
          );
        }
      }, 0);
    };
  }, []);

  // Handle scene ready event
  useEffect(() => {
    const handleSceneReady = (
      scene_instance: Phaser.Scene,
      gameInstance: string
    ) => {
      console.log('!!current-scene-ready', scene_instance, gameInstance);
      setTimeout(() => {
        onNewTurnHook();
      }, SCENE_READY_DELAY);
    };

    EventBus.on('current-scene-ready', handleSceneReady);
    onNewTurnHook(); // Fallback

    return () => {
      EventBus.removeListener('current-scene-ready', handleSceneReady);
    };
  }, [onNewTurnHook]);

  return {
    canPlayerAct,
    onNewTurnHook,
  };
}

