import { useCallback, useEffect } from 'react';
import { useAudioStore } from '../store/audioStore';
import { AUDIO_ASSETS } from '../constants/audioAssets';

/**
 * Hook for playing sound effects
 *
 * Usage:
 * ```typescript
 * const playSound = useSound();
 *
 * // Play UI sound
 * playSound('click');
 *
 * // Play spell sound
 * playSound('magic');
 * ```
 */
export function useSound() {
  const playSound = useAudioStore((state) => state.playSound);

  return useCallback(
    (soundKey: string) => {
      // Helper to find sound in nested object
      const findSound = (obj: any, key: string): string | null => {
        for (const k in obj) {
          if (k === key) return obj[k];
          if (typeof obj[k] === 'object') {
            const found = findSound(obj[k], key);
            if (found) return found;
          }
        }
        return null;
      };

      // Try to find the sound path
      const soundPath = findSound(AUDIO_ASSETS.sfx, soundKey);
      
      if (soundPath) {
        playSound(soundPath);
      }
    },
    [playSound]
  );
}

/**
 * Hook for playing hover sound
 * 
 * Usage:
 * ```typescript
 * const playHoverSound = useHoverSound();
 * 
 * <button onMouseEnter={playHoverSound}>
 *   Hover me
 * </button>
 * ```
 */
export function useHoverSound() {
  const playSound = useAudioStore((state) => state.playSound);

  return useCallback(() => {
    playSound(AUDIO_ASSETS.sfx.ui.hover);
  }, [playSound]);
}

/**
 * Hook for playing click sound
 * 
 * Usage:
 * ```typescript
 * const playClickSound = useClickSound();
 * 
 * <button onClick={playClickSound}>
 *   Click me
 * </button>
 * ```
 */
export function useClickSound() {
  const playSound = useAudioStore((state) => state.playSound);

  return useCallback(() => {
    playSound(AUDIO_ASSETS.sfx.ui.click);
  }, [playSound]);
}

/**
 * Hook for managing background music
 *
 * Usage:
 * ```typescript
 * const { playMainTheme, playBattleMusic, stopMusic } = useBackgroundMusic();
 *
 * // Play main theme
 * playMainTheme();
 *
 * // Play battle music
 * playBattleMusic();
 * ```
 */
export function useBackgroundMusic() {
  const playMusic = useAudioStore((state) => state.playMusic);
  const stopMusic = useAudioStore((state) => state.stopMusic);

  const playMainTheme = useCallback(
    (fadeDuration = 500) => {
      playMusic(AUDIO_ASSETS.music.background.fantasyVillage, fadeDuration);
    },
    [playMusic]
  );

  const playBattleMusic = useCallback(
    (fadeDuration = 500) => {
      playMusic(AUDIO_ASSETS.music.battle.deathTaker, fadeDuration);
    },
    [playMusic]
  );

  const stopCurrentMusic = useCallback(
    (fadeDuration = 500) => {
      stopMusic(fadeDuration);
    },
    [stopMusic]
  );

  return {
    playMainTheme,
    playBattleMusic,
    stopMusic: stopCurrentMusic,
  };
}

/**
 * Hook for volume and mute controls
 *
 * Usage:
 * ```typescript
 * const { volume, isMuted, setVolume, toggleMute } = useAudioControls();
 * ```
 */
export function useAudioControls() {
  const volume = useAudioStore((state) => state.volume);
  const isMuted = useAudioStore((state) => state.isMuted);
  const setVolume = useAudioStore((state) => state.setVolume);
  const toggleMute = useAudioStore((state) => state.toggleMute);
  const setMuted = useAudioStore((state) => state.setMuted);

  return {
    volume,
    isMuted,
    setVolume,
    toggleMute,
    setMuted,
  };
}

/**
 * Hook for playing modal open/close sounds automatically
 *
 * Usage:
 * ```typescript
 * function Modal({ onClose }) {
 *   useModalSound(); // Автоматически играет звук при открытии/закрытии
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useModalSound() {
  const playSound = useAudioStore((state) => state.playSound);

  useEffect(() => {
    // Play open sound on mount
    playSound(AUDIO_ASSETS.sfx.ui.modalOpen);

    // Play close sound on unmount
    return () => {
      playSound(AUDIO_ASSETS.sfx.ui.modalClose);
    };
  }, [playSound]);
}
